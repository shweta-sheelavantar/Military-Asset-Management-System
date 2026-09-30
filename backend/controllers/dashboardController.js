const pool = require('../db');

exports.getDashboardMetrics = async (req, res) => {
    try {
        let { base_id, category_id, fromDate, toDate } = req.query;
        
        // Base Commander role locking
        if (req.user.role === 'Base Commander' && req.user.base_id) {
            base_id = req.user.base_id;
        }

        // --- Build WHERE clauses ---
        // For events BEFORE fromDate (to calculate Opening Balance)
        const beforeParams = [];
        let beforePurchasesCond = 'WHERE 1=1';
        let beforeToCond = 'WHERE 1=1';
        let beforeFromCond = 'WHERE 1=1';
        let beforeAssignCond = 'WHERE status IN ("Assigned", "Expended")';

        // For events DURING date range (to calculate Net Movement, etc.)
        const duringParams = [];
        let duringPurchasesCond = 'WHERE 1=1';
        let duringToCond = 'WHERE 1=1';
        let duringFromCond = 'WHERE 1=1';
        let duringAssignCond = 'WHERE status IN ("Assigned", "Expended")';

        // 1. Base Filter
        if (base_id) {
            beforePurchasesCond += ` AND p.base_id = ?`;
            beforeToCond += ` AND t.to_base_id = ?`;
            beforeFromCond += ` AND t.from_base_id = ?`;
            beforeAssignCond += ` AND a.base_id = ?`;
            
            duringPurchasesCond += ` AND p.base_id = ?`;
            duringToCond += ` AND t.to_base_id = ?`;
            duringFromCond += ` AND t.from_base_id = ?`;
            duringAssignCond += ` AND a.base_id = ?`;
            
            beforeParams.push(base_id);
            duringParams.push(base_id);
        }

        // 2. Category Filter (needs join with equipment)
        if (category_id) {
            beforePurchasesCond += ` AND e.category_id = ?`;
            beforeToCond += ` AND e.category_id = ?`;
            beforeFromCond += ` AND e.category_id = ?`;
            beforeAssignCond += ` AND e.category_id = ?`;

            duringPurchasesCond += ` AND e.category_id = ?`;
            duringToCond += ` AND e.category_id = ?`;
            duringFromCond += ` AND e.category_id = ?`;
            duringAssignCond += ` AND e.category_id = ?`;

            beforeParams.push(category_id);
            duringParams.push(category_id);
        }

        // 3. Date Filter
        if (fromDate) {
            beforePurchasesCond += ` AND p.purchase_date < ?`;
            beforeToCond += ` AND t.transfer_date < ?`;
            beforeFromCond += ` AND t.transfer_date < ?`;
            beforeAssignCond += ` AND a.assignment_date < ?`;
            beforeParams.push(fromDate);

            duringPurchasesCond += ` AND p.purchase_date >= ?`;
            duringToCond += ` AND t.transfer_date >= ?`;
            duringFromCond += ` AND t.transfer_date >= ?`;
            duringAssignCond += ` AND a.assignment_date >= ?`;
            duringParams.push(fromDate);
        }
        
        if (toDate) {
            duringPurchasesCond += ` AND p.purchase_date <= ?`;
            duringToCond += ` AND t.transfer_date <= ?`;
            duringFromCond += ` AND t.transfer_date <= ?`;
            duringAssignCond += ` AND a.assignment_date <= ?`;
            duringParams.push(toDate);
        }

        // --- Execute Queries for Opening Balance ---
        const [opPurchases] = await pool.query(`SELECT COALESCE(SUM(p.quantity), 0) as total FROM purchases p LEFT JOIN equipment e ON p.equipment_id = e.id ${beforePurchasesCond}`, beforeParams);
        const [opIn] = await pool.query(`SELECT COALESCE(SUM(t.quantity), 0) as total FROM transfers t LEFT JOIN equipment e ON t.equipment_id = e.id ${beforeToCond}`, beforeParams);
        const [opOut] = await pool.query(`SELECT COALESCE(SUM(t.quantity), 0) as total FROM transfers t LEFT JOIN equipment e ON t.equipment_id = e.id ${beforeFromCond}`, beforeParams);
        const [opAssign] = await pool.query(`SELECT COALESCE(SUM(a.quantity), 0) as total FROM assignments a LEFT JOIN equipment e ON a.equipment_id = e.id ${beforeAssignCond}`, beforeParams);

        const openingBalance = parseInt(opPurchases[0].total) + parseInt(opIn[0].total) - parseInt(opOut[0].total) - parseInt(opAssign[0].total);

        // --- Execute Queries for During Date Range ---
        const [durPurchases] = await pool.query(`SELECT COALESCE(SUM(p.quantity), 0) as total FROM purchases p LEFT JOIN equipment e ON p.equipment_id = e.id ${duringPurchasesCond}`, duringParams);
        const [durIn] = await pool.query(`SELECT COALESCE(SUM(t.quantity), 0) as total FROM transfers t LEFT JOIN equipment e ON t.equipment_id = e.id ${duringToCond}`, duringParams);
        const [durOut] = await pool.query(`SELECT COALESCE(SUM(t.quantity), 0) as total FROM transfers t LEFT JOIN equipment e ON t.equipment_id = e.id ${duringFromCond}`, duringParams);
        
        let duringAssignedCond = duringAssignCond.replace('IN ("Assigned", "Expended")', '= "Assigned"');
        let duringExpendedCond = duringAssignCond.replace('IN ("Assigned", "Expended")', '= "Expended"');
        
        const [durAssigned] = await pool.query(`SELECT COALESCE(SUM(a.quantity), 0) as total FROM assignments a LEFT JOIN equipment e ON a.equipment_id = e.id ${duringAssignedCond}`, duringParams);
        const [durExpended] = await pool.query(`SELECT COALESCE(SUM(a.quantity), 0) as total FROM assignments a LEFT JOIN equipment e ON a.equipment_id = e.id ${duringExpendedCond}`, duringParams);

        const purchasesTotal = parseInt(durPurchases[0].total);
        const inTotal = parseInt(durIn[0].total);
        const outTotal = parseInt(durOut[0].total);
        const assignedTotal = parseInt(durAssigned[0].total);
        const expendedTotal = parseInt(durExpended[0].total);

        const netMovement = purchasesTotal + inTotal - outTotal;
        const closingBalance = openingBalance + netMovement - assignedTotal - expendedTotal;

        // --- Fetch Chart Data ---
        // 1. Balance by Base
        let balanceByBaseQuery = `
            SELECT b.name as base_name, 
                   COALESCE((SELECT SUM(quantity) FROM purchases WHERE base_id = b.id), 0) +
                   COALESCE((SELECT SUM(quantity) FROM transfers WHERE to_base_id = b.id), 0) -
                   COALESCE((SELECT SUM(quantity) FROM transfers WHERE from_base_id = b.id), 0) -
                   COALESCE((SELECT SUM(quantity) FROM assignments WHERE base_id = b.id AND status IN ('Assigned', 'Expended')), 0) as balance
            FROM bases b
        `;
        if (base_id) {
            balanceByBaseQuery += ` WHERE b.id = ${pool.escape(base_id)}`;
        }
        const [balanceByBase] = await pool.query(balanceByBaseQuery);

        // 2. Recent Activity (Last 5 across all tables, limited by base_id if needed)
        // This is a simplified approach for Recent Activity: we UNION the top recent records.
        let activityQuery = `
            SELECT 'Purchase' as type, p.id, e.name as equipment, p.quantity, p.purchase_date as date 
            FROM purchases p JOIN equipment e ON p.equipment_id = e.id
            ${base_id ? 'WHERE p.base_id = ' + pool.escape(base_id) : ''}
            
            UNION ALL
            
            SELECT 'Transfer' as type, t.id, e.name as equipment, t.quantity, t.transfer_date as date 
            FROM transfers t JOIN equipment e ON t.equipment_id = e.id
            ${base_id ? 'WHERE t.from_base_id = ' + pool.escape(base_id) + ' OR t.to_base_id = ' + pool.escape(base_id) : ''}
            
            UNION ALL
            
            SELECT CONCAT('Assignment - ', a.status) as type, a.id, e.name as equipment, a.quantity, a.assignment_date as date 
            FROM assignments a JOIN equipment e ON a.equipment_id = e.id
            ${base_id ? 'WHERE a.base_id = ' + pool.escape(base_id) : ''}
            
            ORDER BY date DESC
        `;
        const [recentActivity] = await pool.query(activityQuery);

        // 3. Movement Time Series (Grouped by Date)
        // Purchases
        let pSeriesQ = `SELECT DATE_FORMAT(purchase_date, '%Y-%m-%d') as date, SUM(quantity) as qty FROM purchases p JOIN equipment e ON p.equipment_id = e.id ${duringPurchasesCond} GROUP BY DATE_FORMAT(purchase_date, '%Y-%m-%d')`;
        let tInSeriesQ = `SELECT DATE_FORMAT(transfer_date, '%Y-%m-%d') as date, SUM(quantity) as qty FROM transfers t JOIN equipment e ON t.equipment_id = e.id ${duringToCond} GROUP BY DATE_FORMAT(transfer_date, '%Y-%m-%d')`;
        let tOutSeriesQ = `SELECT DATE_FORMAT(transfer_date, '%Y-%m-%d') as date, SUM(quantity) as qty FROM transfers t JOIN equipment e ON t.equipment_id = e.id ${duringFromCond} GROUP BY DATE_FORMAT(transfer_date, '%Y-%m-%d')`;

        const [pSeries] = await pool.query(pSeriesQ, duringParams);
        const [tInSeries] = await pool.query(tInSeriesQ, duringParams);
        const [tOutSeries] = await pool.query(tOutSeriesQ, duringParams);
        
        // Aggregate them by date
        const seriesMap = {};
        pSeries.forEach(r => { seriesMap[r.date] = { ...seriesMap[r.date], purchases: parseInt(r.qty) }; });
        tInSeries.forEach(r => { seriesMap[r.date] = { ...seriesMap[r.date], transfersIn: parseInt(r.qty) }; });
        tOutSeries.forEach(r => { seriesMap[r.date] = { ...seriesMap[r.date], transfersOut: parseInt(r.qty) }; });
        
        const movementTimeSeries = Object.keys(seriesMap).sort().map(date => ({
            date,
            purchases: seriesMap[date].purchases || 0,
            transfersIn: seriesMap[date].transfersIn || 0,
            transfersOut: seriesMap[date].transfersOut || 0,
        }));

        res.status(200).json({
            metrics: {
                openingBalance,
                purchases: purchasesTotal,
                transfersIn: inTotal,
                transfersOut: outTotal,
                netMovement,
                assigned: assignedTotal,
                expended: expendedTotal,
                closingBalance
            },
            charts: {
                balanceByBase,
                recentActivity,
                movementTimeSeries
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

exports.getMovementDetails = async (req, res) => {
    try {
        let { base_id, category_id, fromDate, toDate } = req.query;
        if (req.user.role === 'Base Commander' && req.user.base_id) base_id = req.user.base_id;

        // Build simple WHERE clauses for the modal
        let pCond = 'WHERE 1=1', tInCond = 'WHERE 1=1', tOutCond = 'WHERE 1=1';
        let pParams = [], tInParams = [], tOutParams = [];

        if (base_id) {
            pCond += ' AND p.base_id = ?'; pParams.push(base_id);
            tInCond += ' AND t.to_base_id = ?'; tInParams.push(base_id);
            tOutCond += ' AND t.from_base_id = ?'; tOutParams.push(base_id);
        }
        if (category_id) {
            pCond += ' AND e.category_id = ?'; pParams.push(category_id);
            tInCond += ' AND e.category_id = ?'; tInParams.push(category_id);
            tOutCond += ' AND e.category_id = ?'; tOutParams.push(category_id);
        }
        if (fromDate) {
            pCond += ' AND p.purchase_date >= ?'; pParams.push(fromDate);
            tInCond += ' AND t.transfer_date >= ?'; tInParams.push(fromDate);
            tOutCond += ' AND t.transfer_date >= ?'; tOutParams.push(fromDate);
        }
        if (toDate) {
            pCond += ' AND p.purchase_date <= ?'; pParams.push(toDate);
            tInCond += ' AND t.transfer_date <= ?'; tInParams.push(toDate);
            tOutCond += ' AND t.transfer_date <= ?'; tOutParams.push(toDate);
        }

        const [purchases] = await pool.query(`SELECT p.*, e.name as equipment_name, b.name as base_name FROM purchases p JOIN equipment e ON p.equipment_id = e.id JOIN bases b ON p.base_id = b.id ${pCond} ORDER BY p.purchase_date DESC`, pParams);
        const [transfersIn] = await pool.query(`SELECT t.*, e.name as equipment_name, b.name as from_base_name FROM transfers t JOIN equipment e ON t.equipment_id = e.id JOIN bases b ON t.from_base_id = b.id ${tInCond} ORDER BY t.transfer_date DESC`, tInParams);
        const [transfersOut] = await pool.query(`SELECT t.*, e.name as equipment_name, b.name as to_base_name FROM transfers t JOIN equipment e ON t.equipment_id = e.id JOIN bases b ON t.to_base_id = b.id ${tOutCond} ORDER BY t.transfer_date DESC`, tOutParams);

        res.status(200).json({ purchases, transfersIn, transfersOut });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
