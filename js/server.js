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

        const sqlMatch = `
            SELECT DISTINCT 
                a_cand.nume || ' ' || a_cand.prenume AS NUME_PARTENER,
                ad_dest.nume AS NUME_ADAPOST,
                o_dest.nume AS ORAS,
                t_dest.nume AS TARA,
                a_cand.functie AS FUNCTIE
            FROM angajati a_curr
            JOIN angajati a_cand ON a_cand.functie = a_curr.functie AND a_cand.id <> a_curr.id
            JOIN adaposturi ad_dest ON a_cand.id_adapost = ad_dest.id
            JOIN orase o_dest ON ad_dest.id_oras = o_dest.id
            JOIN tari t_dest ON o_dest.id_tara = t_dest.id
            WHERE a_curr.id = :id
              AND (SYSDATE - a_curr.data_angajarii) >= 180
              AND ad_dest.accepta_vizite = 'DA'
              AND EXISTS (
                  SELECT 1 FROM limbi_angajati la
                  JOIN limbi_tari lt ON la.id_limba = lt.id_limba
                  WHERE la.id_angajat = a_curr.id AND lt.id_tara = t_dest.id
              )
              AND EXISTS (
                  SELECT 1 FROM specializari_angajati sa1
                  JOIN specializari_angajati sa2 ON sa1.specie = sa2.specie
                  WHERE sa1.id_angajat = a_curr.id AND sa2.id_angajat = a_cand.id
              )
        `;

        const result = await connection.execute(sqlMatch, [empId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length > 0) {
            res.json({ success: true, matches: result.rows });
        } else {
            res.json({ success: false, message: "No compatible partners found or seniority insufficient (min. 6 months)." });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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