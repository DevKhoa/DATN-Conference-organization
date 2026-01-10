const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Gửi email xác thực đăng ký
async function sendVerificationEmail(user, token) {
  const verifyUrl = `${process.env.BASE_URL}/auth/verify?token=${token}`;
  const mailOptions = {
    from: `"DATN_COFERENCES" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: 'Xác thực Email đăng ký tài khoản',
    html: `<p>Xin chào ${user.full_name},</p>
           <p>Cảm ơn bạn đã đăng ký tài khoản. Để hoàn tất, vui lòng xác thực email bằng cách nhấn vào nút dưới đây:</p>
           <a href="${verifyUrl}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none;">Xác thực Email</a>`,
  };
  await transporter.sendMail(mailOptions);
}

// Gửi vé kèm ảnh QR và thông tin hội nghị
async function sendTicketEmail(info, qrImageBuffer) {
  // Format ngày tháng
  const startDate = new Date(info.start_date).toLocaleDateString('vi-VN');
  const endDate = new Date(info.end_date).toLocaleDateString('vi-VN');

  const mailOptions = {
    from: `"DATN_COFERENCES" <${process.env.SMTP_USER}>`,
    to: info.email,
    subject: `Vé tham dự: ${info.conf_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #2c3e50; text-align: center;">VÉ THAM DỰ HỘI NGHỊ</h2>
        <p>Xin chào <strong>${info.full_name}</strong>,</p>
        <p>Bạn đã đăng ký thành công vé tham dự hội nghị. Dưới đây là thông tin chi tiết:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #007bff;">${info.conf_name}</h3>
          <p><strong> Địa điểm:</strong> ${info.location}</p>
          <p><strong> Thời gian:</strong> ${startDate} - ${endDate}</p>
          <p><strong> Loại vé:</strong> ${info.ticket_name}</p>
          <p><strong> Mã vé:</strong> #${info.registration_id}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p>Vui lòng xuất trình mã QR dưới đây tại quầy check-in:</p>
          <img src="cid:unique@qrcode" alt="QR Code" style="width: 200px; height: 200px; border: 1px solid #ccc;"/>
          <p style="font-size: 12px; color: #666;">Mã token: ${info.qr_code_token}</p>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; text-align: center; color: #999;">
          Đây là email tự động, vui lòng không trả lời.<br>
        </p>
      </div>
    `,
    attachments: [
      {
        filename: 'qrcode.png',
        content: qrImageBuffer,
        cid: 'unique@qrcode' // ID này phải khớp với src trong thẻ img ở trên
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendVerificationEmail,
  sendTicketEmail 
};
