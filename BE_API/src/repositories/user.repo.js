const pool = require('../config/db');

class UserRepository {
  async createUser(fullName, email, passwordHash, organization) {
    const query = `
      INSERT INTO Users (full_name, email, password_hash, organization, is_verified)
      VALUES ($1, $2, $3, $4, FALSE)
      RETURNING *;
    `;
    const result = await pool.query(query, [fullName, email, passwordHash, organization]);
    return result.rows[0];
  }

  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    return result.rows[0];
  }

  async verifyUser(email) {
    const result = await pool.query(
      'UPDATE Users SET is_verified = TRUE WHERE email = $1 RETURNING *', 
      [email]
    );
    return result.rows[0];
  }

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
  
  async getUserProfile(userId) {
     const query = 'SELECT user_id, full_name, email, organization FROM Users WHERE user_id = $1';
     const result = await pool.query(query, [userId]);
     return result.rows[0];
  }

  async updateUserProfile(userId, fullName, organization) {
     const query = `
        UPDATE Users 
        SET full_name = $1, organization = $2
        WHERE user_id = $3
        RETURNING user_id, full_name, organization, email
     `;
     const result = await pool.query(query, [fullName, organization, userId]);
     return result.rows[0];
  }
}

module.exports = new UserRepository();