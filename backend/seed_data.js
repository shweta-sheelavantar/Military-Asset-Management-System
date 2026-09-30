require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedData() {
    let connection;
    try {
        console.log("Connecting to DB...");
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'mams_db'
        });

        console.log("Clearing old data...");
        // Disable foreign keys temporarily to truncate
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE assignments');
        await connection.query('TRUNCATE TABLE transfers');
        await connection.query('TRUNCATE TABLE purchases');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log("Ensuring admin user exists to attribute records to...");
        let [users] = await connection.query('SELECT id FROM users WHERE username = "admin"');
        let adminId;
        if (users.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            const [result] = await connection.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', hash, 'Admin']);
            adminId = result.insertId;
        } else {
            adminId = users[0].id;
        }

        console.log("Generating 30 purchases...");
        const bases = [1, 2]; // Alpha Base, Bravo Base
        const equipment = [1, 2, 3, 4]; // Humvee, M16, 5.56mm Ammo, First Aid Kit
        
        // Let's generate dates over the last 60 days
        const now = new Date();
        const dates = Array.from({ length: 60 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (59 - i));
            return d.toISOString().slice(0, 19).replace('T', ' ');
        });

        // 30 Purchases
        for (let i = 0; i < 30; i++) {
            const base = bases[Math.floor(Math.random() * bases.length)];
            const equip = equipment[Math.floor(Math.random() * equipment.length)];
            const qty = Math.floor(Math.random() * 50) + 10; // 10 to 60
            const date = dates[Math.floor(Math.random() * dates.length)];
            await connection.query(
                'INSERT INTO purchases (base_id, equipment_id, quantity, purchase_date, recorded_by) VALUES (?, ?, ?, ?, ?)',
                [base, equip, qty, date, adminId]
            );
        }

        console.log("Generating 15 transfers...");
        for (let i = 0; i < 15; i++) {
            const fromBase = bases[Math.floor(Math.random() * bases.length)];
            const toBase = fromBase === 1 ? 2 : 1;
            const equip = equipment[Math.floor(Math.random() * equipment.length)];
            const qty = Math.floor(Math.random() * 5) + 1; // 1 to 5
            const date = dates[Math.floor(Math.random() * dates.length)];
            await connection.query(
                'INSERT INTO transfers (from_base_id, to_base_id, equipment_id, quantity, transfer_date, recorded_by) VALUES (?, ?, ?, ?, ?, ?)',
                [fromBase, toBase, equip, qty, date, adminId]
            );
        }

        console.log("Generating 25 assignments...");
        const statuses = ['Assigned', 'Assigned', 'Returned', 'Expended'];
        const personnel = ['Sgt. Smith', 'Cpl. Jones', 'Lt. Dan', 'Pvt. Ryan', 'Cpt. Price'];
        for (let i = 0; i < 25; i++) {
            const base = bases[Math.floor(Math.random() * bases.length)];
            const equip = equipment[Math.floor(Math.random() * equipment.length)];
            const qty = Math.floor(Math.random() * 3) + 1;
            const person = personnel[Math.floor(Math.random() * personnel.length)];
            const date = dates[Math.floor(Math.random() * dates.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            await connection.query(
                'INSERT INTO assignments (base_id, equipment_id, personnel_name, quantity, status, assignment_date, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [base, equip, person, qty, status, date, adminId]
            );
        }

        console.log("Seeding complete!");
    } catch (error) {
        console.error("Error seeding:", error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

seedData();
