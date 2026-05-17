const oracledb = require('oracledb');
const dbConfig = require('../config/dbConfig');
const financeRepo = require('../repositories/FinanceRepository');

const express = require('express');
const router = express.Router();

const empController = require('../controllers/EmployeeController');
const animalController = require('../controllers/AnimalController');

// --- Rute Angajați / Limbi / Schimburi ---
router.get('/limbi', empController.getLanguages);
router.post('/angajati', empController.createEmployee);
router.get('/schimb-experienta/:id', empController.getExchangeOpportunities);

// --- Rute Animale ---
router.get('/animale', animalController.getAnimals);
router.get('/animale/:id', animalController.getProfile);
router.post('/animale', animalController.addAnimal);
router.put('/animale/:id', animalController.updateAnimal);

// --- Rute Intervenții / Adopții ---
router.post('/interventii-medicale', animalController.addMedicalIntervention);
router.post('/istoric-adoptii', animalController.addAdoption);

// RUTA PENTRU STATISTICI / PREDICȚII BUGETARE
router.get('/stats/buget', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        // Interogăm direct View-ul complex din baza de date folosind SQL brut
        const result = await connection.execute(
            `SELECT id_adapost, nume_adapost, estimat_hrana, estimat_medical, estimat_salarii, total_luna_viitoare 
             FROM v_buget_estimat_lunar`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT } // Returnează rândurile sub formă de obiecte convenabile { NUME_COLOANA: valoare }
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Eroare la obținerea predicțiilor bugetare:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// RUTA PENTRU ADMISIA INTELIGENTĂ A UNUI ANIMAL
const animalRepo = require('../repositories/AnimalRepository'); // Asigură-te că e importat

router.post('/animale/admisie', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const result = await animalRepo.admisieAnimalInteligenta(connection, req.body);

        await connection.commit(); // Confirmăm tranzacția dacă nu au fost erori
        res.status(200).json(result);
    } catch (error) {
        console.error("Eroare la admisie:", error.message);
        // Trimitem eroarea prinsă din PL/SQL înapoi la Frontend cu status 400 (Bad Request)
        res.status(400).json({ success: false, message: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (err) { console.error(err); }
        }
    }
});

// RUTA PENTRU DONATII
router.post('/donatii', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await financeRepo.adaugaDonatie(connection, req.body);

        // Confirmăm modificările în baza de date
        await connection.commit();
        res.status(200).json(result);
    } catch (error) {
        console.error("Eroare la procesarea donației:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

module.exports = router;