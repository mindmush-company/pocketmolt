-- Add gateway_token_encrypted column for storing the bot's gateway token
-- This is needed for WebSocket authentication when embedding the Clawdbot UI
ALTER TABLE bots ADD COLUMN IF NOT EXISTS gateway_token_encrypted TEXT;

COMMENT ON COLUMN bots.gateway_token_encrypted IS 'AES-256-GCM encrypted gateway token for WebSocket auth';
