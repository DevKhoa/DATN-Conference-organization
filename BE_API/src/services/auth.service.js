const userRepository = require('../repositories/user.repo');
const emailSender = require('../utils/emailService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwtUtils');

class AuthService {
  // Đăng ký user mới
  async registerUser(data) {
    const { full_name, email, password, organization } = data;
    
    // Check trùng email
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) throw new Error('Email đã tồn tại');

    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user (is_verified = false)
    const newUser = await userRepository.createUser(full_name, email, hashedPassword, organization);
    
    await userRepository.assignRole(newUser.user_id, 'ATTENDEE');

    // Tạo token xác thực
    const verificationToken = jwt.sign({ email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Gửi Email xác thực
    await emailSender.sendVerificationEmail(newUser, verificationToken);

    return { ...newUser, role: 'ATTENDEE' };
  }

  // Xác thực email
  async verifyEmail(token) {
      try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await userRepository.verifyUser(decoded.email);
          return user;
      } catch (err) {
          throw new Error('Token xác thực không hợp lệ hoặc đã hết hạn');
      }
  }

  // Đăng nhập
  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Email hoặc mật khẩu không đúng');

    // Bắt buộc xác thực email mới cho login
    if (!user.is_verified) {
        throw new Error('Vui lòng xác thực email trước khi đăng nhập');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new Error('Email hoặc mật khẩu không đúng');

    // Lấy role 
    const profile = await userRepository.getUserProfile(user.user_id);
    const roleName = (profile && profile.roles && profile.roles.length > 0) ? profile.roles[0] : 'ATTENDEE';
    
    // Object user để sign token
    const userForToken = { user_id: user.user_id, role_name: roleName };

    // Tạo Token
    const accessToken = generateToken(userForToken);
    const refreshToken = generateRefreshToken(userForToken);

    // Lưu Refresh Token vào DB
    await userRepository.saveRefreshToken(user.user_id, refreshToken);

    return { 
        user_id: user.user_id, 
        access_token: accessToken, 
        refresh_token: refreshToken,
        expires_in: 3600 
    };
  }

  // Refresh Token
  async refreshToken(token) {
      // Verify verify signature của token
      const decoded = verifyToken(token, true); // true = isRefresh
      if (!decoded) throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');

      // Kiểm tra token có tồn tại trong DB cho user đó không (Chống dùng lại token cũ nếu đã logout/đổi)
      const user = await userRepository.findUserByRefreshToken(token);
      if (!user || user.user_id !== decoded.user_id) {
          throw new Error('Refresh token không tồn tại hoặc đã bị thu hồi');
      }

      // Lấy role để tạo token mới
      const profile = await userRepository.getUserProfile(user.user_id);
      const roleName = (profile && profile.roles.length > 0) ? profile.roles[0] : 'ATTENDEE';
      const userForToken = { user_id: user.user_id, role_name: roleName };

      // Tạo cặp token mới (Rotate Refresh Token để tăng bảo mật)
      const newAccessToken = generateToken(userForToken);
      const newRefreshToken = generateRefreshToken(userForToken);

      // Cập nhật DB
      await userRepository.saveRefreshToken(user.user_id, newRefreshToken);

      return {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          expires_in: 3600
      };
  }

  // Quên mật khẩu
  async forgotPassword(email) {
      const user = await userRepository.findByEmail(email);
      if (!user) {
          return; 
      }

      // Tạo random token (không phải JWT, chỉ là chuỗi ngẫu nhiên)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // Hết hạn sau 1 giờ

      // Lưu vào DB
      await userRepository.saveResetToken(email, resetToken, expiresAt);

      // Gửi email
      await emailSender.sendResetPasswordEmail(email, resetToken);
      
      return true;
  }

  // Đặt lại mật khẩu (Reset Password)
  async resetPassword(token, newPassword) {
      const user = await userRepository.findUserByResetToken(token);
      if (!user) throw new Error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Cập nhật pass và xóa token
      await userRepository.updatePassword(user.user_id, hashedPassword);
      
      return true;
  }

  // Lấy thông tin user
  async getUserProfile(userId) {
      return await userRepository.getUserProfile(userId);
  }
  
  // Cập nhật thông tin user
  async updateUserProfile(userId, data) {
      return await userRepository.updateUserProfile(userId, data.full_name, data.organization);
  }
}

module.exports = new AuthService();