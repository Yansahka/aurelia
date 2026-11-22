-- Schéma PostgreSQL 14+ du SaaS « boutiques parfum » (compatible avec le dashboard et la vitrine).
-- Montants en entiers (FCFA n'a pas de décimales). Multi-tenant : chaque table métier porte store_id.
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- recherche floue sur les noms

CREATE TYPE order_status AS ENUM ('new', 'contacted', 'confirmed', 'delivered', 'cancelled');

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES users(id),
  slug             text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,40}$'),
  name             text NOT NULL,
  tagline          text NOT NULL DEFAULT '',
  currency         text NOT NULL DEFAULT 'FCFA',
  locale           text NOT NULL DEFAULT 'fr-FR',
  whatsapp_number  text NOT NULL CHECK (whatsapp_number ~ '^[1-9][0-9]{7,14}$'),   -- E.164 sans « + »
  whatsapp_message text NOT NULL DEFAULT '',
  share_message    text NOT NULL DEFAULT '',
  monthly_target   bigint NOT NULL DEFAULT 0 CHECK (monthly_target >= 0),
  plan_code        text NOT NULL DEFAULT 'free',
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  custom_domain    text UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL,
  tagline     text NOT NULL DEFAULT '',
  price       bigint NOT NULL CHECK (price >= 0),
  old_price   bigint CHECK (old_price IS NULL OR old_price > price),
  size_label  text NOT NULL DEFAULT '',
  note        text NOT NULL DEFAULT '',
  family      text NOT NULL DEFAULT 'bois',
  badge       text,
  stock       integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active   boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_new      boolean NOT NULL DEFAULT false,
  palette     text[] NOT NULL DEFAULT ARRAY['#c9a27a', '#5b3a1e'],
  shape       smallint NOT NULL DEFAULT 0,
  bg_color    text NOT NULL DEFAULT '#efe3c9',
  image_url   text,
  position    integer NOT NULL DEFAULT 0,
  deleted_at  timestamptz,                         -- suppression douce (bouton « Annuler » du dashboard)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX products_store_slug_uq ON products (store_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX products_catalog_idx ON products (store_id, is_active, position) WHERE deleted_at IS NULL;
CREATE INDEX products_name_trgm ON products USING gin (name gin_trgm_ops);

CREATE TABLE customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, phone)
);

CREATE TABLE orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES customers(id),
  code         text NOT NULL,
  status       order_status NOT NULL DEFAULT 'new',
  source       text NOT NULL DEFAULT 'cart' CHECK (source IN ('cart', 'product')),
  total        bigint NOT NULL CHECK (total >= 0),
  whatsapp_message text,
  notes        text NOT NULL DEFAULT '',
  follow_up_at timestamptz,
  delivered_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);
CREATE INDEX orders_board_idx ON orders (store_id, status, created_at DESC);
CREATE INDEX orders_customer_idx ON orders (customer_id);

CREATE TABLE order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,                       -- l'historique ne change pas si le parfum est renommé
  unit_price    bigint NOT NULL CHECK (unit_price >= 0),
  qty           integer NOT NULL CHECK (qty > 0)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_items_product_idx ON order_items (product_id);

CREATE TABLE reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES products(id) ON DELETE SET NULL,
  author       text NOT NULL,
  role         text NOT NULL DEFAULT '',
  text         text NOT NULL,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  is_published boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tasks (                                  -- bloc « Aujourd'hui »
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id   uuid REFERENCES orders(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('message', 'call', 'delivery', 'stock')),
  label      text NOT NULL,
  detail     text NOT NULL DEFAULT '',
  due_at     timestamptz NOT NULL,
  done_at    timestamptz
);
CREATE INDEX tasks_due_idx ON tasks (store_id, due_at) WHERE done_at IS NULL;

CREATE TABLE events (                                 -- statistiques de la vitrine (voir spécification backend)
  id         bigserial PRIMARY KEY,
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('view', 'add_to_cart', 'whatsapp_click', 'checkout')),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_store_time_idx ON events (store_id, created_at);

-- updated_at automatique
CREATE TRIGGER trg_users_upd    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stores_upd   BEFORE UPDATE ON stores   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_upd BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_upd   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Vues d'agrégation = ce que calcule aujourd'hui src/api/mock/stats.js
CREATE VIEW v_monthly_revenue AS
  SELECT store_id, date_trunc('month', created_at) AS month, sum(total) AS revenue, count(*) AS orders
  FROM orders WHERE status = 'delivered' GROUP BY store_id, date_trunc('month', created_at);

CREATE VIEW v_product_sales AS
  SELECT o.store_id, i.product_id, i.name_snapshot AS name, sum(i.qty) AS units, sum(i.qty * i.unit_price) AS revenue
  FROM order_items i JOIN orders o ON o.id = i.order_id
  WHERE o.status = 'delivered' GROUP BY o.store_id, i.product_id, i.name_snapshot;

-- Isolation multi-tenant en profondeur (optionnel mais recommandé) :
-- l'API exécute `SELECT set_config('app.store_id', '<uuid>', true)` au début de chaque transaction.
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_tenant ON products USING (store_id = nullif(current_setting('app.store_id', true), '')::uuid);
-- Répéter pour customers, orders, reviews, tasks, events (order_items passe par orders).
