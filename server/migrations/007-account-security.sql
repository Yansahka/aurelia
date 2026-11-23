-- Tables d'authentification côté serveur, comme users et sessions.
-- Aucun compte existant n'est bloqué, vérifié automatiquement ou réinitialisé.
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
CREATE TABLE account_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('verify-email','reset-password')),
 token_hash text NOT NULL UNIQUE,
 email_snapshot text NOT NULL,
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_tokens_user_purpose_idx ON account_tokens(user_id,purpose,created_at DESC);
CREATE INDEX account_tokens_expiry_idx ON account_tokens(expires_at);
DO $$ DECLARE role_name text; BEGIN
 FOR role_name IN SELECT rolname FROM pg_roles WHERE left(rolname,12)='aurelia_app_' OR rolname IN ('aurelia_app','aurelia_local') LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON account_tokens TO %I',role_name);
 END LOOP;
END $$;
