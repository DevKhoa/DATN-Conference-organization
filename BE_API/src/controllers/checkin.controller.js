const checkinService = require('../services/checkin.service');

// Tạo mã QR cho đăng ký
exports.generateQr = async (req, res) => {
    try {
        const { registration_id } = req.body;
        const result = await checkinService.generateQrCode(registration_id);
        res.status(200).json({
            ...result,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        if (error.message.toLowerCase().includes('found')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(400).json({ message: error.message });
    }
};

// Xác minh mã QR và check-in
exports.verifyQr = async (req, res) => {
    try {
        const { qr_code_token } = req.body;
        const result = await checkinService.verifyCheckin(qr_code_token);
        
        res.status(200).json({
            ...result,
            verified_at: new Date().toISOString()
        });
    } catch (error) {
        // Trả về 400 Bad Request cho QR không hợp lệ
        res.status(400).json({ 
            valid: false, 
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};