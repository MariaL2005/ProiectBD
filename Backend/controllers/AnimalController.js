const animalService = require('../services/AnimalService');

class AnimalController {
    async getAnimals(req, res) {
        try {
            const animals = await animalService.listAnimals(req.query);
            res.json(animals);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getProfile(req, res) {
        try {
            const profile = await animalService.getFullProfile(req.params.id);
            res.json(profile);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async addAnimal(req, res) {
        try {
            const id = await animalService.createAnimal(req.body);
            res.status(201).json({ success: true, id });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateAnimal(req, res) {
        try {
            await animalService.updateAnimalInfo(req.params.id, req.body);
            res.json({ success: true, message: "Animal updated" });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async addMedicalIntervention(req, res) {
        try {
            await animalService.addMedicalRecord(req.body);
            res.status(201).json({ success: true, message: "Intervenție salvată!" });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async addAdoption(req, res) {
        try {
            await animalService.registerAdoption(req.body);
            res.status(201).json({ success: true, message: "Adopție înregistrată cu succes!" });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new AnimalController();