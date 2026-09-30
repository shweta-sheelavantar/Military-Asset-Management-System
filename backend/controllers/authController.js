const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        const passwordIsValid = bcrypt.compareSync(password, user.password_hash);

        if (!passwordIsValid) {
            return res.status(401).json({ message: 'Invalid Password!' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, base_id: user.base_id },
            process.env.JWT_SECRET,
            { expiresIn: 86400 } // 24 hours
        );

        res.status(200).json({
            id: user.id,
            username: user.username,
            role: user.role,
            base_id: user.base_id,
            accessToken: token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};
