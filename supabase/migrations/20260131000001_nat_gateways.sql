CREATE TABLE nat_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  hetzner_server_id TEXT NOT NULL,
  private_ip TEXT NOT NULL UNIQUE,
  public_ip TEXT,
  status TEXT NOT NULL CHECK (status IN ('provisioning', 'active', 'inactive', 'failed')),
  bot_count INTEGER NOT NULL DEFAULT 0,
  max_bots INTEGER NOT NULL DEFAULT 100,
  health_status TEXT DEFAULT 'unknown',
  last_health_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bots ADD COLUMN nat_gateway_id UUID REFERENCES nat_gateways(id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nat_gateways_updated_at
  BEFORE UPDATE ON nat_gateways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
