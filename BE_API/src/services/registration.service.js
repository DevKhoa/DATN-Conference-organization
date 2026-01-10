const fs = require('fs');
const path = require('path'); 
const registrationRepository = require('../repositories/registration.repo');
const ticketRepository = require('../repositories/ticket.repo');
const exceljs = require('exceljs'); 
const pool = require('../config/db'); 

class RegistrationService {
  // Tạo đăng ký mới với transaction và xử lý đồng thời
  async createRegistration(userId, ticketId) {
    // Check trùng lặp (User không được mua 2 lần cùng 1 loại vé)
    const existingReg = await registrationRepository.checkUserHasTicket(userId, ticketId);
    if (existingReg) {
        throw new Error('Bạn đã đăng ký loại vé này rồi. Vui lòng kiểm tra lại.');
    }

    const client = await pool.connect(); // Bắt đầu kết nối transaction
    
    try {
        await client.query('BEGIN'); // Bắt đầu Transaction

        // Lấy thông tin vé và KHÓA (Lock) để tránh Race Condition
        // Lúc này, không ai khác có thể mua vé này cho đến khi xong việc
        const ticket = await ticketRepository.getTicketByIdForUpdate(ticketId, client);
        
        if (!ticket) throw new Error('Vé không tồn tại');

        // Check thời gian
        const now = new Date();
        const openTime = new Date(ticket.open_time);
        const closeTime = new Date(ticket.close_time);

        if (now < openTime) {
            throw new Error('Cổng đăng ký chưa mở');
        }
        if (now > closeTime) {
            throw new Error('Cổng đăng ký đã đóng');
        }

        // Check số lượng 
        if (ticket.sold_quantity >= ticket.quantity_limit) {
            throw new Error('Đã hết vé');
        }

        // Tạo đăng ký (truyền client vào để chung transaction)
        const registration = await registrationRepository.createRegistration(userId, ticketId, null, client);
        
        // Cập nhật số lượng vé đã bán (truyền client vào)
        await ticketRepository.incrementSoldQuantity(ticketId, client);

        await client.query('COMMIT'); // Xác nhận thành công
        return registration;

    } catch (error) {
        await client.query('ROLLBACK'); // Hoàn tác nếu có lỗi bất kỳ
        throw error; // Ném lỗi ra cho Controller bắt
    } finally {
        client.release(); // Trả kết nối về pool
    }
  }

  // Xuất danh sách đăng ký ra file Excel
  async exportRegistrations() {
    const data = await registrationRepository.getAllRegistrationsForExport();
    
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');
    
    worksheet.columns = [
      { header: 'ID', key: 'registration_id', width: 10 },
      { header: 'Họ Tên', key: 'full_name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Loại vé', key: 'ticket_name', width: 20 },
      { header: 'Trạng thái ĐK', key: 'registration_status', width: 15 },
      { header: 'Thanh toán', key: 'payment_status', width: 15 },
      { header: 'Ngày tạo', key: 'created_at', width: 20 },
    ];

    worksheet.addRows(data);
    
    const exportDir = path.join(__dirname, '../exports'); // Định vị thư mục exports
    if (!fs.existsSync(exportDir)){
        fs.mkdirSync(exportDir); // Tự tạo nếu chưa có
    }

    const fileName = `registrations_export_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(path.join(exportDir, fileName));
    
    return { 
        export_format: 'EXCEL',
        file_url: `/exports/${fileName}`, // URL tải file
        generated_at: new Date().toISOString()
    };
  }
}

module.exports = new RegistrationService();