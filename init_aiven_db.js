require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to Aiven MySQL Database');

    const sql = `
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
            latitude DECIMAL(10, 8) NULL,
            longitude DECIMAL(11, 8) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Table "items" created successfully (or already exists).');
        }
        db.end();
    });
});
