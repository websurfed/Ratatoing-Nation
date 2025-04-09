
-- Temporarily disable trigger to allow updates
ALTER TABLE users DISABLE TRIGGER ALL;

-- Create temp column for new digits
ALTER TABLE users ADD COLUMN temp_digits TEXT;

-- Update with new random digits, ensuring uniqueness
WITH RECURSIVE generate_digits AS (
  SELECT 
    id,
    LPAD(FLOOR(random() * 10000000000)::text, 10, '0') as new_digits
  FROM users
),
unique_digits AS (
  SELECT DISTINCT ON (new_digits) id, new_digits
  FROM generate_digits
  ORDER BY new_digits
)
UPDATE users
SET temp_digits = ud.new_digits
FROM unique_digits ud
WHERE users.id = ud.id;

-- Move temp digits to real column
UPDATE users SET cellDigits = temp_digits;

-- Drop temp column
ALTER TABLE users DROP COLUMN temp_digits;

-- Re-enable trigger
ALTER TABLE users ENABLE TRIGGER ALL;
