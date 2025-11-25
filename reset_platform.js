require('dotenv').config();
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lost_found_db'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL Database');

    // 1. Truncate Items Table
    const sql = 'TRUNCATE TABLE items';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error clearing database:', err);
        } else {
            console.log('Database cleared successfully (items table truncated).');
        }

        // 2. Delete Uploaded Files
        const uploadsDir = path.join(__dirname, 'public', 'uploads');
        fs.readdir(uploadsDir, (err, files) => {
            if (err) {
                console.error('Error reading uploads directory:', err);
                db.end();
                return;
            }

            let deletedCount = 0;
            if (files.length === 0) {
                console.log('No files to delete in uploads directory.');
                db.end();
                return;
            }

            files.forEach(file => {
                if (file === '.gitkeep') return; // Keep .gitkeep if it exists

                fs.unlink(path.join(uploadsDir, file), err => {
                    if (err) console.error(`Error deleting file ${file}:`, err);
                    else deletedCount++;

                    if (deletedCount === files.length) {
                        console.log(`Deleted ${deletedCount} files from uploads directory.`);
                        db.end();
                    }
                });
            });

            // If we only had .gitkeep or empty loop
            if (files.length === 0) db.end();
            else {
                // Simple timeout to close connection if async unlink is slow/weird, 
                // but the counter above is better. 
                // Actually, let's just close DB after a short delay to be safe if the loop logic is imperfect.
                setTimeout(() => {
                    console.log('Finished cleanup task.');
                    db.end();
                    process.exit(0);
                }, 1000);
            }
        });
    });
});
