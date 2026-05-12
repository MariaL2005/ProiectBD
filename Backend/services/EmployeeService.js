const oracledb = require('oracledb');
const dbConfig = require('../config/dbConfig');
const employeeRepo = require('../repositories/EmployeeRepository');

class EmployeeService {
    async getAvailableLanguages() {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            return await employeeRepo.getAllLanguages(connection);
        } finally {
            if (connection) await connection.close();
        }
    }

    async registerFullEmployee(data) {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);

            // Generăm salariul de business
            const salariuRandom = Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
            data.salariu = salariuRandom;

            // 1. Inserare Angajat
            const empId = await employeeRepo.insertEmployee(connection, data);

            // 2. Inserare Specializări
            if (data.specializari && Array.isArray(data.specializari)) {
                for (const specie of data.specializari) {
                    await employeeRepo.insertSpecialization(connection, empId, specie);
                }
            }

            // 3. Inserare Limbi Standard
            if (data.limbi && Array.isArray(data.limbi)) {
                for (const numeL of data.limbi) {
                    const langId = await employeeRepo.findLanguageByName(connection, numeL);
                    if (langId) await employeeRepo.insertEmployeeLanguage(connection, empId, langId);
                }
            }

            // 4. Inserare Limbă Nouă ("Other")
            if (data.limba_noua && data.limba_noua.trim() !== '') {
                const numeNou = data.limba_noua.trim();
                let langId = await employeeRepo.findLanguageByName(connection, numeNou);
                if (!langId) {
                    langId = await employeeRepo.insertLanguage(connection, numeNou);
                }
                try {
                    await employeeRepo.insertEmployeeLanguage(connection, empId, langId);
                } catch (e) { /* Ignorăm duplicatele */ }
            }

            await connection.commit();
            return { success: true, id: empId, salariuAlocat: salariuRandom };
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async findExchangeMatches(empId) {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            return await employeeRepo.callExchangeOpportunitiesProcedure(connection, empId);
        } finally {
            if (connection) await connection.close();
        }
    }
}

module.exports = new EmployeeService();