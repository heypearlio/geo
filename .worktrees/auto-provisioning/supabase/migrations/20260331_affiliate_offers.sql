-- Add offers array to affiliates
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS offers TEXT[] NOT NULL DEFAULT '{local}';

-- Existing affiliates (e.g. christina) already default to {local}, which is correct
-- Update any rows that have a tag set to ensure offers is populated
UPDATE affiliates SET offers = '{local}' WHERE offers IS NULL OR offers = '{}';
