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

// Lấy danh sách users (có lọc theo Role)
exports.getAllUsers = async (req, res) => {
    try {
        // Lấy query params: ?roles=ADMIN,REVIEWER&logic=AND
        const { roles, logic } = req.query;
        
        let rolesFilter = [];
        if (roles) {
            // Nếu roles là string (vd: "ADMIN,REVIEWER") thì split, nếu là array thì giữ nguyên
            rolesFilter = Array.isArray(roles) ? roles : roles.split(',').map(r => r.trim());
        }

        const logicFilter = logic ? logic.toUpperCase() : 'OR'; // Mặc định là OR

        const users = await userRepository.getAllUsersWithRoles(rolesFilter, logicFilter);

        res.status(200).json({
            count: users.length,
            filters: {
                roles: rolesFilter,
                logic: logicFilter
            },
            data: users
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách user' });
    }
};

// Phân quyền (Thêm quyền)
exports.addRoles = async (req, res) => {
    try {
        const userId = req.params.id;
        const { roles } = req.body; // Expect body: { "roles": ["CHAIR", "REVIEWER"] }

        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ message: 'Vui lòng cung cấp danh sách roles (mảng string)' });
        }

        const result = await userRepository.addRolesToUser(userId, roles);

        res.status(200).json({
            message: 'Phân quyền hoàn tất',
            user_id: userId,
            details: result // { added: [], existing: [], notFoundRoles: [] }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Xóa quyền
exports.removeRoles = async (req, res) => {
    try {
        const userId = req.params.id;
        const { roles } = req.body; // Expect body: { "roles": ["REVIEWER"] }

        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ message: 'Vui lòng cung cấp danh sách roles cần xóa' });
        }

        const result = await userRepository.removeRolesFromUser(userId, roles);

        res.status(200).json({
            message: 'Xóa quyền hoàn tất',
            user_id: userId,
            result: result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};