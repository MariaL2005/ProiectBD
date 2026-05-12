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

// 1. RUTA GET: Preluăm lista limbilor disponibile în baza de date
app.get('/api/limbi', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT nume FROM limbi ORDER BY nume ASC`);
        const limbi = result.rows.map(row => row[0]);
        res.json(limbi);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.close();
    }
});

// 2. RUTA POST: Salvarea completă a angajatului (date, specializări, limbi standard + Other)
app.post('/api/angajati', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const { nume, prenume, email, telefon, roleType, id_adapost, specializari, limbi, limba_noua } = req.body;

        // Generăm un salariu random între 3000 și 7000
        const salariuRandom = Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;

        // A. Inserăm angajatul
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
                functie: roleType,
                salariu: salariuRandom,
                out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            },
            { autoCommit: false }
        );

        const noulAngajatId = resultAngajat.outBinds.out_id[0];

        // B. Inserăm specializările (specii de animale)
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

        // C. Inserăm limbile selectate din lista existentă
        if (limbi && Array.isArray(limbi)) {
            for (const numeL of limbi) {
                await connection.execute(
                    `INSERT INTO limbi_angajati (id_angajat, id_limba) 
                     VALUES (:id, (SELECT id FROM limbi WHERE nume = :nume))`,
                    { id: noulAngajatId, nume: numeL },
                    { autoCommit: false }
                );
            }
        }

        // D. Gestionăm adăugarea unei limbi noi (câmpul "Other")
        if (limba_noua && limba_noua.trim() !== '') {
            const numeNou = limba_noua.trim();

            // Verificăm dacă limba există deja în tabelul LIMBI (case-insensitive)
            const check = await connection.execute(
                `SELECT id FROM limbi WHERE UPPER(nume) = UPPER(:n)`,
                { n: numeNou }
            );

            let idLimba;
            if (check.rows.length === 0) {
                // Dacă nu există, o adăugăm
                const resIns = await connection.execute(
                    `INSERT INTO limbi (nume) VALUES (:n) RETURNING id INTO :out_id`,
                    { n: numeNou, out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } },
                    { autoCommit: false }
                );
                idLimba = resIns.outBinds.out_id[0];
            } else {
                // Dacă există deja, refolosim ID-ul
                idLimba = check.rows[0][0];
            }

            // Asociem limba cu angajatul
            try {
                await connection.execute(
                    `INSERT INTO limbi_angajati (id_angajat, id_limba) VALUES (:a, :l)`,
                    { a: noulAngajatId, l: idLimba },
                    { autoCommit: false }
                );
            } catch (e) {
                // Ignorăm silențios dacă utilizatorul a bifat limba în listă dar a și scris-o la "Other"
            }
        }

        // Salvăm definitiv toate modificările (Tranzacție completă)
        await connection.commit();
        res.status(201).json({ success: true, id: noulAngajatId, salariuAlocat: salariuRandom });

    } catch (error) {
        console.error('Eroare la salvarea în BD:', error);
        // Dacă orice pas eșuează, anulăm totul pentru a nu lăsa date incomplete
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, message: 'Eroare pe serverul de baze de date: ' + error.message });
    } finally {
        // Închidem conexiunea o singură dată, la finalul întregului proces
        if (connection) {
            try { await connection.close(); } catch (err) { console.error(err); }
        }
    }
});

// 3. RUTA GET: Căutarea oportunităților pentru schimbul de experiență
app.get('/api/schimb-experienta/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const empId = req.params.id;

        // Apelăm procedura SQL în loc să scriem tot SELECT-ul aici
        const result = await connection.execute(
            `BEGIN get_exchange_opportunities(:id, :cursor); END;`,
            {
                id: empId,
                cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            }
        );

        const resultSet = result.outBinds.cursor;
        const rows = await resultSet.getRows(); // Preluăm toate rândurile din cursor
        await resultSet.close(); // Important: închidem cursorul

        if (rows.length > 0) {
            // Mapăm rândurile pentru a returna obiecte cu nume de coloane (dacă nu folosim OUT_FORMAT_OBJECT)
            const matches = rows.map(row => ({
                NUME_PARTENER: row[0],
                NUME_ADAPOST: row[1],
                ORAS: row[2],
                TARA: row[3],
                FUNCTIE: row[4]
            }));
            res.json({ success: true, matches: matches });
        } else {
            res.json({ success: false, message: "Nu s-au găsit parteneri sau vechime insuficientă." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) await connection.close();
    }
});

// 1. GET: Listarea animalelor cu filtre
app.get('/api/animale', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const { rasa, id_adapost, status } = req.query;

        let sql = `SELECT a.*, c.id_adapost FROM animale a JOIN custi c ON a.id_cusca = c.id WHERE 1=1`;
        const binds = {};

        if (rasa) { sql += ` AND a.rasa = :rasa`; binds.rasa = rasa; }
        if (id_adapost) { sql += ` AND c.id_adapost = :id_adapost`; binds.id_adapost = id_adapost; }
        if (status) { sql += ` AND a.status = :status`; binds.status = status; }

        const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.close();
    }
});

// 2. GET: Detalii complete animal (inclusiv istoric)
app.get('/api/animale/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const id = req.params.id;

        // Date generale
        const info = await connection.execute(
            `SELECT a.*, ad.nume as nume_adapost FROM animale a 
             JOIN custi c ON a.id_cusca = c.id 
             JOIN adaposturi ad ON c.id_adapost = ad.id 
             WHERE a.id = :id`, [id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Istoric Medical
        const medical = await connection.execute(
            `SELECT * FROM interventii_medicale WHERE id_animal = :id ORDER BY data_interventie DESC`,
            [id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Istoric Adoptii
        const adoptii = await connection.execute(
            `SELECT h.*, p.nume || ' ' || p.prenume as nume_persoana 
             FROM istoric_adoptii h 
             JOIN persoane p ON h.id_persoana = p.id 
             WHERE h.id_animal = :id ORDER BY data_adoptie DESC`,
            [id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            detalii: info.rows[0],
            medical: medical.rows,
            adoptii: adoptii.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.close();
    }
});

// 3. POST: Adăugare animal nou
app.post('/api/animale', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const { id_cusca, nume, specie, rasa, data_nastere, descriere } = req.body;

        const sql = `INSERT INTO animale (id_cusca, nume, specie, rasa, data_nastere, descriere) 
                     VALUES (:id_cusca, :nume, :specie, :rasa, TO_DATE(:data_nastere, 'YYYY-MM-DD'), :descriere) 
                     RETURNING id INTO :id`;

        const result = await connection.execute(sql, {
            id_cusca, nume, specie, rasa, data_nastere, descriere,
            id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }, { autoCommit: true });

        res.status(201).json({ success: true, id: result.outBinds.id[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Pornirea serverului
app.listen(PORT, () => {
    console.log(`\n✅ Serverul de backend a pornit cu succes!`);
    console.log(`🌐 Ascultă pe adresa: http://localhost:${PORT}`);
    console.log(`👉 Accesează formularul deschizând în browser: http://localhost:${PORT}/volunteer.html\n`);
});

