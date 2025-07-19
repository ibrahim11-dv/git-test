const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Remplace par ton utilisateur MySQL
    password: 'brahim123', // Remplace par ton mot de passe MySQL
    database: 'nodejs'
});

db.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.stack);
        return;
    }
    console.log('✅ Connecté à la base de données MySQL.');
});

module.exports = db;