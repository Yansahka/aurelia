CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS stores_owner_uq ON stores(owner_id);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(store_id, email)
);

-- Le serveur fixe app.store_id dans chaque transaction métier.
ALTER TABLE products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_tenant ON products;
CREATE POLICY products_tenant ON products USING (store_id = nullif(current_setting('app.store_id', true), '')::uuid) WITH CHECK (store_id = nullif(current_setting('app.store_id', true), '')::uuid);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['customers','orders','reviews','tasks','events','newsletter_subscribers'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_scope ON %I USING (store_id = nullif(current_setting(''app.store_id'', true), '''')::uuid) WITH CHECK (store_id = nullif(current_setting(''app.store_id'', true), '''')::uuid)', t);
  END LOOP;
END $$;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON order_items USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id)
) WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id));
