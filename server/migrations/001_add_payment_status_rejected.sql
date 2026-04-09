-- Adds 'rejected' to payments.payment_status ENUM while preserving existing values.
-- Run manually once (e.g. mysql -u user -p dbname < 001_add_payment_status_rejected.sql)
-- Required for officer reject flow: UPDATE payments SET payment_status = 'rejected', officer_status = 'rejected' ...

ALTER TABLE payments
  MODIFY COLUMN payment_status
  ENUM('pending','paid','failed','expired','rejected')
  NOT NULL
  DEFAULT 'pending';
