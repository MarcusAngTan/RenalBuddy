CREATE DATABASE IF NOT EXISTS renalbuddy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'renalbuddy'@'localhost' IDENTIFIED BY 'renalbuddy';
GRANT ALL PRIVILEGES ON renalbuddy.* TO 'renalbuddy'@'localhost';
FLUSH PRIVILEGES;
