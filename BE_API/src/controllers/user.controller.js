const userRepository = require('../repositories/user.repo'); 

// Lấy thông tin profile người dùng
exports.getProfile = async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ message: 'Vui lòng cung cấp user_id trong request body' });
        }

        const profile = await userRepository.getUserProfile(user_id);
        
        if (!profile) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Format ngày tháng nếu có
        if (profile.created_at) {
            profile.created_at = new Date(profile.created_at).toISOString();
        }
        
        res.status(200).json(profile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật thông tin profile người dùng
exports.updateProfile = async (req, res) => {
    try {
        const { user_id, full_name, organization } = req.body;
        
        // Validate: Bắt buộc phải có user_id
        if (!user_id) {
             return res.status(400).json({ message: 'Vui lòng cung cấp user_id trong request body' });
        }

        // Validate: Phải có ít nhất 1 thông tin để sửa
        if (full_name === undefined && organization === undefined) {
            return res.status(400).json({ message: 'Cần cung cấp ít nhất full_name hoặc organization để cập nhật' });
        }

        const result = await userRepository.updateUserProfile(user_id, full_name, organization);
        
        // Kiểm tra kết quả
        if (!result) {
            // Nếu user_id không tồn tại hoặc logic repo trả về null
            return res.status(404).json({ message: 'Không tìm thấy user hoặc không có thay đổi nào được thực hiện' });
        }

        res.status(200).json({
            ...result,
            updated_at: new Date().toISOString(),
            message: 'Cập nhật thông tin thành công'
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};