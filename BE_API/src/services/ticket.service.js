const ticketRepository = require('../repositories/ticket.repo');

// Tỷ giá tạm thời
const EXCHANGE_RATE = 26275.00; // giá tại ngày 16/1/2026

class TicketService {
  
  // Hàm hỗ trợ tính toán giá tiền
  calculatePrices(vnd, usd) {
    // Kiểm tra input: Phải có ít nhất 1 loại giá
    if (vnd === undefined && usd === undefined) {
        throw new Error('Phải cung cấp ít nhất một loại giá (VND hoặc USD)');
    }

    // Nếu có nhập giá VND thì bắt buộc phải là số nguyên
    if (vnd !== undefined) {
        if (!Number.isInteger(Number(vnd))) {
            throw new Error('Giá vé VND phải là số nguyên (Integer), không được chứa số thập phân.');
        }
    }

    let finalVnd = vnd;
    let finalUsd = usd;

    // Kiểm tra số âm
    if ((finalVnd !== undefined && finalVnd < 0) || (finalUsd !== undefined && finalUsd < 0)) {
        throw new Error('Giá vé không được nhỏ hơn 0');
    }

    // Nếu có cả 2 giá tiền -> Giữ nguyên nhưng format lại cho đúng chuẩn
    if (finalVnd !== undefined && finalUsd !== undefined) {
        // Không thực hiện gì thêm
    }
    // Nếu chỉ có VND -> Tính USD
    else if (finalVnd !== undefined) {
        finalUsd = (finalVnd / EXCHANGE_RATE);
    } 
    // Nếu chỉ có USD -> Tính VND
    else {
        finalVnd = (finalUsd * EXCHANGE_RATE);
    }

    // Format:
    // VND: Làm tròn về số nguyên
    // USD: Lấy 2 chữ số thập phân
    return { 
        price_vnd: Math.round(Number(finalVnd)), 
        price_usd: parseFloat(Number(finalUsd).toFixed(2)) 
    };
  }

  validateTimeSettings(openTime, closeTime) {
    const open = new Date(openTime);
    const close = new Date(closeTime);
    
    if (open >= close) {
        throw new Error('Thời gian mở bán phải trước thời gian đóng bán');
    }
  }

  async createTicketType(data) {
    if (data.quantity_limit <= 0) throw new Error('Số lượng giới hạn phải lớn hơn 0');
    
    // Xử lý logic giá tiền (bao gồm validation Integer/Float)
    const prices = this.calculatePrices(data.price_vnd, data.price_usd);
    
    // Gán lại giá đã tính toán/format vào data để lưu xuống DB
    data.price_vnd = prices.price_vnd;
    data.price_usd = prices.price_usd;

    this.validateTimeSettings(data.open_time, data.close_time);

    // Check trùng loại vé
    const duplicateTicket = await ticketRepository.findActiveDuplicate(data.conf_id, data.ticket_name);
    
    if (duplicateTicket) {
        throw new Error(`Loại vé '${data.ticket_name}' đã tồn tại và đang còn hiệu lực. Không thể tạo trùng.`);
    }

    return await ticketRepository.createTicketType(data);
  }

  async updateTicketSettings(ticketId, settings) {
    const currentTicket = await ticketRepository.getTicketById(ticketId);
    if (!currentTicket) throw new Error('Loại vé không tồn tại');

    // Xử lý thời gian
    const newOpen = settings.open_time || currentTicket.open_time;
    const newClose = settings.close_time || currentTicket.close_time;
    this.validateTimeSettings(newOpen, newClose);

    // Xử lý số lượng giới hạn
    if (settings.quantity_limit !== undefined && settings.quantity_limit < currentTicket.sold_quantity) {
        throw new Error(`Giới hạn mới (${settings.quantity_limit}) nhỏ hơn số vé đã bán (${currentTicket.sold_quantity})`);
    }

    /* Xử lý giá tiền khi update
      Nếu người dùng gửi lên giá mới thì dùng, nếu không thì lấy giá cũ
      Nếu người dùng chỉ gửi 1 trong 2 giá mới thì cần tính lại giá kia dựa trên giá mới đó
    */
    let inputVnd = settings.price_vnd;
    let inputUsd = settings.price_usd;
    
    let finalPrices;

    // Nếu không gửi giá nào cả -> Giữ nguyên giá cũ
    if (inputVnd === undefined && inputUsd === undefined) {
        finalPrices = { 
            price_vnd: currentTicket.price_vnd, 
            price_usd: currentTicket.price_usd 
        };
    } else {
        // Nếu có input mới, chạy qua hàm tính toán (đã có validation Integer/Float)
        finalPrices = this.calculatePrices(inputVnd, inputUsd);
    }

    // Chuẩn bị object để update
    const updateData = {
        ...settings,
        open_time: newOpen,
        close_time: newClose,
        price_vnd: finalPrices.price_vnd,
        price_usd: finalPrices.price_usd,
        is_active: settings.is_active !== undefined ? settings.is_active : currentTicket.is_active,
        quantity_limit: settings.quantity_limit !== undefined ? settings.quantity_limit : currentTicket.quantity_limit
    };

    return await ticketRepository.updateTicketSettings(ticketId, updateData);
  }

  // Xử lý xóa vé
  async deleteTicket(ticketId) {
    const currentTicket = await ticketRepository.getTicketById(ticketId);
    if (!currentTicket) throw new Error('Loại vé không tồn tại hoặc đã bị xóa');

    // Kiểm tra xem vé có được sử dụng trong bảng Registrations chưa
    const isUsed = await ticketRepository.isTicketUsed(ticketId);

    if (isUsed) {
        // Nếu đã dùng -> Soft Delete
        await ticketRepository.softDeleteTicket(ticketId);
        return { message: "Loại vé đã được sử dụng. Đã chuyển sang trạng thái xóa mềm (Soft Delete).", type: "SOFT_DELETE" };
    } else {
        // Nếu chưa dùng -> Hard Delete
        await ticketRepository.hardDeleteTicket(ticketId);
        return { message: "Loại vé chưa được sử dụng. Đã xóa vĩnh viễn khỏi hệ thống (Hard Delete).", type: "HARD_DELETE" };
    }
  }

  // Lấy danh sách vé
  async getList(conferenceId) {
      return await ticketRepository.getTicketList(conferenceId);
  }
}

module.exports = new TicketService();