-- Métadonnées séparées du stockage : les fichiers ne sont pas stockés dans PostgreSQL.
ALTER TABLE product_images DROP CONSTRAINT product_images_url_check;
ALTER TABLE product_images ADD CONSTRAINT product_images_url_check CHECK(url ~ '^https://' OR url ~ '^/media/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
ALTER TABLE stores DROP CONSTRAINT stores_logo_url_check;
ALTER TABLE stores ADD CONSTRAINT stores_logo_url_check CHECK(logo_url IS NULL OR logo_url ~ '^https://' OR logo_url ~ '^/media/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
ALTER TABLE stores DROP CONSTRAINT stores_cover_url_check;
ALTER TABLE stores ADD CONSTRAINT stores_cover_url_check CHECK(cover_url IS NULL OR cover_url ~ '^https://' OR cover_url ~ '^/media/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
CREATE TABLE media_assets (
 id uuid PRIMARY KEY,
 store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
 storage_key text NOT NULL UNIQUE,
 url text NOT NULL UNIQUE,
 mime_type text NOT NULL,
 bytes integer NOT NULL CHECK(bytes>0),
 width integer NOT NULL CHECK(width>0),
 height integer NOT NULL CHECK(height>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_assets_store_idx ON media_assets(store_id);
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON media_assets USING(store_id=nullif(current_setting('app.store_id',true),'')::uuid) WITH CHECK(store_id=nullif(current_setting('app.store_id',true),'')::uuid);
DO $$ DECLARE role_name text; BEGIN
 FOR role_name IN SELECT rolname FROM pg_roles WHERE left(rolname,12)='aurelia_app_' OR rolname IN ('aurelia_app','aurelia_local') LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON media_assets TO %I',role_name);
 END LOOP;
END $$;
