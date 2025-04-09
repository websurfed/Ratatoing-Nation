-- 1. Remove existing column and constraints
ALTER TABLE users DROP COLUMN IF EXISTS cellDigits;

-- 2. Create fresh column without constraints
ALTER TABLE users ADD COLUMN cellDigits TEXT;

-- 3. Generate TRULY unique numbers using row-wise random generation
WITH numbered_users AS (
  SELECT 
    id, 
    (1000000000 + (FLOOR(random() * 9000000000))::bigint)::text AS new_digits
  FROM users
)
UPDATE users u
SET cellDigits = nu.new_digits
FROM numbered_users nu
WHERE u.id = nu.id;

-- 4. Add constraints AFTER population
ALTER TABLE users 
  ALTER COLUMN cellDigits SET NOT NULL,
  ADD CONSTRAINT users_celldigits_unique UNIQUE (cellDigits);