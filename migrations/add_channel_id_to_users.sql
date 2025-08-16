-- Add channel_id column to users table for channel identification
-- This helps differentiate users from different channels/websites

-- Add the column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS channel_id TEXT;

-- Create an index for better performance when filtering by channel
CREATE INDEX IF NOT EXISTS idx_users_channel_id ON users(channel_id);

-- Update existing users with a default channel_id if they don't have one
-- This can be customized based on your setup
UPDATE users 
SET channel_id = 'default' 
WHERE channel_id IS NULL;

-- Optional: Add comments to document the column
COMMENT ON COLUMN users.channel_id IS 'Identifier for the channel/website where the user was acquired';

-- Show summary of the migration
SELECT 
    'Migration completed' as status,
    COUNT(*) as total_users,
    COUNT(DISTINCT channel_id) as unique_channels,
    array_agg(DISTINCT channel_id) as channels
FROM users;