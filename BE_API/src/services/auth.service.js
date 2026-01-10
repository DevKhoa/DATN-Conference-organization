const userRepository = require('../repositories/user.repo');
const emailSender = require('../utils/emailService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

    // Tạo Token đăng nhập
    const token = jwt.sign(
        { user_id: user.user_id, role: 'ATTENDEE' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
    );

    return { user_id: user.user_id, access_token: token, expires_in: 3600 };
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