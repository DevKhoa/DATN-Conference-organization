const pool = require('../config/db');

class RegistrationRepository {
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

  async checkUserHasTicket(userId, ticketId) {
      const query = `SELECT registration_id FROM Registrations WHERE user_id = $1 AND ticket_id = $2`;
      const result = await pool.query(query, [userId, ticketId]);
      return result.rows.length > 0;
  }

  async getRegistrationById(regId) {
      const result = await pool.query('SELECT * FROM Registrations WHERE registration_id = $1', [regId]);
      return result.rows[0];
  }

  async getAllRegistrationsForExport() {
    const query = `
      SELECT r.registration_id, u.full_name, u.email, t.ticket_name, r.registration_status, r.payment_status, r.created_at
      FROM Registrations r
      JOIN Users u ON r.user_id = u.user_id
      JOIN Ticket_Configs t ON r.ticket_id = t.ticket_id
    `;
    const result = await pool.query(query);
    return result.rows;
  }

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
  
  async findByQrToken(token) {
      const query = `SELECT * FROM Registrations WHERE qr_code_token = $1`;
      const result = await pool.query(query, [token]);
      return result.rows[0];
  }

  // Lấy thông tin chi tiết để gửi mail
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
}

module.exports = new RegistrationRepository();