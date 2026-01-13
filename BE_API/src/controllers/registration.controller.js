const registrationService = require('../services/registration.service');

//Đang ký tham gia hội nghị
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

//Xuất danh sách đăng ký tham gia hội nghị
exports.getList = async (req, res) => {
    try {
        // Lấy tham số từ Query String (URL)
        const { conference_id, payment_status } = req.query;
        
        const result = await registrationService.getRegistrationList(conference_id, payment_status);
        
        res.status(200).json({
            message: "Lấy danh sách đăng ký thành công",
            data: result,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Xuất danh sách đăng ký (Lưu file và trả về Link)
exports.exportList = async (req, res) => {
    try {
        const { conference_id, type, payment_status } = req.query;

        if (!conference_id) {
            return res.status(400).json({ message: "Vui lòng cung cấp conference_id" });
        }

        const cleanType = type ? type.toLowerCase() : '';
        if (!['excel', 'pdf'].includes(cleanType)) {
            return res.status(400).json({ message: "Vui lòng chọn loại file: 'excel' hoặc 'pdf'" });
        }
        
        // Gọi service để tạo file và lấy đường dẫn
        const fileUrl = await registrationService.exportRegistrations(conference_id, cleanType, payment_status);
        
        // Trả về JSON theo đúng mẫu yêu cầu
        res.status(200).json({
            export_format: cleanType.toUpperCase(), // EXCEL hoặc PDF
            file_url: fileUrl,                      // vd: /exports/registrations_conf_1_123456.xlsx
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: error.message });
    }
};