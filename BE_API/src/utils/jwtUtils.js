const jwt = require('jsonwebtoken');

// Hàm tạo JWT token
const generateToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id, role: user.role_name },
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn: '1h' }
  );
};

// Hàm xác minh JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };