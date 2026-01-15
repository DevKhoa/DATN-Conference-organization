const pool = require('../config/db');

class RegistrationRepository {
  // Tạo đăng ký mới
  async createRegistration(userId, ticketId, paperId = null, client = null) {
    const query = `
      INSERT INTO Registrations (user_id, ticket_id, paper_id, registration_status, payment_status)
      VALUES ($1, $2, $3, 'PENDING', 'UNPAID')
      RETURNING registration_id, user_id, ticket_id, registration_status, payment_status, created_at;
    `;
    // Nếu có client (transaction) thì dùng client, không thì dùng pool thường
    const executor = client || pool; 
    const result = await executor.query(query, [userId, ticketId, paperId]);
    return result.rows[0];
  }

  // Kiểm tra người dùng đã có vé chưa
  async checkUserHasTicket(userId, ticketId) {
      const query = `SELECT registration_id FROM Registrations WHERE user_id = $1 AND ticket_id = $2`;
      const result = await pool.query(query, [userId, ticketId]);
      return result.rows.length > 0;
  }

  // Lấy thông tin đăng ký theo ID
  async getRegistrationById(regId, client = null) {
      const query = 'SELECT * FROM Registrations WHERE registration_id = $1';
      const executor = client || pool;
      const result = await executor.query(query, [regId]);
      return result.rows[0];
  }

  // Lấy danh sách đăng ký theo hội nghị và trạng thái thanh toán
  async getRegistrationsByConference(conferenceId, paymentStatus = null) {
    let query = `
      SELECT 
        r.registration_id, 
        u.full_name, 
        u.email, 
        t.ticket_name, 
        r.registration_status, 
        r.payment_status, 
        r.created_at
      FROM Registrations r
      JOIN Users u ON r.user_id = u.user_id
      JOIN Ticket_Configs t ON r.ticket_id = t.ticket_id
      WHERE t.conference_id = $1
    `;
    
    const params = [conferenceId];

    // Nếu có truyền paymentStatus thì thêm điều kiện lọc
    if (paymentStatus) {
        query += ` AND r.payment_status = $2`;
        params.push(paymentStatus);
    }

    // Sắp xếp mới nhất lên đầu
    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Cập nhật mã QR cho đăng ký
  async updateQrToken(registrationId, token) {
    const query = `
      UPDATE Registrations
      SET qr_code_token = $1
      WHERE registration_id = $2
      RETURNING registration_id, qr_code_token;
    `;
    const result = await pool.query(query, [token, registrationId]);
    return result.rows[0];
  }
  
  // Tìm đăng ký theo mã QR
  async findByQrToken(token) {
      const query = `SELECT * FROM Registrations WHERE qr_code_token = $1`;
      const result = await pool.query(query, [token]);
      return result.rows[0];
  }

  // Lấy thông tin đăng ký kèm chi tiết hội nghị
  async getRegistrationWithConferenceDetails(registrationId) {
    const query = `
      SELECT 
        r.registration_id, r.qr_code_token, r.payment_status,
        u.email, u.full_name,
        t.ticket_name,
        c.conf_name, c.start_date, c.end_date, c.location
      FROM Registrations r
      JOIN Users u ON r.user_id = u.user_id
      JOIN Ticket_Configs t ON r.ticket_id = t.ticket_id
      JOIN Conferences c ON t.conference_id = c.conf_id
      WHERE r.registration_id = $1
    `;
    const result = await pool.query(query, [registrationId]);
    return result.rows[0];
  }
  
  // Các hàm phục vụ cho check-in

  // Cập nhật trạng thái check-in
  async updateCheckinStatus(registrationId) {
    const query = `
      UPDATE Registrations
      SET checkin_status = 'CHECKED_IN', checked_in_at = NOW()
      WHERE registration_id = $1
      RETURNING registration_id, checkin_status, checked_in_at;
    `;
    const result = await pool.query(query, [registrationId]);
    return result.rows[0];
  }

  // Lấy trạng thái check-in
  async getCheckinStatus(registrationId) {
      const query = 'SELECT checkin_status, checked_in_at FROM Registrations WHERE registration_id = $1';
      const result = await pool.query(query, [registrationId]);
      return result.rows[0];
  }

  // Cập nhật trạng thái Registration (Dùng để Cancel)
  async updateStatus(registrationId, newStatus, client = null) {
    const query = `
      UPDATE Registrations
      SET registration_status = $1
      WHERE registration_id = $2
      RETURNING registration_id, registration_status;
    `;
    const executor = client || pool;
    const result = await executor.query(query, [newStatus, registrationId]);
    return result.rows[0];
  }
}

module.exports = new RegistrationRepository();