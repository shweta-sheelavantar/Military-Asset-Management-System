const pool = require('../db');

const apiLogger = async (req, res, next) => {
    // We log write actions after the response finishes, or simply during the request
    const originalSend = res.send;
    res.send = function (body) {
        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
            const userId = req.user ? req.user.id : null;
            const action = `${req.method} ${req.originalUrl}`;
            pool.query(
                'INSERT INTO api_logs (user_id, method, endpoint, action, payload) VALUES (?, ?, ?, ?, ?)',
                [userId, req.method, req.originalUrl, action, JSON.stringify(req.body)]
            ).catch(err => console.error('API Log Error:', err));
        }
        originalSend.call(this, body);
    };
    next();
};

module.exports = apiLogger;
