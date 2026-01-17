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
async function sendTicketEmail(info, qrImageBuffer, paymentInfo) {
  const startDate = new Date(info.start_date).toLocaleDateString('vi-VN');
  const endDate = new Date(info.end_date).toLocaleDateString('vi-VN');
  
  // Format thông tin thanh toán (nếu có)
  let paymentDetailsHtml = '';
  
  // Nếu trạng thái là FREE thì hiển thị khác, nếu PAID thì hiển thị info
  if (info.payment_status === 'FREE') {
      paymentDetailsHtml = `
      <div style="background-color: #e3f2fd; padding: 10px; margin: 10px 0; border: 1px solid #90caf9; border-radius: 4px;">
        <p style="margin: 0; color: #1565c0;"><strong>✔ Vé miễn phí (Free Ticket)</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 13px;">
           Bạn đã đăng ký thành công vé tham dự miễn phí.
        </p>
      </div>
    `;
  } else if (paymentInfo) {
    const payTime = paymentInfo.paid_at ? new Date(paymentInfo.paid_at).toLocaleString('vi-VN') : 'N/A';
    paymentDetailsHtml = `
      <div style="background-color: #e8f5e9; padding: 10px; margin: 10px 0; border: 1px solid #c8e6c9; border-radius: 4px;">
        <p style="margin: 0; color: #2e7d32;"><strong>✔ Xác nhận thanh toán thành công</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 13px;">
           Thời gian: ${payTime} <br>
           Cổng thanh toán: ${paymentInfo.gateway}
        </p>
      </div>
    `;
  }

  const mailOptions = {
    from: `"DATN_COFERENCES" <${process.env.SMTP_USER}>`,
    to: info.email,
    subject: `Vé tham dự: ${info.conf_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #2c3e50; text-align: center;">VÉ THAM DỰ HỘI NGHỊ</h2>
        <p>Xin chào <strong>${info.full_name}</strong>,</p>
        <p>Bạn đã đăng ký thành công vé tham dự hội nghị. Dưới đây là thông tin chi tiết:</p>
        
        ${paymentDetailsHtml}

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
        cid: 'unique@qrcode'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}

// Gửi hóa đơn VAT
async function sendInvoiceEmail(emailReceive, invoiceData, invoiceUrl) {
    const mailOptions = {
        from: `"DATN_COFERENCES" <${process.env.SMTP_USER}>`,
        to: emailReceive,
        subject: 'Hóa đơn điện tử (VAT) - DATN Conferences',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <p>Xin chào quý khách,</p>
            <p>Hệ thống gửi đến quý khách hóa đơn điện tử cho dịch vụ đăng ký hội nghị.</p>
            <ul>
                <li><strong>Đơn vị nhận:</strong> ${invoiceData.company_name}</li>
                <li><strong>Mã số thuế:</strong> ${invoiceData.tax_code}</li>
            </ul>
            <p>Vui lòng tải hóa đơn tại đường dẫn dưới đây:</p>
            <p><a href="${invoiceUrl}">${invoiceUrl}</a></p>
            <p>Trân trọng,<br>Ban tổ chức.</p>
          </div>
        `
    };
    await transporter.sendMail(mailOptions);
}

// Gửi thông báo hoàn tiền thành công
async function sendRefundEmail(refundInfo) {
    const refundTime = new Date().toLocaleString('vi-VN');
    const mailOptions = {
        from: `"DATN_COFERENCES" <${process.env.SMTP_USER}>`,
        to: refundInfo.email,
        subject: 'Hoàn tiền thành công (Refund Success) - DATN Conferences',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
            <h2 style="color: #d32f2f; text-align: center;">XÁC NHẬN HOÀN TIỀN</h2>
            <p>Xin chào <strong>${refundInfo.full_name}</strong>,</p>
            <p>Yêu cầu hoàn tiền cho vé hội nghị của bạn đã được xử lý thành công. Dưới đây là chi tiết giao dịch:</p>
            
            <div style="background-color: #fff3e0; padding: 15px; margin: 20px 0; border: 1px solid #ffe0b2; border-radius: 5px;">
              <p><strong>Mã đăng ký:</strong> #${refundInfo.registration_id}</p>
              <p><strong>Hội nghị:</strong> ${refundInfo.conf_name}</p>
              <p><strong>Số tiền hoàn:</strong> ${refundInfo.amount} ${refundInfo.currency}</p>
              <p><strong>Cổng thanh toán:</strong> ${refundInfo.gateway}</p>
              <p><strong>Thời gian xử lý:</strong> ${refundTime}</p>
            </div>

            <p><em>Lưu ý: Thời gian tiền về tài khoản thực tế có thể phụ thuộc vào quy trình của ngân hàng hoặc ví điện tử (thường từ 1-7 ngày làm việc).</em></p>
            
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; text-align: center; color: #999;">
              Đây là email tự động, vui lòng không trả lời.<br>
            </p>
          </div>
        `
    };
    await transporter.sendMail(mailOptions);
}

// Gửi email xác nhận check-in thành công
async function sendCheckinSuccessEmail(email, fullName, confName, checkinTime) {
    const timeString = new Date(checkinTime).toLocaleString('vi-VN');
    const mailOptions = {
        from: `"DATN_COFERENCES" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Check-in thành công: ${confName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #4caf50; padding: 20px; border-radius: 8px;">
            <h2 style="color: #2e7d32; text-align: center;">CHECK-IN THÀNH CÔNG</h2>
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Bạn đã hoàn tất thủ tục điểm danh tại hội nghị:</p>
            <h3 style="text-align: center; color: #333;">${confName}</h3>
            <p style="text-align: center; font-size: 16px;">Thời gian: <strong>${timeString}</strong></p>
            <p>Chào mừng bạn tham dự hội nghị. Chúc bạn có những trải nghiệm tuyệt vời!</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; text-align: center; color: #999;">
              Đây là email tự động từ hệ thống check-in.
            </p>
          </div>
        `
    };
    await transporter.sendMail(mailOptions);
}

module.exports = {
  sendVerificationEmail,
  sendTicketEmail,
  sendInvoiceEmail,
  sendRefundEmail,
  sendCheckinSuccessEmail
};