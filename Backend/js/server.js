const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('../routes/apiRoutes');

const app = express();
const PORT = 3000;

// Middleware-uri globale
app.use(cors());
app.use(express.json());

// 1. Expunem corect folderul Frontend către browser
app.use(express.static(path.join(__dirname, '../../Frontend')));

// 2. Expunem corect folderul de active (imaginile din assets)
app.use('/assets', express.static(path.join(__dirname, '../../assets')));

// Montarea elegantă a tuturor rutelor API
app.use('/api', apiRoutes);

// Pornirea serverului (salvăm instanța în variabila 'server')
const server = app.listen(PORT, () => {
    console.log(`\n✅ Serverul de backend refactorizat OOP a pornit cu succes!`);
    console.log(`🌐 Ascultă pe adresa: http://localhost:${PORT}`);
});

// Prinderea erorilor (acum variabila 'server' este recunoscută)
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ EROARE: Portul ${PORT} este deja blocat/folosit!`);
        console.error(`👉 Te rog rulează comanda 'killall node' în terminal și încearcă din nou.\n`);
        process.exit(1); // Oprește procesul ca să nu rămână agățat
    } else {
        console.error(`❌ EROARE LA PORNIRE:`, err);
    }
});