-- Ajouts uniquement : aucune mise a jour des boutiques ou produits existants.
ALTER TABLE stores ADD COLUMN logo_url text CHECK(logo_url IS NULL OR logo_url ~ '^https://');
ALTER TABLE stores ADD COLUMN cover_url text CHECK(cover_url IS NULL OR cover_url ~ '^https://');
ALTER TABLE stores ADD COLUMN accent_color text NOT NULL DEFAULT '#2b1620' CHECK(accent_color ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE stores ADD COLUMN background_color text NOT NULL DEFAULT '#f6f0e7' CHECK(background_color ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE stores ADD COLUMN text_color text NOT NULL DEFAULT '#2a1520' CHECK(text_color ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE stores ADD COLUMN hero_title text NOT NULL DEFAULT '';
