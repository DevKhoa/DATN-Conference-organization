const notificationRepository = require('../repositories/notificationRepository');
const emailRepository = require('../repositories/emailRepository'); 
const emailService = require('./emailService');

const sendBulkEmail = async (data) => {
    // Thêm variable_mapping vào input
    const { template_code, target_group, conference_id, extra_variables, variable_mapping } = data;

    // 1. Check Template
    const template = await emailRepository.getTemplateByName(template_code);
    if (!template) throw new Error(`Không tìm thấy mẫu email: "${template_code}"`);

    // 2. Get Users (Lưu ý: Repo cần SELECT đủ các cột muốn map)
    const recipients = await notificationRepository.getRecipients({ target_group, conference_id });
    
    if (!recipients || recipients.length === 0) {
        return { total_recipients: 0, sent_success: 0, sent_failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    console.log(`>>> BẮT ĐẦU GỬI BULK MAPPING: ${recipients.length} người...`);

    // 3. Vòng lặp gửi
    for (const user of recipients) {
        try {
            // Khởi tạo biến variables bắt đầu bằng các biến chung (như event_name...)
            let variables = { ...extra_variables };

            // Nếu có mapping gửi lên
            if (variable_mapping) {
                // Duyệt qua từng cặp key-value trong mapping
                // Ví dụ: keyTemplate = "name", dbColumn = "full_name"
                Object.keys(variable_mapping).forEach(keyTemplate => {
                    const dbColumn = variable_mapping[keyTemplate];
                    
                    // Lấy giá trị từ object user dựa trên tên cột DB
                    // Nếu cột đó tồn tại trong user thì lấy, không thì để trống
                    variables[keyTemplate] = user[dbColumn] !== undefined ? user[dbColumn] : "";
                });
            } else {
                // Fallback: Nếu không gửi mapping thì dùng mặc định (như code cũ)
                variables.name = user.full_name;
            }
            // -----------------------------

            // Biến email bắt buộc phải có để gửi
            const recipientEmail = user.email;

            await emailService.sendEmail({
                template_code: template_code,
                recipient_email: recipientEmail,
                variables // Bộ biến đã được map xong
            });

            successCount++;
        } catch (error) {
            console.error(`[LỖI] ${user.email}:`, error.message);
            failedCount++;
        }
    }

    return {
        template_used: template_code,
        total_recipients: recipients.length,
        sent_success: successCount,
        sent_failed: failedCount
    };
};

module.exports = { sendBulkEmail };