-- Ajouts uniquement : les identifiants et champs historiques sont conserves.
CREATE TABLE categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
 slug text NOT NULL,
 position integer NOT NULL DEFAULT 0,
 UNIQUE(id,store_id), UNIQUE(store_id,slug)
);
CREATE UNIQUE INDEX categories_name_ci ON categories(store_id,lower(name));
ALTER TABLE products ADD COLUMN category_id uuid;
ALTER TABLE products ADD COLUMN reference text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN description text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes)='object');
ALTER TABLE products ADD CONSTRAINT products_category_store_fk FOREIGN KEY(category_id,store_id) REFERENCES categories(id,store_id);
ALTER TABLE products ADD CONSTRAINT products_id_store_uq UNIQUE(id,store_id);
CREATE INDEX products_category_idx ON products(store_id,category_id);
CREATE UNIQUE INDEX products_reference_ci ON products(store_id,lower(reference)) WHERE reference<>'' AND deleted_at IS NULL;
CREATE TABLE product_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
 product_id uuid NOT NULL,
 url text NOT NULL CHECK (url ~ '^https://'),
 position integer NOT NULL CHECK(position BETWEEN 0 AND 7),
 FOREIGN KEY(product_id,store_id) REFERENCES products(id,store_id) ON DELETE CASCADE,
 UNIQUE(product_id,position)
);
-- Ne pas changer updated_at pendant la reprise technique des champs historiques.
ALTER TABLE products DISABLE TRIGGER trg_products_upd;
DO $$ DECLARE shop uuid; BEGIN
 FOR shop IN SELECT id FROM stores LOOP
  PERFORM set_config('app.store_id',shop::text,true);
  INSERT INTO categories(store_id,slug,name)
   SELECT DISTINCT shop,family,CASE family WHEN 'fleurs' THEN 'Fleurs' WHEN 'bois' THEN 'Bois' WHEN 'ambre' THEN 'Ambres' WHEN 'frais' THEN 'Agrumes & frais' ELSE family END
   FROM products WHERE store_id=shop;
  UPDATE products p SET category_id=c.id,attributes=CASE WHEN p.note<>'' THEN jsonb_build_object('Note principale',p.note) ELSE '{}'::jsonb END
   FROM categories c WHERE p.store_id=shop AND c.store_id=shop AND c.slug=p.family;
  INSERT INTO product_images(store_id,product_id,url,position)
   SELECT shop,id,image_url,0 FROM products WHERE store_id=shop AND image_url ~ '^https://';
 END LOOP;
END $$;
ALTER TABLE products ENABLE TRIGGER trg_products_upd;
DO $$ DECLARE t text; role_name text; BEGIN
 FOREACH t IN ARRAY ARRAY['categories','product_images'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY tenant_scope ON %I USING (store_id=nullif(current_setting(''app.store_id'',true),'''')::uuid) WITH CHECK (store_id=nullif(current_setting(''app.store_id'',true),'''')::uuid)',t);
 END LOOP;
 FOR role_name IN SELECT rolname FROM pg_roles WHERE left(rolname,12)='aurelia_app_' OR rolname='aurelia_local' LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON categories,product_images TO %I',role_name);
 END LOOP;
END $$;
