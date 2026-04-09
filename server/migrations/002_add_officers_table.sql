CREATE TABLE IF NOT EXISTS officers (
  officer_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  last_name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  course VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  INDEX idx_officer_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
