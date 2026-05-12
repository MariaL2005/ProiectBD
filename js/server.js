const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const path = require('path'); // 1. Importăm modulul path pentru a gestiona directoarele

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 2. Setăm Express să servească fișierele din directorul părinte (rădăcina proiectului)
// Folosind __dirname, serverul va găsi corect fișierele indiferent de unde deschizi terminalul
app.use(express.static(path.join(__dirname, '../')));

// Configurația bazei de date
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

app.listen(PORT, () => {
    console.log(`Serverul rulează pe http://localhost:${PORT}`);
    console.log(`Deschide formularul la: http://localhost:${PORT}/volunteer.html`);
});