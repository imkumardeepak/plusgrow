-- PlusGrow WMS Database Setup Script
-- Run this script in PostgreSQL to create the database

-- Create database (run as postgres user in pgAdmin or psql)
-- CREATE DATABASE plusgrow_db;

-- Connect to database
-- \c plusgrow_db

-- 1. ROLES
DROP TABLE IF EXISTS role_page_access CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS outward_orders CASCADE;
DROP TABLE IF EXISTS product_stock_movements CASCADE;
DROP TABLE IF EXISTS product_quantities CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS importers CASCADE;
DROP TABLE IF EXISTS manufacturers CASCADE;
DROP TABLE IF EXISTS commodities CASCADE;

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- 3. ROLE PAGE ACCESS
CREATE TABLE role_page_access (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    page_key VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT true,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, page_key)
);

-- 4. IMPORTERS
CREATE TABLE importers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    cin VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. MANUFACTURERS
CREATE TABLE manufacturers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. COMMODITIES
CREATE TABLE commodities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

-- 7. PRODUCTS
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    hsn_code VARCHAR(20),
    commodity_id INTEGER REFERENCES commodities(id) ON DELETE SET NULL,
    country_of_origin VARCHAR(100),
    mrp_quantity VARCHAR(50),
    factor NUMERIC(10,2),
    unit_type VARCHAR(20),
    ussp NUMERIC(12,4),
    mrp NUMERIC(12,2),
    best_before_months INTEGER DEFAULT 120,
    manufacturer_id INTEGER REFERENCES manufacturers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_quantities (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    notes TEXT,
    performed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    performed_by_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outward_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    order_date TIMESTAMP NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    picked_quantity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Open',
    carton_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMP
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_products_commodity_id ON products(commodity_id);
CREATE INDEX idx_products_manufacturer_id ON products(manufacturer_id);
CREATE INDEX idx_products_hsn_code ON products(hsn_code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_product_stock_movements_product_id ON product_stock_movements(product_id);
CREATE INDEX idx_product_stock_movements_created_at ON product_stock_movements(created_at);
CREATE INDEX idx_outward_orders_status ON outward_orders(status);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_importers_cin ON importers(cin);
CREATE INDEX idx_manufacturers_country ON manufacturers(country);

-- Insert default roles
INSERT INTO roles (id, name, description, is_active, created_at) VALUES 
(1, 'Admin', 'Full access to all features', true, NOW()),
(2, 'Manager', 'Manage users and inventory', true, NOW()),
(3, 'Operator', 'Basic operations', true, NOW()),
(4, 'Viewer', 'Read-only access', true, NOW());

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, full_name, email, role_id, is_active, created_at) VALUES 
('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bGLL5WJLc7Q0J/O', 'System Admin', 'admin@plusgrow.com', 1, true, NOW());

-- Insert sample manufacturers
INSERT INTO manufacturers (name, country, created_at) VALUES 
('Unilever', 'India', NOW()),
('Hindustan Unilever', 'India', NOW()),
('Procter & Gamble', 'USA', NOW()),
('Nestle', 'Switzerland', NOW()),
('ITC', 'India', NOW());

-- Insert sample commodities
INSERT INTO commodities (name) VALUES 
('Shampoo'),
('Soap'),
('Oil'),
('Spices'),
('Snacks'),
('Beverages'),
('Dairy'),
('Confectionery');

-- Insert sample products
INSERT INTO products (name, sku, hsn_code, commodity_id, country_of_origin, mrp_quantity, factor, unit_type, ussp, mrp, best_before_months, manufacturer_id, created_at) VALUES 
('Shampoo 1', 'SHM001', '3305', 1, 'India', '557ml', 557, 'ml', 80.00, 120.00, 120, 1, NOW()),
('Shampoo 2', 'SHM002', '3305', 1, 'India', '1L', 1000, 'ml', 150.00, 220.00, 120, 1, NOW()),
('Soap 1', 'SOA001', '3401', 2, 'India', '100g', 100, 'g', 25.00, 40.00, 120, 2, NOW()),
('Cooking Oil', 'OIL001', '1509', 3, 'India', '1L', 1000, 'ml', 90.00, 150.00, 120, 5, NOW()),
('Milk Powder', 'MLK001', '0402', 7, 'India', '500g', 500, 'g', 180.00, 250.00, 120, 4, NOW());

-- Insert role page access for Admin (all permissions)
INSERT INTO role_page_access (role_id, page_key, can_view, can_create, can_edit, can_delete, created_at) VALUES 
(1, 'dashboard', true, true, true, true, NOW()),
(1, 'inward', true, true, true, true, NOW()),
(1, 'sticker', true, true, true, true, NOW()),
(1, 'receiving', true, true, true, true, NOW()),
(1, 'putaway', true, true, true, true, NOW()),
(1, 'outward', true, true, true, true, NOW()),
(1, 'packing', true, true, true, true, NOW()),
(1, 'dispatch', true, true, true, true, NOW()),
(1, 'stock-check', true, true, true, true, NOW()),
(1, 'stock-movement', true, true, true, true, NOW()),
(1, 'warehouse-map', true, true, true, true, NOW()),
(1, 'customers', true, true, true, true, NOW()),
(1, 'products', true, true, true, true, NOW()),
(1, 'users', true, true, true, true, NOW()),
(1, 'roles', true, true, true, true, NOW());

-- Insert role page access for Manager
INSERT INTO role_page_access (role_id, page_key, can_view, can_create, can_edit, can_delete, created_at) VALUES 
(2, 'dashboard', true, true, true, false, NOW()),
(2, 'inward', true, true, true, false, NOW()),
(2, 'sticker', true, true, true, false, NOW()),
(2, 'receiving', true, true, true, false, NOW()),
(2, 'putaway', true, true, true, false, NOW()),
(2, 'outward', true, true, true, false, NOW()),
(2, 'packing', true, true, true, false, NOW()),
(2, 'dispatch', true, true, true, false, NOW()),
(2, 'stock-check', true, true, true, false, NOW()),
(2, 'stock-movement', true, true, true, false, NOW()),
(2, 'warehouse-map', true, true, true, false, NOW()),
(2, 'customers', true, true, true, false, NOW()),
(2, 'products', true, true, true, false, NOW());

-- Insert role page access for Operator
INSERT INTO role_page_access (role_id, page_key, can_view, can_create, can_edit, can_delete, created_at) VALUES 
(3, 'dashboard', true, false, false, false, NOW()),
(3, 'inward', true, true, false, false, NOW()),
(3, 'receiving', true, true, false, false, NOW()),
(3, 'putaway', true, true, false, false, NOW()),
(3, 'outward', true, true, false, false, NOW()),
(3, 'packing', true, true, false, false, NOW()),
(3, 'dispatch', true, true, false, false, NOW()),
(3, 'stock-check', true, false, false, false, NOW()),
(3, 'stock-movement', true, false, false, false, NOW()),
(3, 'warehouse-map', true, false, false, false, NOW());

-- Insert role page access for Viewer
INSERT INTO role_page_access (role_id, page_key, can_view, can_create, can_edit, can_delete, created_at) VALUES 
(4, 'dashboard', true, false, false, false, NOW()),
(4, 'inward', true, false, false, false, NOW()),
(4, 'outward', true, false, false, false, NOW()),
(4, 'stock-check', true, false, false, false, NOW()),
(4, 'stock-movement', true, false, false, false, NOW()),
(4, 'warehouse-map', true, false, false, false, NOW());

-- Verify data
SELECT 'roles' as table_name, COUNT(*) as count FROM roles
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'role_page_access', COUNT(*) FROM role_page_access
UNION ALL
SELECT 'manufacturers', COUNT(*) FROM manufacturers
UNION ALL
SELECT 'commodities', COUNT(*) FROM commodities
UNION ALL
SELECT 'products', COUNT(*) FROM products;
