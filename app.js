const express = require('express');
const path = require('path');
const app = express();
const db = require('./DATABASE/db');
const session = require('express-session');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: "brahim's_secrete_key",
    resave: false,
    saveUninitialized: false
}));

// Login routes
app.get('/login', (req, res) => {
    res.status(200).sendFile(path.join(__dirname, 'public', 'HTML', 'login.html'));
});

app.post('/auth', (req, res) => {
    const email = req.body.email.trim();
    const password = req.body.password.trim();

    const sql = 'SELECT * FROM user WHERE email = ? AND password = ?';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error('MySQL auth error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length > 0) {
            const user = results[0];
            req.session.username = user.identifiant;
            req.session.email = user.email;
            req.session.userId = user.id;
            res.status(200).json({ success: true });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.status(200).sendFile(path.join(__dirname, 'public', 'HTML', 'main.html'));
});

// API routes
app.get('/api/userInfo', (req, res) => {
    if (req.session.username) {
        res.json({
            username: req.session.username,
            email: req.session.email,
            userId: req.session.userId
        });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

app.get('/api/usersInfo', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.searchTerm || '';

    let countSql = "SELECT COUNT(*) AS total FROM user";
    let sql = "SELECT id, identifiant, email FROM user";
    let countParams = [];
    let queryParams = [];

    if (searchTerm) {
        const searchParam = `%${searchTerm}%`;
        countSql += " WHERE identifiant LIKE ? OR email LIKE ?";
        sql += " WHERE identifiant LIKE ? OR email LIKE ?";
        countParams = [searchParam, searchParam];
        queryParams = [searchParam, searchParam, limit, offset];
    } else {
        queryParams = [limit, offset];
    }

    sql += " LIMIT ? OFFSET ?";

    db.query(countSql, countParams, (countErr, countResult) => {
        if (countErr) {
            console.error('MySQL count error:', countErr);
            return res.status(500).json({ error: 'Database error' });
        }

        const total = countResult[0].total;

        db.query(sql, queryParams, (err, results) => {
            if (err) {
                console.error('MySQL fetch error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                users: results,
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            });
        });
    });
});

app.post('/api/addUser', (req, res) => {
    const { identifiant, email, password } = req.body;

    const checksql = 'SELECT id FROM user WHERE email = ?';
    db.query(checksql, [email], (err, results) => {
        if (err) {
            console.error('MySQL check error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        
        const sql = 'INSERT INTO user(identifiant, email, password) VALUES (?, ?, ?)';
        db.query(sql, [identifiant, email, password], (insertErr) => {
            if (insertErr) {
                console.error('MySQL insert error:', insertErr);
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ success: true });
        });
    });
});

app.get('/api/getUser/:id', (req, res) => {
    const userId = req.params.id;
    
    const sql = 'SELECT id, identifiant, email FROM user WHERE id = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('MySQL fetch error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(results[0]);
    });
});

app.put('/api/updateUser/:id', (req, res) => {
    const userId = req.params.id;
    const { name, email } = req.body;
    
    const checkSql = 'SELECT id FROM user WHERE email = ? AND id != ?';
    db.query(checkSql, [email, userId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('MySQL check error:', checkErr);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (checkResults.length > 0) {
            return res.status(409).json({ error: 'Email already in use' });
        }
        
        const updateSql = 'UPDATE user SET identifiant = ?, email = ? WHERE id = ?';
        db.query(updateSql, [name, email, userId], (updateErr, updateResults) => {
            if (updateErr) {
                console.error('MySQL update error:', updateErr);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (updateResults.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({ success: true });
        });
    });
});

app.delete('/api/deleteUser/:id', (req, res) => {
    const userId = req.params.id;

    const checkSql = 'SELECT id FROM user WHERE id = ?';
    db.query(checkSql, [userId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('MySQL check error:', checkErr);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (checkResults.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const deleteSql = 'DELETE FROM user WHERE id = ?';
        db.query(deleteSql, [userId], (deleteErr) => {
            if (deleteErr) {
                console.error('MySQL delete error:', deleteErr);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({ success: true });
        });
    });
});

app.use((req, res) => {
    res.status(404).redirect('/login');
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
});