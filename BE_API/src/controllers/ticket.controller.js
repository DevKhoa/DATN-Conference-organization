const ticketService = require('../services/ticket.service');

//Tạo loại vé mới
exports.createType = async (req, res) => {
    try {
        const result = await ticketService.createTicketType(req.body);
        res.status(201).json({
            ...result,
            is_active: true,
            created_at: result.created_at ? new Date(result.created_at).toISOString() : new Date().toISOString()
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

//Cập nhật cấu hình loại vé
exports.updateSettings = async (req, res) => {
    try {
        const { ticket_id, ...settings } = req.body;
        const result = await ticketService.updateTicketSettings(ticket_id, settings);
        res.status(200).json({
            ...result,
            updated_at: new Date().toISOString()
        });
    } catch (error) {
        // Kiểm tra nếu lỗi là do không tìm thấy ticket để trả về 404
        if (error.message.toLowerCase().includes('found')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(400).json({ message: error.message });
    }
};