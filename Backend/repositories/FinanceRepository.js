// Backend/repositories/FinanceRepository.js
const oracledb = require('oracledb');

class FinanceRepository {
    async adaugaDonatie(connection, dateDonatie) {
        // Apelăm procedura din pachetul creat anterior!
        const sql = `
            BEGIN 
                PKG_MANAGEMENT_FINANCIAR.inregistreaza_donatie(:idAdapost, :suma, :descriere); 
            END;
        `;

        await connection.execute(sql, {
            idAdapost: parseInt(dateDonatie.idAdapost),
            suma: parseFloat(dateDonatie.suma),
            descriere: dateDonatie.descriere || 'Donație anonimă'
        });

        return { success: true, message: 'Donația a fost procesată și înregistrată cu succes!' };
    }
}

module.exports = new FinanceRepository();