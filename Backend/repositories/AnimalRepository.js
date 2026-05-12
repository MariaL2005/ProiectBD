const oracledb = require('oracledb');

class AnimalRepository {
    async findAnimalsWithFilters(connection, filters) {
        let sql = `SELECT a.*, c.id_adapost FROM animale a JOIN custi c ON a.id_cusca = c.id WHERE 1=1`;
        const binds = {};

        if (filters.rasa) { sql += ` AND a.rasa = :rasa`; binds.rasa = filters.rasa; }
        if (filters.id_adapost) { sql += ` AND c.id_adapost = :id_adapost`; binds.id_adapost = filters.id_adapost; }
        if (filters.status) { sql += ` AND a.status = :status`; binds.status = filters.status; }

        const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows;
    }

    async getAnimalDetails(connection, id) {
        const info = await connection.execute(
            `SELECT a.*, ad.nume as nume_adapost FROM animale a 
             JOIN custi c ON a.id_cusca = c.id 
             JOIN adaposturi ad ON c.id_adapost = ad.id WHERE a.id = :id`,
            [id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return info.rows[0];
    }

    async getMedicalHistory(connection, id) {
        const result = await connection.execute(
            `SELECT * FROM interventii_medicale WHERE id_animal = :id ORDER BY data_interventie DESC`,
            [id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows;
    }

    async getAdoptionHistory(connection, id) {
        const result = await connection.execute(
            `SELECT h.*, p.nume || ' ' || p.prenume as nume_persoana FROM istoric_adoptii h 
             JOIN persoane p ON h.id_persoana = p.id WHERE h.id_animal = :id ORDER BY data_adoptie DESC`,
            [id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows;
    }

    async insertAnimal(connection, data) {
        const sql = `INSERT INTO animale (id_cusca, nume, specie, rasa, data_nastere, descriere) 
                     VALUES (:id_cusca, :nume, :specie, :rasa, TO_DATE(:data_nastere, 'YYYY-MM-DD'), :descriere) 
                     RETURNING id INTO :id`;
        const result = await connection.execute(sql, {
            id_cusca: data.id_cusca, nume: data.nume, specie: data.specie, rasa: data.rasa,
            data_nastere: data.data_nastere, descriere: data.descriere,
            id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });
        return result.outBinds.id[0];
    }

    async updateAnimal(connection, id, data) {
        await connection.execute(
            `UPDATE animale SET specie = :specie, rasa = :rasa, descriere = :descriere WHERE id = :id`,
            { specie: data.specie, rasa: data.rasa, descriere: data.descriere, id }
        );
    }

    async insertMedicalIntervention(connection, data) {
        await connection.execute(
            `INSERT INTO interventii_medicale (id_animal, tipul, descriere, cost, data_interventie)
             VALUES (:id_animal, :tipul, :descriere, :cost, SYSDATE)`,
            { id_animal: data.id_animal, tipul: data.tipul, descriere: data.descriere, cost: data.cost }
        );
    }

    async insertPerson(connection, data) {
        const result = await connection.execute(
            `INSERT INTO persoane (nume, prenume, telefon, email) VALUES (:nume, :prenume, :telefon, :email) RETURNING id INTO :out_id`,
            { nume: data.nume, prenume: data.prenume, telefon: data.telefon, email: data.email, out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } }
        );
        return result.outBinds.out_id[0];
    }

    async insertAdoptionRecord(connection, animalId, personId) {
        await connection.execute(
            `INSERT INTO istoric_adoptii (id_animal, id_persoana, data_adoptie) VALUES (:id_animal, :id_persoana, SYSDATE)`,
            { id_animal: animalId, id_persoana: personId }
        );
    }
}

module.exports = new AnimalRepository();