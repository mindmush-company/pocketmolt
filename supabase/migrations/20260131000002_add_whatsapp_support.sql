-- Add WhatsApp channel support to bots table

-- Channel type: which messaging channel the bot uses (either/or, not both)
ALTER TABLE bots ADD COLUMN channel_type TEXT DEFAULT 'telegram' CHECK (channel_type IN ('telegram', 'whatsapp', 'none'));

-- WhatsApp pairing timestamp (null if never paired, set when QR scanned successfully)
ALTER TABLE bots ADD COLUMN whatsapp_connected_at TIMESTAMPTZ;

-- Make telegram_bot_token_encrypted nullable since WhatsApp bots don't need it
ALTER TABLE bots ALTER COLUMN telegram_bot_token_encrypted DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN bots.channel_type IS 'Messaging channel: telegram, whatsapp, or none (setup incomplete)';
COMMENT ON COLUMN bots.whatsapp_connected_at IS 'Timestamp when WhatsApp was successfully paired via QR code';
