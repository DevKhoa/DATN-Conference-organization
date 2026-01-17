const registrationRepository = require('../repositories/registration.repo');
const emailSender = require('../utils/emailService');
const { v4: uuidv4 } = require('uuid'); 
const QRCode = require('qrcode');
const db = require('../config/db');

class CheckinService {
    // Sinh mã QR cho vé đã thanh toán
    async generateQrCode(registrationId) {
    // Kiểm tra tồn tại
    const registration = await registrationRepository.getRegistrationById(registrationId);
    if (!registration) throw new Error('Đăng ký không tồn tại');

    // Chỉ sinh QR khi đã thanh toán
    if (registration.payment_status !== 'PAID') {
        throw new Error('Không thể tạo mã QR vì chưa thanh toán');
    }

    // Nếu đã có token rồi thì dùng (sinh mới làm mã cũ vô hiệu lực khi user đang giữ mã cũ)
    let qrToken = registration.qr_code_token;
    if (!qrToken) {
        qrToken = uuidv4(); // Tạo chuỗi unique (UUID)
        await registrationRepository.updateQrToken(registrationId, qrToken);
    }

    // Lấy thông tin chi tiết để gửi mail
    const fullInfo = await registrationRepository.getRegistrationWithConferenceDetails(registrationId);

    // Lấy thông tin thanh toán thành công gần nhất để hiển thị trong mail
    const transQuery = await db.query(
        `SELECT payment_gateway, updated_at 
         FROM Transactions 
         WHERE registration_id = $1 AND status = 'SUCCESS' AND transaction_type = 'PAYMENT'
         ORDER BY updated_at DESC LIMIT 1`,
        [registrationId]
    );
    
    let paymentInfo = null;
    if (transQuery.rows.length > 0) {
        paymentInfo = {
            gateway: transQuery.rows[0].payment_gateway,
            paid_at: transQuery.rows[0].updated_at
        };
    }

    // Tạo buffer ảnh QR
    const qrImageBuffer = await QRCode.toBuffer(qrToken, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: { dark: '#000000', light: '#ffffff' }
    });

    // Tự động gửi Email
    if (fullInfo && fullInfo.email) {
        // try-catch để nếu gửi mail lỗi thì vẫn trả về token cho API
        try {
            // Truyền thêm paymentInfo
            await emailSender.sendTicketEmail(fullInfo, qrImageBuffer, paymentInfo);
        } catch (mailError) {
            console.error("Lỗi gửi email vé:", mailError);
        }
    }

    return {
        registration_id: fullInfo.registration_id,
        qr_code_token: qrToken,
        generated_at: new Date().toISOString(),
        message: 'Mã QR đã được tạo và gửi tới email.'
    };
  }

  // Xác thực mã QR khi check-in
  async verifyCheckin(qrToken) {
    // Tìm vé theo token
    const registration = await registrationRepository.findByQrToken(qrToken);
    
    if (!registration) {
         throw new Error('Mã QR không tồn tại hoặc không hợp lệ');
    }

    // Check thanh toán
    if (registration.payment_status !== 'PAID') {
        return { valid: false, message: 'Vé chưa hoàn tất thanh toán (UNPAID)' };
    }

    // Check vé đã dùng chưa (Chống dùng lại vé)
    if (registration.checkin_status === 'CHECKED_IN') {
        return { 
            valid: false, 
            message: `Vé này ĐÃ check-in trước đó vào lúc ${new Date(registration.checked_in_at).toLocaleString('vi-VN')}` 
        };
    }

    // Cập nhật trạng thái đã check-in vào DB
    const updateResult = await registrationRepository.updateCheckinStatus(registration.registration_id);

    return {
        registration_id: registration.registration_id,
        valid: true,
        checkin_status: 'SUCCESS',
        attendee_name: registration.full_name, // Nên join để lấy tên hiển thị cho Staff
        checked_in_at: updateResult.checked_in_at || new Date().toISOString()
    };
  }
}

module.exports = new CheckinService();