const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('../routes/apiRoutes');

const app = express();
const PORT = 3000;

// Middleware-uri globale
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Montarea elegantă a tuturor rutelor API
app.use('/api', apiRoutes);

// Pornirea serverului
app.listen(PORT, () => {
    console.log(`\n✅ Serverul de backend refactorizat OOP a pornit cu succes!`);
    console.log(`🌐 Ascultă pe adresa: http://localhost:${PORT}`);
});