// RUTA PUT: Actualizarea informațiilor despre un animal
app.put('/api/animale/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const { id } = req.params;
        const { specie, rasa, descriere } = req.body;

        const sql = `
            UPDATE animale 
            SET specie = :specie, 
                rasa = :rasa, 
                descriere = :descriere 
            WHERE id = :id
        `;

        await connection.execute(sql, { specie, rasa, descriere, id }, { autoCommit: true });
        res.json({ success: true, message: "Animal updated" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) await connection.close();
    }
});

// 1. RUTA POST: Adăugare Intervenție Medicală
app.post('/api/interventii-medicale', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const { id_animal, tipul, descriere, cost } = req.body;

        const sql = `
            INSERT INTO interventii_medicale (id_animal, tipul, descriere, cost, data_interventie)
            VALUES (:id_animal, :tipul, :descriere, :cost, SYSDATE)
        `;

        await connection.execute(sql, { id_animal, tipul, descriere, cost }, { autoCommit: true });
        res.status(201).json({ success: true, message: "Intervenție salvată!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) await connection.close();
    }
});

// 2. RUTA POST: Înregistrare Adopție (Creează persoana + legătura în istoric)
app.post('/api/istoric-adoptii', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const { id_animal, nume, prenume, telefon, email } = req.body;

        // Pasul A: Inserăm persoana (adoptatorul)
        const sqlPersoana = `
            INSERT INTO persoane (nume, prenume, telefon, email)
            VALUES (:nume, :prenume, :telefon, :email)
            RETURNING id INTO :out_id
        `;
        const resPers = await connection.execute(sqlPersoana,
            { nume, prenume, telefon, email, out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } },
            { autoCommit: false }
        );
        const idPersoana = resPers.outBinds.out_id[0];

        // Pasul B: Inserăm în istoric_adoptii
        // Trigger-ul 'trg_update_status_adoptie' va trece automat animalul în status 'ADOPTAT'
        const sqlAdoptie = `
            INSERT INTO istoric_adoptii (id_animal, id_persoana, data_adoptie)
            VALUES (:id_animal, :id_persoana, SYSDATE)
        `;
        await connection.execute(sqlAdoptie, { id_animal, id_persoana: idPersoana }, { autoCommit: false });

        await connection.commit();
        res.status(201).json({ success: true, message: "Adopție înregistrată cu succes!" });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) await connection.close();
    }
});