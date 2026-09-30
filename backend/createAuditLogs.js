const pool = require('./db');

async function createAuditLogsTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            action VARCHAR(50),
            target_table VARCHAR(50),
            record_id INT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
    `;
    try {
        await pool.query(query);
        console.log("audit_logs table created successfully");
    } catch (error) {
        console.error("Error creating table:", error);
    } finally {
        process.exit();
    }
}

createAuditLogsTable();
