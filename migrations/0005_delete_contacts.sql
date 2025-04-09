
-- Drop existing constraint first
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_celldigits_unique;

-- Now we can safely clear contacts
TRUNCATE TABLE contacts;

-- Re-add the constraint
ALTER TABLE users ADD CONSTRAINT users_celldigits_unique UNIQUE (cellDigits);
