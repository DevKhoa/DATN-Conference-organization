const emailRepository = require('../repositories/emailRepository');

const createTemplate = async (data) => {
    return await emailRepository.createTemplate(data);
};

const getAllTemplates = async () => {
    return await emailRepository.getAllTemplates();
};

// --- CORE LOGIC: Gửi Email Giả Lập ---
const sendEmail = async (data) => {
    const { template_code, recipient_email, variables } = data;

    // 1. Lấy nội dung mẫu từ DB
    const template = await emailRepository.getTemplateByName(template_code);
    if (!template) {
        throw new Error('Mẫu email không tồn tại: ' + template_code);
    }

    // 2. Thay thế biến vào nội dung
    // Dữ liệu trong DB là 'body_html'
    let finalBody = template.body_html; 
    let finalSubject = template.subject;

    // Replace placeholders (Ví dụ: {{name}} -> Khoa)
    if (variables) {
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            finalBody = finalBody.replace(regex, variables[key]);
            finalSubject = finalSubject.replace(regex, variables[key]);
        });
    }

    // 3. MOCK SENDING (In ra terminal)
    console.log('---------------- [MOCK EMAIL SENT] ----------------');
    console.log(`TYPE:    ${template_code}`);
    console.log(`TO:      ${recipient_email}`);
    console.log(`SUBJECT: ${finalSubject}`);
    console.log(`BODY:    ${finalBody}`);
    console.log('---------------------------------------------------');

    // 4. Ghi Log vào DB
    await emailRepository.logEmail({
        recipient_email,
        email_type: template_code, // Lưu template_name vào cột email_type
        status: 'SENT'
    });

    return { status: 'SENT', recipient: recipient_email };
};

const getLogs = async () => {
    return await emailRepository.getLogs();
};

module.exports = {
    createTemplate,
    getAllTemplates,
    sendEmail,
    getLogs
};