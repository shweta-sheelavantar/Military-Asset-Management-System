CREATE DATABASE IF NOT EXISTS mams_db;
USE mams_db;

-- 1. Bases
CREATE TABLE IF NOT EXISTS bases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255)
);

-- 2. Users (RBAC included)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Base Commander', 'Logistics Officer') NOT NULL,
    base_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE SET NULL
);

-- 3. Equipment Categories
CREATE TABLE IF NOT EXISTS equipment_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 4. Equipment
CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id INT,
    FOREIGN KEY (category_id) REFERENCES equipment_categories(id)
);

-- 5. Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    base_id INT NOT NULL,
    equipment_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT NOT NULL,
    FOREIGN KEY (base_id) REFERENCES bases(id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- 6. Transfers
CREATE TABLE IF NOT EXISTS transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_base_id INT NOT NULL,
    to_base_id INT NOT NULL,
    equipment_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    transfer_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT NOT NULL,
    FOREIGN KEY (from_base_id) REFERENCES bases(id),
    FOREIGN KEY (to_base_id) REFERENCES bases(id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- 7. Assignments & Expenditures
CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    base_id INT NOT NULL,
    equipment_id INT NOT NULL,
    personnel_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status ENUM('Assigned', 'Returned', 'Expended') DEFAULT 'Assigned',
    assignment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    return_or_expend_date DATETIME NULL,
    recorded_by INT NOT NULL,
    FOREIGN KEY (base_id) REFERENCES bases(id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- 8. API Logs for Auditing
CREATE TABLE IF NOT EXISTS api_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    action VARCHAR(255),
    payload JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50),
    target_table VARCHAR(50),
    record_id INT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert dummy data for initialization
INSERT IGNORE INTO bases (name, location) VALUES 
('Alpha Base', 'Northern Sector'),
('Bravo Base', 'Southern Sector');

INSERT IGNORE INTO equipment_categories (name) VALUES 
('Vehicles'), ('Weapons'), ('Ammunition'), ('Medical Supplies');

INSERT IGNORE INTO equipment (name, category_id) VALUES 
('Humvee', 1), ('M16 Rifle', 2), ('5.56mm Ammo Box', 3), ('First Aid Kit', 4);
