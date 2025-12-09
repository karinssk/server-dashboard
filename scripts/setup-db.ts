import 'dotenv/config';
import pool from '../lib/db';
import { hashPassword } from '../lib/password';

async function setup() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to database');

        // Create users table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('Users table checked/created');

        // Check if admin exists
        const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['ruby_admin']);
        if ((rows as any[]).length === 0) {
            const hashedPassword = await hashPassword('258369ss');
            await connection.query('INSERT INTO users (username, password) VALUES (?, ?)', ['ruby_admin', hashedPassword]);
            console.log('Default admin user created');
        } else {
            console.log('Admin user already exists');
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    }
}

setup();
