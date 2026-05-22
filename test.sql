-- Test SQL dump for SQL Chat application
-- Simple database structure for testing

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    stock_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert sample data
INSERT INTO users (name, email, status) VALUES
('Juan Pérez', 'juan@example.com', 'active'),
('María García', 'maria@example.com', 'active'),
('Carlos López', 'carlos@example.com', 'inactive'),
('Ana Martínez', 'ana@example.com', 'active'),
('Luis Rodríguez', 'luis@example.com', 'active');

INSERT INTO products (name, price, category, stock_quantity) VALUES
('Laptop HP', 899.99, 'Electronics', 15),
('Mouse Logitech', 29.99, 'Electronics', 50),
('Teclado Mecánico', 79.99, 'Electronics', 25),
('Monitor 24"', 199.99, 'Electronics', 10),
('Silla Ergonómica', 149.99, 'Furniture', 8);

INSERT INTO orders (user_id, total_amount, status) VALUES
(1, 929.98, 'completed'),
(2, 79.99, 'pending'),
(4, 199.99, 'completed'),
(1, 149.99, 'pending'),
(5, 29.99, 'completed');