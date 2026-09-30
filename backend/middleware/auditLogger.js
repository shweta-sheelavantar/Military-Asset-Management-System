const pool = require('../db');

const auditLogger = async (req, res, next) => {
    // We want to capture POST, PUT, DELETE requests
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        // Wait for the response to finish so we can get the inserted record id if available
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const user_id = req.user?.id || null;
                    const action = req.method;
                    
                    // Determine target table based on the URL
                    let target_table = 'unknown';
                    if (req.originalUrl.includes('/purchases')) target_table = 'purchases';
                    else if (req.originalUrl.includes('/transfers')) target_table = 'transfers';
                    else if (req.originalUrl.includes('/assignments')) target_table = 'assignments';
                    
                    // For record_id we can try to parse it from req.params if available (for PUT/DELETE)
                    // Or for POST it might be returned in the response body, but since res.on('finish') doesn't give us the response body easily,
                    // we'll extract it from req.params or just save null.
                    const record_id = req.params?.id || null;
                    
                    await pool.query(
                        'INSERT INTO audit_logs (user_id, action, target_table, record_id) VALUES (?, ?, ?, ?)',
                        [user_id, action, target_table, record_id]
                    );
                } catch (error) {
                    console.error('Error writing to audit_logs:', error);
                }
            }
        });
    }
    next();
};

module.exports = auditLogger;
