const pool = require('../db');

exports.createPurchase = async (req, res) => {
    let connection;
    try {
        const { base_id, equipment_id, quantity } = req.body;
        if (req.user.role !== 'Admin' && req.user.base_id !== parseInt(base_id)) {
            return res.status(403).json({ message: 'Unauthorized for this base' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Lock equipment row to serialize concurrent transactions on this equipment
        await connection.query('SELECT id FROM equipment WHERE id = ? FOR UPDATE', [equipment_id]);

        const [result] = await connection.query(
            'INSERT INTO purchases (base_id, equipment_id, quantity, recorded_by) VALUES (?, ?, ?, ?)',
            [base_id, equipment_id, quantity, req.user.id]
        );

        await connection.commit();
        res.status(201).json({ message: 'Purchase recorded', id: result.insertId });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.getPurchases = async (req, res) => {
    try {
        let { base_id, equipment_id, start_date, end_date, search, page = 1, limit = 5 } = req.query;
        
        if (req.user.role !== 'Admin' && req.user.base_id) {
            base_id = req.user.base_id;
        }
        let query = `
            FROM purchases p
            JOIN bases b ON p.base_id = b.id
            JOIN equipment e ON p.equipment_id = e.id
            JOIN users u ON p.recorded_by = u.id
            WHERE 1=1
        `;
        const params = [];
        if (base_id) { query += ' AND p.base_id = ?'; params.push(base_id); }
        if (equipment_id) { query += ' AND p.equipment_id = ?'; params.push(equipment_id); }
        if (start_date) { query += ' AND p.purchase_date >= ?'; params.push(start_date); }
        if (end_date) { query += ' AND p.purchase_date <= ?'; params.push(end_date); }
        if (search) {
            query += ' AND (e.name LIKE ? OR b.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Count total for pagination
        const [countResult] = await pool.query(`SELECT COUNT(*) as total ${query}`, params);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        // Fetch paginated data
        const dataQuery = `SELECT p.*, b.name as base_name, e.name as equipment_name, u.username as recorded_by_name ${query} ORDER BY p.purchase_date DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await pool.query(dataQuery, params);
        res.status(200).json({
            data: rows,
            total,
            page: parseInt(page),
            totalPages
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
