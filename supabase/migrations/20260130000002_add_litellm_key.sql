-- Add LiteLLM proxy key to bots table
ALTER TABLE bots 
  ADD COLUMN IF NOT EXISTS litellm_key_encrypted TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bots_litellm_key ON bots(litellm_key_encrypted) WHERE litellm_key_encrypted IS NOT NULL;
