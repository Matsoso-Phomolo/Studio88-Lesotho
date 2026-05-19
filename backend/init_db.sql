-- =========================
-- STORES
-- =========================
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    manager_name VARCHAR(100),
    contact_phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PRODUCTS
-- =========================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    image_url TEXT,
    is_new BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PRODUCT SIZES
-- =========================
CREATE TABLE product_sizes (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_label VARCHAR(20) NOT NULL
);

-- =========================
-- STOCK
-- =========================
CREATE TABLE stock (
    id SERIAL PRIMARY KEY,
    store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Available',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, product_id)
);

-- =========================
-- PROMOTIONS
-- =========================
CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    discount_percent NUMERIC(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    title VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL,
    store_id INT REFERENCES stores(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);