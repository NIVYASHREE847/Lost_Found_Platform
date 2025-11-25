require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lost_found_db'
});

db.connect(err => {
    if (err) {
        console.error('Connection failed:', err);
        return;
    }
    console.log('Connected to database.');

    const sql = `
        ALTER TABLE items
        ADD COLUMN latitude DECIMAL(10, 8) NULL,
        ADD COLUMN longitude DECIMAL(11, 8) NULL;
    `;

    db.query(sql, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Columns already exist. Skipping...');
            } else {
                console.error('Error updating schema:', err);
            }
        } else {
            console.log('Schema updated successfully! Added latitude and longitude columns.');
        }
        db.end();
    });
});
