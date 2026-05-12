const oracledb = require('oracledb');
const dbConfig = require('../config/dbConfig');
const animalRepo = require('../repositories/AnimalRepository');

class AnimalService {
    async listAnimals(filters) {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            return await animalRepo.findAnimalsWithFilters(connection, filters);
        } finally {
            if (connection) await connection.close();
        }
    }

    async getFullProfile(id) {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const detalii = await animalRepo.getAnimalDetails(connection, id);
            const medical = await animalRepo.getMedicalHistory(connection, id);
            const adoptii = await animalRepo.getAdoptionHistory(connection, id);
            return { detalii, medical, adoptii };
        } finally {
            if (connection) await connection.close();
        }
    }

    async createAnimal(data) {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const id = await animalRepo.insertAnimal(connection, data);
            await connection.commit();
            return id;
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async updateAnimalInfo(id, data) {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            await animalRepo.updateAnimal(connection, id, data);
            await connection.commit();
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async addMedicalRecord(data) {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            await animalRepo.insertMedicalIntervention(connection, data);
            await connection.commit();
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async registerAdoption(data) {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            // Tranzacție: Inserăm persoana, apoi legăm adopția
            const personId = await animalRepo.insertPerson(connection, data);
            await animalRepo.insertAdoptionRecord(connection, data.id_animal, personId);
            await connection.commit();
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }
}

module.exports = new AnimalService();