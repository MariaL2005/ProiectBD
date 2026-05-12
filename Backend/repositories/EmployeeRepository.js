const oracledb = require('oracledb');

class EmployeeRepository {
    async getAllLanguages(connection) {
        const result = await connection.execute(`SELECT nume FROM limbi ORDER BY nume ASC`);
        return result.rows.map(row => row[0]);
    }

    async findLanguageByName(connection, name) {
        const result = await connection.execute(
            `SELECT id FROM limbi WHERE UPPER(nume) = UPPER(:n)`,
            { n: name }
        );
        return result.rows.length > 0 ? result.rows[0][0] : null;
    }

    async insertLanguage(connection, name) {
        const result = await connection.execute(
            `INSERT INTO limbi (nume) VALUES (:n) RETURNING id INTO :out_id`,
            { n: name, out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } }
        );
        return result.outBinds.out_id[0];
    }

    async insertEmployee(connection, employeeData) {
        const sql = `
            INSERT INTO angajati (id_adapost, nume, prenume, telefon, functie, salariu)
            VALUES (:id_adapost, :nume, :prenume, :telefon, :functie, :salariu)
            RETURNING id INTO :out_id
        `;
        const result = await connection.execute(sql, {
            id_adapost: Number(employeeData.id_adapost),
            nume: employeeData.nume,
            prenume: employeeData.prenume,
            telefon: employeeData.telefon,
            functie: employeeData.roleType,
            salariu: employeeData.salariu,
            out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });
        return result.outBinds.out_id[0];
    }

    async insertSpecialization(connection, empId, specie) {
        await connection.execute(
            `INSERT INTO specializari_angajati (id_angajat, specie) VALUES (:id, :sp)`,
            { id: empId, sp: specie }
        );
    }

    async insertEmployeeLanguage(connection, empId, langId) {
        await connection.execute(
            `INSERT INTO limbi_angajati (id_angajat, id_limba) VALUES (:a, :l)`,
            { a: empId, l: langId }
        );
    }

    async callExchangeOpportunitiesProcedure(connection, empId) {
        const result = await connection.execute(
            `BEGIN get_exchange_opportunities(:id, :cursor); END;`,
            {
                id: empId,
                cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const resultSet = result.outBinds.cursor;
        const matches = await resultSet.getRows();
        await resultSet.close();
        return matches;
    }
}

module.exports = new EmployeeRepository();