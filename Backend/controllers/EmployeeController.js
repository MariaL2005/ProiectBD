const employeeService = require('../services/EmployeeService');

class EmployeeController {
    async getLanguages(req, res) {
        try {
            const limbi = await employeeService.getAvailableLanguages();
            res.json(limbi);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async createEmployee(req, res) {
        try {
            const result = await employeeService.registerFullEmployee(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: 'Eroare pe server: ' + error.message });
        }
    }

    async getExchangeOpportunities(req, res) {
        try {
            const matches = await employeeService.findExchangeMatches(req.params.id);
            if (matches.length > 0) {
                res.json({ success: true, matches });
            } else {
                res.json({ success: false, message: "Nu s-au găsit parteneri compatibili sau vechimea este sub 6 luni." });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message, message: "Eroare SQL: " + error.message });
        }
    }
}

module.exports = new EmployeeController();