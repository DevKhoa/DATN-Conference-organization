const jwt = require('jsonwebtoken');

// Hàm tạo Access Token (ngắn hạn: 1h)
const generateToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id, role: user.role_name },
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn: '1h' }
  );
};

// Hàm tạo Refresh Token (dài hạn: 7 ngày)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id },
    process.env.JWT_REFRESH_SECRET || 'refresh_secret_key', // Nên dùng biến môi trường riêng
    { expiresIn: '7d' }
  );
};

// Hàm xác minh JWT token
const verifyToken = (token, isRefresh = false) => {
  try {
    const secret = isRefresh 
      ? (process.env.JWT_REFRESH_SECRET || 'refresh_secret_key') 
      : (process.env.JWT_SECRET || 'secret_key');
      
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, generateRefreshToken, verifyToken };