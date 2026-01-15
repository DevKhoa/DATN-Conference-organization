const registrationRepository = require('../repositories/registration.repo');
const ticketRepository = require('../repositories/ticket.repo');
const pool = require('../config/db'); 
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');
const path = require('path');
const fs = require('fs');

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

  // Hủy đăng ký
  async cancelRegistration(registrationId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Lấy thông tin registration
        const registration = await registrationRepository.getRegistrationById(registrationId, client);
        if (!registration) throw new Error('Không tìm thấy thông tin đăng ký');

        // Kiểm tra nếu đã hủy rồi thì không làm gì hoặc báo lỗi
        if (registration.registration_status === 'CANCELLED') {
            throw new Error('Đăng ký này đã bị hủy trước đó');
        }

        // Cập nhật trạng thái đăng ký sang CANCELLED
        const updatedReg = await registrationRepository.updateStatus(registrationId, 'CANCELLED', client);

        // Giảm số lượng vé đã bán trong bảng Ticket_Configs
        await ticketRepository.decrementSoldQuantity(registration.ticket_id, client);

        await client.query('COMMIT');
        
        return updatedReg;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
  }

  // Lấy danh sách đăng ký theo hội nghị (và trạng thái nếu có)
  async getRegistrationList(conferenceId, paymentStatus) {
    if (!conferenceId) {
        throw new Error('Cần cung cấp Conference ID');
    }
    
    // Gọi repo lấy dữ liệu raw
    const data = await registrationRepository.getRegistrationsByConference(conferenceId, paymentStatus);
    
    return {
        conference_id: conferenceId,
        filter_status: paymentStatus || 'ALL',
        count: data.length,
        registrations: data
    };
  }

  // Hàm xuất file và lưu xuống đĩa cứng
  async exportRegistrations(conferenceId, fileType, paymentStatus) {
    // Lấy dữ liệu
    const registrations = await registrationRepository.getRegistrationsByConference(conferenceId, paymentStatus);

    if (!registrations || registrations.length === 0) {
      throw new Error('Không có dữ liệu đăng ký nào phù hợp để xuất.');
    }

    // Chuẩn bị dữ liệu
    const data = registrations.map((reg, index) => ({
      stt: index + 1,
      full_name: reg.full_name,
      email: reg.email,
      ticket_name: reg.ticket_name,
      payment_status: reg.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
      registration_status: reg.registration_status,
      created_at: new Date(reg.created_at).toLocaleString('vi-VN')
    }));

    // Xác định thư mục con dựa trên loại file
    const subFolder = fileType === 'excel' ? 'excel' : 'pdf';

    // Cấu hình đường dẫn lưu file: public/registration_exports/excel hoặc public/registration_exports/pdf
    const exportDir = path.join(__dirname, `../public/registration_exports/${subFolder}`);
    
    // Tạo thư mục nếu chưa có (recursive: true sẽ tạo cả thư mục cha nếu thiếu)
    if (!fs.existsSync(exportDir)){
        fs.mkdirSync(exportDir, { recursive: true });
    }

    // Tạo tên file duy nhất
    const timestamp = Date.now();
    const extension = fileType === 'excel' ? 'xlsx' : 'pdf';
    const fileName = `registrations_conf_${conferenceId}_${timestamp}.${extension}`;
    const filePath = path.join(exportDir, fileName);

    // Tạo file
    if (fileType === 'excel') {
      await this.generateExcelFile(data, filePath);
    } else if (fileType === 'pdf') {
      await this.generatePDFFile(data, filePath);
    }

    // Trả về đường dẫn tương đối để Client truy cập
    // static folder là 'public' -> URL là /registration_exports/{subFolder}/{fileName}
    return `/registration_exports/${subFolder}/${fileName}`;
  }

  // Helper: Tạo và lưu file Excel
  async generateExcelFile(data, filePath) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách đăng ký');

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Họ và tên', key: 'full_name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Loại vé', key: 'ticket_name', width: 20 },
      { header: 'Trạng thái TT', key: 'payment_status', width: 15 },
      { header: 'Ngày đăng ký', key: 'created_at', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.addRows(data);

    // Ghi file xuống ổ đĩa
    await workbook.xlsx.writeFile(filePath);
  }

  // Helper: Tạo và lưu file PDF
  async generatePDFFile(data, filePath) {
    return new Promise((resolve, reject) => {
        try {
            // Khởi tạo document
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const writeStream = fs.createWriteStream(filePath);

            // ============================================================
            // CẤU HÌNH FONT TIẾNG VIỆT
            // ============================================================
            // Đường dẫn đến file font. 
            // Lưu ý: path.join(__dirname, '../..') tùy thuộc vào cấu trúc thư mục thực tế của bạn.
            // Ví dụ này giả định: src/services/registration.service.js -> font nằm ở fonts/Roboto-Regular.ttf
            const fontPath = path.join(__dirname, '../../fonts/Roboto-Regular.ttf'); 
            
            // Nếu bạn để thư mục fonts ngang hàng file service thì dùng: path.join(__dirname, 'fonts/Roboto-Regular.ttf');
            // Hãy kiểm tra kỹ đường dẫn này nhé!

            if (fs.existsSync(fontPath)) {
                // Đăng ký font và set làm mặc định
                doc.font(fontPath); 
            } else {
                console.warn(`WARNING: Không tìm thấy file font tại ${fontPath}. Tiếng Việt sẽ bị lỗi.`);
            }
            // ============================================================

            // Pipe dữ liệu vào file
            doc.pipe(writeStream);

            // Viết tiêu đề
            doc.fontSize(18).text('DANH SÁCH ĐĂNG KÝ THAM GIA HỘI NGHỊ', { align: 'center' });
            doc.moveDown();

            // Cấu hình bảng
            const table = {
                title: "",
                headers: ["STT", "Họ Tên", "Email", "Vé", "Thanh Toán", "Ngày ĐK"],
                rows: data.map(row => [
                    row.stt, 
                    row.full_name, 
                    row.email, 
                    row.ticket_name, 
                    row.payment_status, 
                    row.created_at
                ]),
            };

            // Vẽ bảng
            doc.table(table, {
                width: 530, // Tăng độ rộng bảng cho vừa trang A4
                prepareHeader: () => doc.font(fontPath).fontSize(10).fillColor('black'), // Dùng font tiếng Việt cho Header
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font(fontPath).fontSize(10).fillColor('black'); // Dùng font tiếng Việt cho nội dung
                },
            });

            doc.end();

            // Xử lý sự kiện ghi file xong
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);

        } catch (err) {
            reject(err);
        }
    });
  }
}

module.exports = new RegistrationService();