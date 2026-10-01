const pool = require('../db');

exports.getBases = async (req, res) => {
    try {
        let query = 'SELECT id, name, location FROM bases';
        let params = [];
        
        // Base Commander sees only their own base by default, unless all=true is passed
        if (req.user.role === 'Base Commander' && req.user.base_id && req.query.all !== 'true') {
            query += ' WHERE id = ?';
            params.push(req.user.base_id);
        }
        
        const [rows] = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getEquipment = async (req, res) => {
    try {
        const query = `
            SELECT e.id, e.name, e.description, c.name as category_name 
            FROM equipment e
            LEFT JOIN equipment_categories c ON e.category_id = c.id
        `;
        const [rows] = await pool.query(query);
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getInventory = async (req, res) => {
    try {
        const { baseId, equipmentId } = req.query;
        if (!baseId || !equipmentId) {
            return res.status(400).json({ message: "baseId and equipmentId are required" });
        }
        
        // Calculate purchases
        const [purchases] = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) as total FROM purchases WHERE base_id = ? AND equipment_id = ?',
            [baseId, equipmentId]
        );
        
        // Calculate transfers in
        const [transfersIn] = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) as total FROM transfers WHERE to_base_id = ? AND equipment_id = ?',
            [baseId, equipmentId]
        );
        
        // Calculate transfers out
        const [transfersOut] = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) as total FROM transfers WHERE from_base_id = ? AND equipment_id = ?',
            [baseId, equipmentId]
        );
        
        // Calculate assignments (Assigned or Expended remove from stock; Returned does not)
        const [assignments] = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) as total FROM assignments WHERE base_id = ? AND equipment_id = ? AND status IN (\'Assigned\', \'Expended\')',
            [baseId, equipmentId]
        );
        
        const totalStock = 
            parseInt(purchases[0].total) + 
            parseInt(transfersIn[0].total) - 
            parseInt(transfersOut[0].total) - 
            parseInt(assignments[0].total);
            
        res.status(200).json({ available: totalStock });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
