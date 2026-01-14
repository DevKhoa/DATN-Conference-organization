const emailService = require('../services/emailService');

// POST /emails/templates
exports.createTemplate = async (req, res) => {
    try {
        // Frontend gửi lên: template_code, subject, body_content
        const { template_code, subject, body_content } = req.body;
        
        if (!template_code || !subject || !body_content) {
            return res.status(400).json({ message: 'Thiếu thông tin template' });
        }

        const result = await emailService.createTemplate({ 
            template_code, subject, body_content 
        });
        
        res.status(201).json(result);
    } catch (err) {
        // Lỗi trùng tên template (Unique constraint)
        if (err.code === '23505') return res.status(400).json({ message: 'Mã template (template_name) đã tồn tại' });
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// GET /emails/templates
exports.getTemplates = async (req, res) => {
    try {
        const result = await emailService.getAllTemplates();
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /emails/send
exports.sendEmail = async (req, res) => {
    try {
        const { template_code, recipient_email, variables } = req.body;

        if (!recipient_email || !template_code) {
            return res.status(400).json({ message: 'Thiếu email nhận hoặc mã template' });
        }

        const result = await emailService.sendEmail({
            template_code, recipient_email, variables
        });

        res.status(200).json({ message: 'Gửi email thành công (Mock)', data: result });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi gửi email: ' + err.message });
    }
};

// GET /emails/logs
exports.getLogs = async (req, res) => {
    try {
        const result = await emailService.getLogs();
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};