const db = require('../config/db');

// Lấy danh sách session (kèm tên phòng họp)
const getAllSessions = async () => {
    const query = `
        SELECT s.session_id, s.session_name, s.start_time, s.end_time, 
               l.location_id, l.location_name
        FROM sessions s
        LEFT JOIN locations l ON s.location_id = l.location_id
        ORDER BY s.start_time ASC
    `;
    const result = await db.query(query);
    return result.rows;
};

// Tạo session mới
const createSession = async (data) => {
    const { session_name, start_time, end_time, location_id } = data;
    const query = `
        INSERT INTO sessions (session_name, start_time, end_time, location_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    const values = [session_name, start_time, end_time, location_id];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Update session
const updateSession = async (id, data) => {
    const { session_name, start_time, end_time, location_id } = data;
    const query = `
        UPDATE sessions 
        SET session_name = $1, start_time = $2, end_time = $3, location_id = $4
        WHERE session_id = $5
        RETURNING *;
    `;
    const values = [session_name, start_time, end_time, location_id, id];
    const result = await db.query(query, values);
    return result.rows[0];
};

//Gan paper
const addPaperToSession = async (sessionId, paperId, order) => {
    const query = `
        INSERT INTO session_papers (session_id, paper_id, presentation_order)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    // Lưu ý: Nếu bài báo đã gán rồi thì DB sẽ báo lỗi Primary Key trùng -> ta sẽ bắt lỗi này ở Controller
    const result = await db.query(query, [sessionId, paperId, order]);
    return result.rows[0];
};

module.exports = { getAllSessions, createSession, updateSession, addPaperToSession };
