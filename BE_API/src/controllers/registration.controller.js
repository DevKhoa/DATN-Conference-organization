const registrationService = require('../services/registration.service');

exports.create = async (req, res) => {
    try {
        // Lấy ID người dùng từ token: const userId = req.user.user_id;
        const { user_id,ticket_id } = req.body;
        const userId = user_id;
        
        const result = await registrationService.createRegistration(userId, ticket_id);
        
        res.status(201).json({
            ...result,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        if (error.message.toLowerCase().includes('found')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(400).json({ message: error.message });
    }
};

exports.exportList = async (req, res) => {
    try {
        const result = await registrationService.exportRegistrations();
        res.status(200).json({
            data: result,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};