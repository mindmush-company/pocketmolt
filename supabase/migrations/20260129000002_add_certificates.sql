-- Store bot client certificates (for mTLS)
ALTER TABLE bots ADD COLUMN client_cert TEXT;
ALTER TABLE bots ADD COLUMN client_key_encrypted TEXT;

-- Create table for CA and server certs (singleton-like, one active at a time)
CREATE TABLE pocketmolt_ca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_cert TEXT NOT NULL,
  ca_key_encrypted TEXT NOT NULL,
  server_cert TEXT,
  server_key_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Only one active CA at a time
CREATE UNIQUE INDEX idx_active_ca ON pocketmolt_ca(is_active) WHERE is_active = true;
