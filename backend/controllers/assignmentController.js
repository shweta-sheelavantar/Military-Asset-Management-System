const pool = require('../db');

exports.createAssignment = async (req, res) => {
    let connection;
    try {
        const { base_id, equipment_id, personnel_name, quantity } = req.body;
        if (req.user.role !== 'Admin' && req.user.base_id !== parseInt(base_id)) {
            return res.status(403).json({ message: 'Unauthorized for this base' });
        }
        const assignQty = parseInt(quantity);
        if (assignQty <= 0) return res.status(400).json({ message: 'Quantity must be positive' });

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Lock equipment row to serialize concurrent stock calculations for this equipment
        await connection.query('SELECT id FROM equipment WHERE id = ? FOR UPDATE', [equipment_id]);

        // Calculate current stock at base
        const stockQuery = `
            SELECT 
                (SELECT COALESCE(SUM(quantity), 0) FROM purchases WHERE base_id = ? AND equipment_id = ?) +
                (SELECT COALESCE(SUM(quantity), 0) FROM transfers WHERE to_base_id = ? AND equipment_id = ?) -
                (SELECT COALESCE(SUM(quantity), 0) FROM transfers WHERE from_base_id = ? AND equipment_id = ?) -
                (SELECT COALESCE(SUM(quantity), 0) FROM assignments WHERE base_id = ? AND equipment_id = ? AND status IN ('Assigned', 'Expended')) 
            AS available_stock
        `;
        const [stockRows] = await connection.query(stockQuery, [
            base_id, equipment_id, 
            base_id, equipment_id, 
            base_id, equipment_id, 
            base_id, equipment_id
        ]);

        const available = stockRows[0].available_stock;
        
        if (available < assignQty) {
            await connection.rollback();
            return res.status(400).json({ message: 'Insufficient stock available for assignment' });
        }

        const [result] = await connection.query(
            'INSERT INTO assignments (base_id, equipment_id, personnel_name, quantity, status, recorded_by) VALUES (?, ?, ?, ?, \'Assigned\', ?)',
            [base_id, equipment_id, personnel_name, assignQty, req.user.id]
        );

        await connection.commit();
        res.status(201).json({ message: 'Assignment recorded', id: result.insertId });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.updateAssignmentStatus = async (req, res) => {
    // Only updating status, no stock check needed since returning or expending 
    // an already assigned item doesn't require checking available unassigned stock.
    let connection;
    try {
        const { id } = req.params;
        const { status } = req.body; 
        
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Optionally, check if it's already returned or expended, but UI handles this.
        await connection.query(
            'UPDATE assignments SET status = ?, return_or_expend_date = CURRENT_TIMESTAMP WHERE id = ?',
            [status, id]
        );

        await connection.commit();
        res.status(200).json({ message: `Assignment marked as ${status}` });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.getAssignments = async (req, res) => {
    try {
        let { base_id, equipment_id, status, search, page = 1, limit = 5 } = req.query;
        
        if (req.user.role !== 'Admin' && req.user.base_id) {
            base_id = req.user.base_id;
        }
        let query = `
            FROM assignments a
            JOIN bases b ON a.base_id = b.id
            JOIN equipment e ON a.equipment_id = e.id
            JOIN users u ON a.recorded_by = u.id
            WHERE 1=1
        `;
        const params = [];
        if (base_id) { query += ' AND a.base_id = ?'; params.push(base_id); }
        if (equipment_id) { query += ' AND a.equipment_id = ?'; params.push(equipment_id); }
        if (status) { query += ' AND a.status = ?'; params.push(status); }
        
        if (search) {
            query += ' AND (e.name LIKE ? OR b.name LIKE ? OR a.personnel_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Count total
        const [countResult] = await pool.query(`SELECT COUNT(*) as total ${query}`, params);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        // Fetch paginated data
        const dataQuery = `SELECT a.*, b.name as base_name, e.name as equipment_name, u.username as recorded_by_name ${query} ORDER BY a.assignment_date DESC LIMIT ? OFFSET ?`;
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

exports.markExpended = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(`UPDATE assignments SET status = 'Expended', return_or_expend_date = CURRENT_TIMESTAMP WHERE id = ? AND status = 'Assigned'`, [id]);
        if (result.affectedRows === 0) return res.status(400).json({ message: 'Assignment not found or already updated' });
        res.status(200).json({ message: 'Marked as Expended' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.returnToStock = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(`UPDATE assignments SET status = 'Returned', return_or_expend_date = CURRENT_TIMESTAMP WHERE id = ? AND status = 'Assigned'`, [id]);
        if (result.affectedRows === 0) return res.status(400).json({ message: 'Assignment not found or already updated' });
        res.status(200).json({ message: 'Returned to Stock' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
