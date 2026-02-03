const db = require('../config/db');

// Lấy danh sách người nhận dựa trên tiêu chí
const getRecipients = async (filter) => {
    const { target_group, conference_id } = filter;
    
    let query = `SELECT u.user_id, full_name, email FROM users as u JOIN user_roles as ur on u.user_id = ur.user_id WHERE ur.role_id = 4`;
    const params = [];

    // Logic lọc đơn giản (Có thể mở rộng thêm: lọc theo role, theo trạng thái bài báo...)
    if (target_group === 'ALL_USERS') {
        // Lấy hết (không làm gì thêm)
    } 
    // Ví dụ: Lọc Author của 1 Conference cụ thể (Cần bảng Users join Papers join Sessions...)
    // Ở đây ví dụ đơn giản nhất là lấy tất cả user để test
    
    // Nếu có lọc theo conference_id (Cần bảng users_conferences hoặc logic tương tự)
    // Tạm thời query user đơn giản để demo logic Bulk
    
    const result = await db.query(query, params);
    return result.rows;
};


module.exports = {
    getRecipients
};