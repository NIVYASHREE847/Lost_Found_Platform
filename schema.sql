CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('LOST', 'FOUND') NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    date_found_lost DATE NOT NULL,
    time_found_lost TIME NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    unique_identifiers TEXT,
    image_url VARCHAR(255),
    status ENUM('OPEN', 'CLAIMED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
