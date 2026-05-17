const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const dbConfig = require('../config/dbConfig');

// Importăm Repositories și Controllers
const financeRepo = require('../repositories/FinanceRepository');
const animalRepo = require('../repositories/AnimalRepository');
const empController = require('../controllers/EmployeeController');
const animalController = require('../controllers/AnimalController');

// ============================================================
// 1. RUTE ANGAJAȚI & LIMBI (Folosite în volunteer.html)
// ============================================================
router.get('/limbi', empController.getLanguages);
router.post('/angajati', empController.createEmployee);
router.get('/schimb-experienta/:id', empController.getExchangeOpportunities);

// ============================================================
// 2. RUTE ANIMALE (Filtrare, Profil, Editare)
// ============================================================

// Lista de animale (pentru adopt.html) - folosim controller-ul existent
router.get('/animale', animalController.getAnimals);

// Detalii profil animal - folosim controller-ul existent
router.get('/animale/:id', animalController.getProfile);

// Adăugare animal (metoda simplă)
router.post('/animale', animalController.addAnimal);

// Update detalii animal (din pagina de profil)
router.put('/animale/:id', animalController.updateAnimal);

// ============================================================
// 3. LOGICĂ AVANSATĂ PL/SQL (Admisie & Returnare)
// ============================================================

// ADMISIE INTELIGENTĂ (Algoritm Drum Minim)
router.post('/animale/admisie', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await animalRepo.admisieAnimalInteligenta(connection, req.body);
        await connection.commit();
        res.status(200).json(result);
    } catch (error) {
        console.error("Eroare la admisie:", error.message);
        res.status(400).json({ success: false, message: error.message });
    } finally {
        if (connection) { try { await connection.close(); } catch (err) { console.error(err); } }
    }
});

// RETURNARE ANIMAL (Procedura sp_returnare_animal)
router.post('/animale/:id/return', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        await animalRepo.returnAnimal(connection, req.params.id, req.body.motiv);
        await connection.commit();
        res.status(200).json({ success: true, message: "Animal returned successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) { try { await connection.close(); } catch (err) { console.error(err); } }
    }
});

// ============================================================
// 4. RUTE INTERVENȚII & ADOPȚII (Cazurile CRUD)
// ============================================================
router.post('/interventii-medicale', animalController.addMedicalIntervention);
router.post('/istoric-adoptii', animalController.addAdoption);

// ============================================================
// 5. FINANȚE & STATISTICI (View-uri și Donații)
// ============================================================

// Donații
router.post('/donatii', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await financeRepo.adaugaDonatie(connection, req.body);
        await connection.commit();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) { try { await connection.close(); } catch (err) { console.error(err); } }
    }
});

// Predicții bugetare din View-ul Oracle
router.get('/stats/buget', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT id_adapost, nume_adapost, estimat_hrana, estimat_medical, estimat_salarii, total_luna_viitoare
             FROM v_buget_estimat_lunar`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        // Trimitem direct array-ul de rânduri
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Eroare statistici:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) { try { await connection.close(); } catch (err) { } }
    }
});

// ============================================================
// 6. GENERAL (Date pentru drop-down-uri dinamice)
// ============================================================

// LISTĂ DINAMICĂ ADĂPOSTURI (Folosită în filtre, donații, voluntari)
router.get('/adaposturi', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT id, nume FROM adaposturi ORDER BY nume`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) { try { await connection.close(); } catch (err) { console.error(err); } }
    }
});

module.exports = router;