const db = require('../config/db');

// 1. Tạo Template mới
const createTemplate = async (data) => {
    // Map dữ liệu từ API vào cột DB
    const { template_code, subject, body_content } = data;
    const query = `
        INSERT INTO email_templates (template_name, subject, body_html)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const result = await db.query(query, [template_code, subject, body_content]);
    return result.rows[0];
};

// 2. Lấy danh sách Template
const getAllTemplates = async () => {
    const query = `SELECT * FROM email_templates ORDER BY template_id DESC`;
    const result = await db.query(query);
    return result.rows;
};



// 3. Lấy 1 Template theo Tên (Code)
const getTemplateByName = async (templateName) => {
    const query = `SELECT * FROM email_templates WHERE template_name = $1`;
    const result = await db.query(query, [templateName]);
    return result.rows[0];
};

const getTemplateById = async (id) => {
    const query = `SELECT * FROM email_templates WHERE template_id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0];
};

// 4. Ghi Log gửi email
const logEmail = async (data) => {
    // Schema của bạn: recipient_email, email_type, status
    const { recipient_email, email_type, status } = data;
    const query = `
        INSERT INTO email_logs (recipient_email, email_type, status)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const result = await db.query(query, [recipient_email, email_type, status]);
    return result.rows[0];
};

// 5. Lấy danh sách Logs
const getLogs = async () => {
    // Vì bảng Logs của bạn không có conference_id, nên ta lấy toàn bộ logs
    const query = `SELECT * FROM email_logs ORDER BY sent_at DESC`;
    const result = await db.query(query);
    return result.rows;
};

module.exports = {
    createTemplate,
    getAllTemplates,
    getTemplateByName,
    logEmail,
    getTemplateById,
    getLogs
};