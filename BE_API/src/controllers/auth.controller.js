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

// Refresh Token
exports.refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(400).json({ message: "Vui lòng cung cấp refresh token" });
        }
        
        const result = await authService.refreshToken(refresh_token);
        res.status(200).json(result);
    } catch (error) {
        // 403 Forbidden hoặc 401 Unauthorized tùy ngữ cảnh, ở đây dùng 403 cho token không hợp lệ
        res.status(403).json({ message: error.message });
    }
};

// Quên mật khẩu
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Vui lòng cung cấp email" });
        }

        await authService.forgotPassword(email);
        
        res.status(200).json({ 
            message: "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu." 
        });
    } catch (error) {
        res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý yêu cầu." });
    }
};

// Đặt lại mật khẩu
exports.resetPassword = async (req, res) => {
    try {
        const { token, new_password } = req.body;
        if (!token || !new_password) {
            return res.status(400).json({ message: "Thiếu thông tin token hoặc mật khẩu mới" });
        }

        await authService.resetPassword(token, new_password);
        res.status(200).json({ message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
