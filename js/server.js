const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware-uri esențiale
app.use(cors());
app.use(express.json()); // Permite citirea req.body

// Servim fișierele statice din directorul părinte (rădăcina proiectului)
app.use(express.static(path.join(__dirname, '../')));

// Configurația bazei de date Oracle
const dbConfig = {
    user: 'ADAPOST_ADMIN',
    password: 'student',
    connectString: 'localhost:1521/XE'
};

// Ruta POST pentru salvarea angajatului și a specializărilor
app.post('/api/angajati', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const { nume, prenume, email, telefon, roleType, id_adapost, specializari } = req.body;

        // Generăm un salariu random între 3000 și 7000
        const salariuRandom = Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;

        // Inserăm direct valoarea din roleType in coloana functie
        const sqlAngajat = `
            INSERT INTO angajati (id_adapost, nume, prenume, telefon, functie, salariu)
            VALUES (:id_adapost, :nume, :prenume, :telefon, :functie, :salariu)
                RETURNING id INTO :out_id
        `;

        const resultAngajat = await connection.execute(
            sqlAngajat,
            {
                id_adapost: Number(id_adapost),
                nume,
                prenume,
                telefon,
                functie: roleType, // Salvăm direct 'MEDIC', 'VOLUNTAR' etc.
                salariu: salariuRandom,
                out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            },
            { autoCommit: false }
        );

        const noulAngajatId = resultAngajat.outBinds.out_id[0];

        // Inserare în tabelul copil (SPECIALIZARI_ANGAJATI)
        if (specializari && Array.isArray(specializari)) {
            const sqlSpecializare = `
                INSERT INTO specializari_angajati (id_angajat, specie)
                VALUES (:id_angajat, :specie)
            `;
            for (const specie of specializari) {
                await connection.execute(
                    sqlSpecializare,
                    { id_angajat: noulAngajatId, specie },
                    { autoCommit: false }
                );
            }
        }

        await connection.commit();
        res.status(201).json({ success: true, id: noulAngajatId, salariuAlocat: salariuRandom });

    } catch (error) {
        console.error('Eroare la salvarea în BD:', error);
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, message: 'Eroare pe serverul de baze de date.' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (err) { console.error(err); }
        }
    }
});

// Comanda vitală care ține serverul pornit în fundal
app.listen(PORT, () => {
    console.log(`\n✅ Serverul de backend a pornit cu succes!`);
    console.log(`🌐 Ascultă pe adresa: http://localhost:${PORT}`);
    console.log(`👉 Accesează formularul deschizând în browser: http://localhost:${PORT}/volunteer.html\n`);
});