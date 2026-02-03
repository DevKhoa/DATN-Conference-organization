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
  
  // Lấy thông tin profile người dùng
  async getUserProfile(userId) {
     const query = `
        SELECT u.user_id, u.full_name, u.email, u.organization, 
               COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') as roles
        FROM Users u
        LEFT JOIN User_Roles ur ON u.user_id = ur.user_id
        LEFT JOIN Roles r ON ur.role_id = r.role_id
        WHERE u.user_id = $1
        GROUP BY u.user_id
     `;
     const result = await pool.query(query, [userId]);
     return result.rows[0];
  }

  // Cập nhật thông tin profile người dùng
  async updateUserProfile(userId, fullName, organization) {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (fullName !== undefined) {
          fields.push(`full_name = $${paramIndex++}`);
          values.push(fullName);
      }

      if (organization !== undefined) {
          fields.push(`organization = $${paramIndex++}`);
          values.push(organization);
      }

      if (fields.length === 0) {
          return null; 
      }

      values.push(userId);

      const query = `
          UPDATE Users 
          SET ${fields.join(', ')}
          WHERE user_id = $${paramIndex}
          RETURNING user_id, full_name, organization, email
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
  }

  /**
   * Lấy danh sách users với filter roles
   * @param {string[]} roles - Mảng các role name cần lọc
   * @param {string} logic - 'AND' (phải có tất cả) hoặc 'OR' (chỉ cần có 1 trong các role)
   */
  async getAllUsersWithRoles(rolesFilter = [], logic = 'OR') {
    let havingClause = '';
    const params = [];
    
    // Gom nhóm user và array_agg roles lại
    let baseQuery = `
        SELECT u.user_id, u.full_name, u.email, u.organization, u.is_verified, u.is_active,
               COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') as roles
        FROM Users u
        LEFT JOIN User_Roles ur ON u.user_id = ur.user_id
        LEFT JOIN Roles r ON ur.role_id = r.role_id
        GROUP BY u.user_id
    `;

    // Nếu có lọc theo Role
    if (rolesFilter && rolesFilter.length > 0) {
        params.push(rolesFilter);
        // Postgres Array Operators: 
        // @> : Contains (AND logic)
        // && : Overlap (OR logic)
        if (logic.toUpperCase() === 'AND') {
            havingClause = ` HAVING array_agg(r.role_name)::text[] @> $1 `;
        } else {
            // Mặc định là OR
            havingClause = ` HAVING array_agg(r.role_name)::text[] && $1 `;
        }
    }

    const finalQuery = baseQuery + havingClause + ' ORDER BY u.user_id ASC';
    const result = await pool.query(finalQuery, params);
    return result.rows;
  }

  // Thêm roles cho user
  async addRolesToUser(userId, roleNames) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lấy tất cả Role ID tương ứng với roleNames input
        const roleRes = await client.query(
            'SELECT role_id, role_name FROM Roles WHERE role_name = ANY($1)',
            [roleNames]
        );
        const validRoles = roleRes.rows; // Danh sách role hợp lệ tìm thấy trong DB

        // Lấy các role hiện tại của user
        const currentRolesRes = await client.query(
            'SELECT role_id FROM User_Roles WHERE user_id = $1',
            [userId]
        );
        const currentRoleIds = currentRolesRes.rows.map(r => r.role_id);

        const addedRoles = [];
        const existingRoles = [];

        // Duyệt và insert nếu chưa có
        for (const role of validRoles) {
            if (currentRoleIds.includes(role.role_id)) {
                existingRoles.push(role.role_name);
            } else {
                await client.query(
                    'INSERT INTO User_Roles (user_id, role_id) VALUES ($1, $2)',
                    [userId, role.role_id]
                );
                addedRoles.push(role.role_name);
            }
        }

        await client.query('COMMIT');
        
        return {
            added: addedRoles,
            existing: existingRoles,
            notFoundRoles: roleNames.filter(r => !validRoles.find(vr => vr.role_name === r)) // Role user gửi lên mà DB không có
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
  }

  // Xóa roles của user. Nếu xóa hết thì gán mặc định 'ATTENDEE'
  async removeRolesFromUser(userId, roleNamesToRemove) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Tìm id của các role cần xóa
        const roleRes = await client.query(
            'SELECT role_id FROM Roles WHERE role_name = ANY($1)', 
            [roleNamesToRemove]
        );
        const roleIdsToRemove = roleRes.rows.map(r => r.role_id);

        if (roleIdsToRemove.length > 0) {
            // Thực hiện xóa
            await client.query(
                'DELETE FROM User_Roles WHERE user_id = $1 AND role_id = ANY($2)',
                [userId, roleIdsToRemove]
            );
        }

        // Kiểm tra số lượng role còn lại
        const countRes = await client.query(
            'SELECT COUNT(*) as count FROM User_Roles WHERE user_id = $1',
            [userId]
        );
        const remainingCount = parseInt(countRes.rows[0].count);

        let actionTaken = 'REMOVED_ONLY';

        // Nếu không còn role nào, gán lại ATTENDEE
        if (remainingCount === 0) {
            // Lấy ID của role ATTENDEE
            const attendeeRes = await client.query("SELECT role_id FROM Roles WHERE role_name = 'ATTENDEE'");
            if (attendeeRes.rows.length > 0) {
                const attendeeId = attendeeRes.rows[0].role_id;
                await client.query(
                    'INSERT INTO User_Roles (user_id, role_id) VALUES ($1, $2)',
                    [userId, attendeeId]
                );
                actionTaken = 'REMOVED_AND_SET_DEFAULT_ATTENDEE';
            }
        }

        await client.query('COMMIT');
        return {
            removed: roleNamesToRemove,
            status: actionTaken
        };

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
  }

  // Lưu Refresh Token cho user
  async saveRefreshToken(userId, token) {
      await pool.query(
          'UPDATE Users SET refresh_token = $1 WHERE user_id = $2', 
          [token, userId]
      );
  }

  // Tìm user theo Refresh Token
  async findUserByRefreshToken(token) {
      const result = await pool.query('SELECT * FROM Users WHERE refresh_token = $1', [token]);
      return result.rows[0];
  }

  // Lưu token đặt lại mật khẩu
  async saveResetToken(email, token, expiresAt) {
      const result = await pool.query(
          'UPDATE Users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3 RETURNING *',
          [token, expiresAt, email]
      );
      return result.rows[0];
  }

  // Tìm user theo token đặt lại mật khẩu
  async findUserByResetToken(token) {
      const result = await pool.query(
          'SELECT * FROM Users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
          [token]
      );
      return result.rows[0];
  }

  // Cập nhật mật khẩu mới cho user
  async updatePassword(userId, passwordHash) {
      await pool.query(
          'UPDATE Users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE user_id = $2',
          [passwordHash, userId]
      );
  }
}

module.exports = new UserRepository();