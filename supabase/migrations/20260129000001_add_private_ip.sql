-- Add private IP column to bots table
ALTER TABLE bots ADD COLUMN private_ip TEXT;

-- Add index for quick lookups by private IP (used in mTLS verification)
CREATE INDEX idx_bots_private_ip ON bots(private_ip) WHERE private_ip IS NOT NULL;
