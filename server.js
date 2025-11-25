require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

//corrected manually
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});
app.get('/icons/icon-192.png', (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(path.join(__dirname, 'public', 'icons', 'icon-192.png'));
});
app.get('/icons/icon-512.png', (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(path.join(__dirname, 'public', 'icons', 'icon-512.png'));
});
//corrected manually



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
    } else {
        console.log('Connected to MySQL Database');
    }
});

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to your preferred email service
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS  // Your email app password (not your regular password)
    }
});

// API Endpoints

const multer = require('multer');
const fs = require('fs');

// Configure Multer for local storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// API Endpoints

// Get all items
app.get('/api/items', (req, res) => {
    const sql = 'SELECT * FROM items ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Report a new item
app.post('/api/items', upload.single('image'), (req, res) => {
    const { type, item_name, location, date_found_lost, time_found_lost, contact_info, unique_identifiers, latitude, longitude } = req.body;

    // Construct image URL from uploaded file
    let image_url = '';
    if (req.file) {
        image_url = '/uploads/' + req.file.filename;
    } else {
        image_url = 'https://via.placeholder.com/300x200?text=No+Image';
    }

    const sql = 'INSERT INTO items (type, item_name, location, date_found_lost, time_found_lost, contact_info, unique_identifiers, image_url, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    db.query(sql, [type, item_name, location, date_found_lost, time_found_lost, contact_info, unique_identifiers, image_url, latitude, longitude], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Simple matching logic (Mock)
        console.log(`New ${type} item reported: ${item_name}. Checking for matches...`);

        // Send Confirmation Email
        if (contact_info.includes('@')) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: contact_info,
                subject: `Confirmation: You reported a ${type} item - Inocreal`,
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #38bdf8;">Inocreal Lost & Found</h2>
                        <p>Hello,</p>
                        <p>You have successfully reported a <strong>${type}</strong> item: <strong>${item_name}</strong>.</p>
                        <p><strong>Details:</strong></p>
                        <ul>
                            <li><strong>Location:</strong> ${location}</li>
                            <li><strong>Date:</strong> ${date_found_lost}</li>
                            <li><strong>Time:</strong> ${time_found_lost}</li>
                        </ul>
                        <p>We will notify you if we find a match!</p>
                        <br>
                        <p>Best regards,</p>
                        <p>The Inocreal Team</p>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
        }

        res.json({ message: 'Item reported successfully', id: result.insertId });
    });
});

// Notification Endpoint (Polling)
app.get('/api/notifications', (req, res) => {
    // Mock notifications
    // In a real app, this would check a notifications table for the current user
    res.json([]);
});

// Cloudinary Upload Stub
app.post('/api/upload', (req, res) => {
    // In a real implementation, this would handle image upload to Cloudinary
    // For this demo, we'll assume the frontend handles the upload or sends a URL
    res.json({ message: 'Upload endpoint ready' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
