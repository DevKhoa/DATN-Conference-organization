const ticketRepository = require('../repositories/ticket.repo');

class TicketService {
  validateTimeSettings(openTime, closeTime) {
    const open = new Date(openTime);
    const close = new Date(closeTime);
    
    if (open >= close) {
        throw new Error('Thời gian mở bán phải trước thời gian đóng bán');
    }
  }

  async createTicketType(data) {
    if (data.price < 0) throw new Error('Giá vé không hợp lệ');
    if (data.quantity_limit <= 0) throw new Error('Số lượng giới hạn phải lớn hơn 0');
    
    this.validateTimeSettings(data.open_time, data.close_time);

    // Check trùng loại vé đang còn hiệu lực
    // Điều kiện: Cùng conf_id, cùng tên (không pb hoa thường), chưa hết hạn (close_time > now)
    const duplicateTicket = await ticketRepository.findActiveDuplicate(data.conf_id, data.ticket_name);
    
    if (duplicateTicket) {
        throw new Error(`Loại vé '${data.ticket_name}' đã tồn tại và đang còn hiệu lực (chưa hết hạn). Không thể tạo trùng.`);
    }

    return await ticketRepository.createTicketType(data);
  }

  async updateTicketSettings(ticketId, settings) {
    const currentTicket = await ticketRepository.getTicketById(ticketId);
    if (!currentTicket) throw new Error('Loại vé không tồn tại');

    const newOpen = settings.open_time || currentTicket.open_time;
    const newClose = settings.close_time || currentTicket.close_time;
    this.validateTimeSettings(newOpen, newClose);

    if (settings.quantity_limit !== undefined && settings.quantity_limit < currentTicket.sold_quantity) {
        throw new Error(`Giới hạn mới (${settings.quantity_limit}) nhỏ hơn số vé đã bán (${currentTicket.sold_quantity})`);
    }

    return await ticketRepository.updateTicketSettings(ticketId, settings);
  }
}

module.exports = new TicketService();