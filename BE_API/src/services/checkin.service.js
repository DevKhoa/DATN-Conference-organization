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

    // Chỉ sinh QR khi đã thanh toán HOẶC vé miễn phí
    if (registration.payment_status !== 'PAID' && registration.payment_status !== 'FREE') {
        throw new Error('Không thể tạo mã QR vì vé chưa thanh toán hoặc chưa được duyệt miễn phí');
    }

    // Nếu đã có token rồi thì dùng (sinh mới làm mã cũ vô hiệu lực khi user đang giữ mã cũ)
    let qrToken = registration.qr_code_token;
    if (!qrToken) {
        qrToken = uuidv4(); // Tạo chuỗi unique (UUID)
        await registrationRepository.updateQrToken(registrationId, qrToken);
    }

    // Lấy thông tin chi tiết để gửi mail
    const fullInfo = await registrationRepository.getRegistrationWithConferenceDetails(registrationId);

    // Lấy thông tin thanh toán thành công gần nhất để hiển thị trong mail (Chỉ cần nếu không phải FREE)
    let paymentInfo = null;
    if (fullInfo.payment_status !== 'FREE') {
        const transQuery = await db.query(
            `SELECT payment_gateway, updated_at 
             FROM Transactions 
             WHERE registration_id = $1 AND status = 'SUCCESS' AND transaction_type = 'PAYMENT'
             ORDER BY updated_at DESC LIMIT 1`,
            [registrationId]
        );
        
        if (transQuery.rows.length > 0) {
            paymentInfo = {
                gateway: transQuery.rows[0].payment_gateway,
                paid_at: transQuery.rows[0].updated_at
            };
        }
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

    // Check điều kiện: registration_status = APPROVED và payment_status IN (PAID, FREE)
    const isValidStatus = registration.registration_status === 'APPROVED';
    const isValidPayment = (registration.payment_status === 'PAID' || registration.payment_status === 'FREE');

    if (!isValidStatus) {
         return { valid: false, message: 'Vé chưa được chấp thuận (Not APPROVED)' };
    }

    if (!isValidPayment) {
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

    // Gửi email thông báo Check-in thành công
    const fullDetails = await registrationRepository.getRegistrationWithConferenceDetails(registration.registration_id);
    if (fullDetails) {
        try {
            await emailSender.sendCheckinSuccessEmail(
                fullDetails.email, 
                fullDetails.full_name, 
                fullDetails.conf_name, 
                updateResult.checked_in_at
            );
        } catch (e) {
            console.error("Lỗi gửi mail checkin success:", e);
            // Không throw error vì checkin đã thành công trong DB
        }
    }

    return {
        registration_id: registration.registration_id,
        valid: true,
        checkin_status: 'SUCCESS',
        attendee_name: fullDetails ? fullDetails.full_name : 'Attendee', 
        checked_in_at: updateResult.checked_in_at || new Date().toISOString()
    };
  }
}

module.exports = new CheckinService();