const pool = require('../db');

exports.createTransfer = async (req, res) => {
    let connection;
    try {
        const { from_base_id, to_base_id, equipment_id, quantity } = req.body;
        if (req.user.role !== 'Admin' && req.user.base_id !== parseInt(from_base_id)) {
            return res.status(403).json({ message: 'Unauthorized for source base' });
        }
        if (from_base_id === to_base_id) {
             return res.status(400).json({ message: 'Source and destination base cannot be same' });
        }
        const transferQty = parseInt(quantity);
        if (transferQty <= 0) return res.status(400).json({ message: 'Quantity must be positive' });

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Lock equipment row to serialize concurrent stock calculations for this equipment
        await connection.query('SELECT id FROM equipment WHERE id = ? FOR UPDATE', [equipment_id]);

        // Calculate current stock at from_base
        const stockQuery = `
            SELECT 
                (SELECT COALESCE(SUM(quantity), 0) FROM purchases WHERE base_id = ? AND equipment_id = ?) +
                (SELECT COALESCE(SUM(quantity), 0) FROM transfers WHERE to_base_id = ? AND equipment_id = ?) -
                (SELECT COALESCE(SUM(quantity), 0) FROM transfers WHERE from_base_id = ? AND equipment_id = ?) -
                (SELECT COALESCE(SUM(quantity), 0) FROM assignments WHERE base_id = ? AND equipment_id = ? AND status IN ('Assigned', 'Expended')) 
            AS available_stock
        `;
        const [stockRows] = await connection.query(stockQuery, [
            from_base_id, equipment_id, 
            from_base_id, equipment_id, 
            from_base_id, equipment_id, 
            from_base_id, equipment_id
        ]);

        const available = stockRows[0].available_stock;
        
        if (available < transferQty) {
            await connection.rollback();
            return res.status(400).json({ message: 'Insufficient stock available for transfer' });
        }

        const [result] = await connection.query(
            'INSERT INTO transfers (from_base_id, to_base_id, equipment_id, quantity, recorded_by) VALUES (?, ?, ?, ?, ?)',
            [from_base_id, to_base_id, equipment_id, transferQty, req.user.id]
        );

        await connection.commit();
        res.status(201).json({ message: 'Transfer recorded', id: result.insertId });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.getTransfers = async (req, res) => {
    try {
        let { base_id, equipment_id, start_date, end_date, search, page = 1, limit = 5 } = req.query; 
        
        if (req.user.role !== 'Admin' && req.user.base_id) {
            base_id = req.user.base_id;
        }
        let query = `
            FROM transfers t
            JOIN bases fb ON t.from_base_id = fb.id
            JOIN bases tb ON t.to_base_id = tb.id
            JOIN equipment e ON t.equipment_id = e.id
            JOIN users u ON t.recorded_by = u.id
            WHERE 1=1
        `;
        const params = [];
        if (base_id) { 
            query += ' AND (t.from_base_id = ? OR t.to_base_id = ?)'; 
            params.push(base_id, base_id); 
        }
        if (equipment_id) { query += ' AND t.equipment_id = ?'; params.push(equipment_id); }
        if (start_date) { query += ' AND t.transfer_date >= ?'; params.push(start_date); }
        if (end_date) { query += ' AND t.transfer_date <= ?'; params.push(end_date); }
        if (search) {
            query += ' AND (e.name LIKE ? OR fb.name LIKE ? OR tb.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Count total
        const [countResult] = await pool.query(`SELECT COUNT(*) as total ${query}`, params);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        // Fetch paginated data
        const dataQuery = `SELECT t.*, fb.name as from_base_name, tb.name as to_base_name, e.name as equipment_name, u.username as recorded_by_name ${query} ORDER BY t.transfer_date DESC LIMIT ? OFFSET ?`;
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
