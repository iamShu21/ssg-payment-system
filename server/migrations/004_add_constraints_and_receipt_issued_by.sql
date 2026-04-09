-- Adds unique constraints and receipt_issued_by column for data integrity and receipt tracking.
-- Run manually once (e.g. mysql -u user -p dbname < 004_add_constraints_and_receipt_issued_by.sql)

-- Unique constraints
ALTER TABLE users ADD UNIQUE (username);
ALTER TABLE users ADD UNIQUE (email);
ALTER TABLE students ADD UNIQUE (student_number);
ALTER TABLE officers ADD UNIQUE (position);
ALTER TABLE student_fees ADD UNIQUE (student_id, fee_id);
ALTER TABLE payments ADD UNIQUE (receipt_number);
ALTER TABLE payments ADD UNIQUE (paymongo_reference);

-- Add receipt_issued_by column
ALTER TABLE payments ADD COLUMN receipt_issued_by INT NULL DEFAULT NULL;