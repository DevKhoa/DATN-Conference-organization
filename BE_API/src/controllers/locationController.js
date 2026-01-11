const locationService = require('../services/locationService');

// GET /locations
exports.getLocations = async (req, res) => {
    try {
        const locations = await locationService.getAllLocations();
        // 200 OK: Request thành công
        return res.status(200).json(locations);
    } catch (err) {
        console.error('Lỗi Get Locations:', err.message);
        // 500 Internal Server Error
        return res.status(500).json({ message: 'Lỗi hệ thống, vui lòng thử lại sau.' });
    }
};

// POST /locations
exports.createLocation = async (req, res) => {
    try {
        // Lấy thêm address, description, image_url từ body
        const { location_name, capacity, address, description, image_url } = req.body;
        
        // Validate cơ bản (Chỉ bắt buộc tên và sức chứa, mấy cái kia có thể null)
        if (!location_name || !capacity) {
            return res.status(400).json({ message: 'Thiếu tên hoặc sức chứa' });
        }

        const newLocation = await locationService.createLocation({ 
            location_name, capacity, address, description, image_url 
        });
        
        return res.status(201).json(newLocation);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};