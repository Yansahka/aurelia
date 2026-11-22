-- Aucun produit existant n'est converti et aucun montant historique n'est recalcule.
ALTER TABLE products ADD COLUMN has_variants boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN variant_options jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(variant_options)='array');
CREATE TABLE product_variants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
 product_id uuid NOT NULL,
 options jsonb NOT NULL CHECK(jsonb_typeof(options)='object'),
 combination_key text NOT NULL,
 label text NOT NULL,
 reference text NOT NULL DEFAULT '',
 price bigint NOT NULL CHECK(price>0 AND price<=1000000000),
 old_price bigint CHECK(old_price IS NULL OR old_price>price),
 stock integer NOT NULL DEFAULT 0 CHECK(stock>=0),
 is_active boolean NOT NULL DEFAULT true,
 position integer NOT NULL DEFAULT 0,
 archived_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(product_id,store_id) REFERENCES products(id,store_id),
 UNIQUE(id,product_id)
);
CREATE UNIQUE INDEX variants_combination_uq ON product_variants(product_id,combination_key) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX variants_reference_uq ON product_variants(store_id,lower(reference)) WHERE reference<>'' AND archived_at IS NULL;
CREATE INDEX variants_store_product_idx ON product_variants(store_id,product_id);
CREATE TRIGGER trg_variants_upd BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON product_variants USING(store_id=nullif(current_setting('app.store_id',true),'')::uuid) WITH CHECK(store_id=nullif(current_setting('app.store_id',true),'')::uuid);
ALTER TABLE order_items ADD COLUMN variant_id uuid;
ALTER TABLE order_items ADD COLUMN variant_label text NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN variant_reference text NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN variant_options jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE order_items ADD CONSTRAINT order_items_variant_product_fk FOREIGN KEY(variant_id,product_id) REFERENCES product_variants(id,product_id);
DO $$ DECLARE role_name text; BEGIN
 FOR role_name IN SELECT rolname FROM pg_roles WHERE left(rolname,12)='aurelia_app_' OR rolname IN ('aurelia_app','aurelia_local') LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON product_variants TO %I',role_name);
 END LOOP;
END $$;
