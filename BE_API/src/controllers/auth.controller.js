const authService = require('../services/auth.service');

// Đăng ký người dùng
exports.register = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    
    // Đảm bảo Time format chuẩn ISO 8601
    const createdAtISO = result.created_at ? new Date(result.created_at).toISOString() : new Date().toISOString();
    
    // 201 Created – Tạo mới thành công
    res.status(201).json({
        user_id: result.user_id,
        email: result.email,
        role: result.role,
        created_at: createdAtISO, 
        message: "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."
    });
  } catch (error) {
    // 400 Bad Request – Dữ liệu không hợp lệ
    res.status(400).json({ message: error.message });
  }
};

// Đăng nhập người dùng
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    // 200 OK – Thành công (Trả về kèm Token)
    res.status(200).json(result);
  } catch (error) {
    // 401 Unauthorized - Sai thông tin đăng nhập
    res.status(401).json({ message: error.message });
  }
};

// Xác thực email người dùng
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        await authService.verifyEmail(token);
        
        // 200 OK - Xác thực thành công
        res.status(200).json({ 
            message: "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ." 
        });
    } catch (error) {
        // 400 Bad Request - Link lỗi hoặc hết hạn
        res.status(400).json({ 
            message: "Link xác thực không hợp lệ hoặc đã hết hạn." 
        });
    }
};