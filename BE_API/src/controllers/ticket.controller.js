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
        if (error.message.toLowerCase().includes('found') || error.message.includes('tồn tại')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(400).json({ message: error.message });
    }
};

// Xóa loại vé
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await ticketService.deleteTicket(id);
        res.status(200).json(result);
    } catch (error) {
        if (error.message.includes('tồn tại')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(400).json({ message: error.message });
    }
};

// Lấy danh sách loại vé
exports.getList = async (req, res) => {
    try {
        const { conference_id } = req.query; // Có thể lọc theo conference_id nếu muốn
        const result = await ticketService.getList(conference_id);
        res.status(200).json({
            count: result.length,
            data: result
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};