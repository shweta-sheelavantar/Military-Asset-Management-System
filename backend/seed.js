const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
    try {
        console.log('Seeding initial Admin user...');
        const passwordHash = bcrypt.hashSync('admin123', 8);
        
        await pool.query(`
            INSERT IGNORE INTO users (username, password_hash, role, base_id) 
            VALUES ('admin', ?, 'Admin', NULL)
        `, [passwordHash]);

        console.log('Admin user seeded successfully. Username: admin, Password: admin123');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seed();
