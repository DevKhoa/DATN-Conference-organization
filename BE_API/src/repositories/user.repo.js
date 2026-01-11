const pool = require('../config/db');

class UserRepository {
  // Tạo người dùng mới
  async createUser(fullName, email, passwordHash, organization) {
    const query = `
      INSERT INTO Users (full_name, email, password_hash, organization, is_verified)
      VALUES ($1, $2, $3, $4, FALSE)
      RETURNING *;
    `;
    const result = await pool.query(query, [fullName, email, passwordHash, organization]);
    return result.rows[0];
  }

  // Tìm người dùng theo email
  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    return result.rows[0];
  }

  // Xác thực người dùng
  async verifyUser(email) {
    const result = await pool.query(
      'UPDATE Users SET is_verified = TRUE WHERE email = $1 RETURNING *', 
      [email]
    );
    return result.rows[0];
  }

  // Gán vai trò cho người dùng
  async assignRole(userId, roleName) {
    const roleRes = await pool.query('SELECT role_id FROM Roles WHERE role_name = $1', [roleName]);
    if (roleRes.rows.length > 0) {
      const roleId = roleRes.rows[0].role_id;
      await pool.query(
        'INSERT INTO User_Roles (user_id, role_id) VALUES ($1, $2)',
        [userId, roleId]
      );
    }
  }
  
  // Lấy thông tin profile người dùng
  async getUserProfile(userId) {
     const query = 'SELECT user_id, full_name, email, organization FROM Users WHERE user_id = $1';
     const result = await pool.query(query, [userId]);
     return result.rows[0];
  }

  // Cập nhật thông tin profile người dùng
  async updateUserProfile(userId, fullName, organization) {
      // Chuẩn bị các mảng để xây dựng query động
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Kiểm tra từng trường, nếu có dữ liệu mới push vào mảng
      if (fullName !== undefined) {
          fields.push(`full_name = $${paramIndex++}`);
          values.push(fullName);
      }

      if (organization !== undefined) {
          fields.push(`organization = $${paramIndex++}`);
          values.push(organization);
      }

      // Nếu không có trường nào để update thì trả về null
      if (fields.length === 0) {
          return null; 
      }

      // Thêm userId vào tham số cuối cùng cho mệnh đề WHERE
      values.push(userId);

      // Tạo câu query hoàn chỉnh
      const query = `
          UPDATE Users 
          SET ${fields.join(', ')}
          WHERE user_id = $${paramIndex}
          RETURNING user_id, full_name, organization, email
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    }
}

module.exports = new UserRepository();