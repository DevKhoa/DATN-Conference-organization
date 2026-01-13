const pool = require('../config/db');

class TicketRepository {
  // Tạo loại vé mới
  async createTicketType(ticketData) {
    // Lấy đúng field từ service đã xử lý
    const { conf_id, ticket_name, price_vnd, price_usd, quantity_limit, open_time, close_time } = ticketData;
    
    const query = `
      INSERT INTO Ticket_Configs (conference_id, ticket_name, price_vnd, price_usd, quantity_limit, open_time, close_time, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING ticket_id, ticket_name, price_vnd, price_usd, quantity_limit, open_time, close_time; 
    `;
    const values = [conf_id, ticket_name, price_vnd, price_usd, quantity_limit, open_time, close_time];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Tìm vé trùng tên đang hoạt động trong cùng hội nghị
  async findActiveDuplicate(confId, ticketName) {
    const query = `
        SELECT ticket_id 
        FROM Ticket_Configs 
        WHERE conference_id = $1 
        AND LOWER(ticket_name) = LOWER($2) 
        AND close_time > NOW()
    `;

    const result = await pool.query(query, [confId, ticketName]);
    return result.rows[0];
  }

  // Cập nhật cấu hình vé
  async updateTicketSettings(ticketId, settings) {
    // Service sẽ đảm bảo truyền đủ price_vnd và price_usd
    const { open_time, close_time, quantity_limit, is_active, price_vnd, price_usd } = settings;
    
    const query = `
      UPDATE Ticket_Configs
      SET open_time = $1, 
          close_time = $2, 
          quantity_limit = $3, 
          is_active = $4,
          price_vnd = $5,
          price_usd = $6
      WHERE ticket_id = $7
      RETURNING ticket_id, open_time, close_time, quantity_limit, is_active, price_vnd, price_usd;
    `;
    const result = await pool.query(query, [open_time, close_time, quantity_limit, is_active, price_vnd, price_usd, ticketId]);
    return result.rows[0];
  }

  // Lấy thông tin vé theo ID
  async getTicketById(ticketId) {
    const result = await pool.query('SELECT * FROM Ticket_Configs WHERE ticket_id = $1', [ticketId]);
    return result.rows[0];
  }

  // Hàm hỗ trợ khóa dòng cho transaction (đã thêm từ bước trước)
  async getTicketByIdForUpdate(ticketId, client) {
      const query = 'SELECT * FROM Ticket_Configs WHERE ticket_id = $1 FOR UPDATE';
      const result = await client.query(query, [ticketId]);
      return result.rows[0];
  }
  
  // Tăng số lượng vé đã bán (đã thêm từ bước trước)
  async incrementSoldQuantity(ticketId, client) {
      const query = 'UPDATE Ticket_Configs SET sold_quantity = sold_quantity + 1 WHERE ticket_id = $1';
      const executor = client || pool;
      await executor.query(query, [ticketId]);
  }
}

module.exports = new TicketRepository();