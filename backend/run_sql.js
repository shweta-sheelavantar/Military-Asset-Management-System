const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
    try {
        console.log("Connecting to Aiven...");
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            multipleStatements: true,
            ssl: { rejectUnauthorized: false }
        });
        
        console.log("Connected! Reading schema file...");
        const schemaPath = path.join(__dirname, '..', 'database_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log("Executing schema SQL...");
        await connection.query(schemaSql);
        console.log("Schema applied successfully! Now we'll seed the data...");
        
        // Let's run seed data as well!
        // but wait, seed data uses the pool from db.js which connects to DB_NAME
        await connection.end();

        // Update DB_NAME in .env
        let envContent = fs.readFileSync('.env', 'utf8');
        envContent = envContent.replace('DB_NAME=defaultdb', 'DB_NAME=mams_db');
        fs.writeFileSync('.env', envContent);
        console.log("Updated .env file to use mams_db! Setup complete.");

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
