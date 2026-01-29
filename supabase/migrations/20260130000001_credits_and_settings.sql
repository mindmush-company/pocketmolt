-- Credits tracking (for future top-up system)
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance_cents INTEGER NOT NULL DEFAULT 0,  -- Credits in cents ($0.01 = 1)
  lifetime_usage_cents INTEGER NOT NULL DEFAULT 0,
  last_topped_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage log for audit trail
CREATE TABLE usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,  -- Cost in cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extended bot settings
ALTER TABLE bots 
  ADD COLUMN IF NOT EXISTS bot_emoji TEXT DEFAULT '🤖',
  ADD COLUMN IF NOT EXISTS bot_theme TEXT DEFAULT 'helpful',
  ADD COLUMN IF NOT EXISTS primary_model TEXT DEFAULT 'anthropic/claude-sonnet-4-20250514',
  ADD COLUMN IF NOT EXISTS dm_policy TEXT DEFAULT 'pairing' CHECK (dm_policy IN ('pairing', 'allowlist', 'open')),
  ADD COLUMN IF NOT EXISTS allow_from JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;

-- Make encrypted_api_key nullable (PocketMolt can provide keys)
ALTER TABLE bots ALTER COLUMN encrypted_api_key DROP NOT NULL;
ALTER TABLE bots ALTER COLUMN encrypted_api_key SET DEFAULT '';

-- RLS for credits
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credits" ON user_credits FOR SELECT USING (auth.uid()::uuid = user_id);

-- RLS for usage_log
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON usage_log FOR SELECT USING (auth.uid()::uuid = user_id);

-- Triggers
CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
