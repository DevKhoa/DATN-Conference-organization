const notificationService = require('../services/notificationService');

// POST /notifications/send-bulk
exports.sendBulk = async (req, res) => {
    try {
        const { template_code, target_group, conference_id, extra_variables, variable_mapping } = req.body;
        // ... validate cơ bản ...

        const result = await notificationService.sendBulkEmail({
            template_code,
            target_group,
            conference_id,
            extra_variables,
            variable_mapping // <--- Truyền xuống service
        });

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};