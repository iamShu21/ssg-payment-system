-- Adds receipt_issued_at column to payments table for tracking when receipt was issued.
-- Run manually once (e.g. mysql -u user -p dbname < 003_add_receipt_issued_at.sql)

ALTER TABLE payments
  ADD COLUMN receipt_issued_at TIMESTAMP NULL DEFAULT NULL;