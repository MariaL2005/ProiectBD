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

module.exports = router;