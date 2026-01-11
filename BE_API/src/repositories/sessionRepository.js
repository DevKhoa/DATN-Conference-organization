const db = require('../config/db');

// Lấy danh sách session (Có hỗ trợ lọc theo conference_id)
const getAllSessions = async (conferenceId = null) => {
    let query = `
        SELECT s.session_id, s.session_name, s.start_time, s.end_time, 
               l.location_id, l.location_name, s.conference_id
        FROM sessions s
        LEFT JOIN locations l ON s.location_id = l.location_id
    `;
    
    const params = [];
    
    // Nếu có truyền conferenceId thì lọc, không thì lấy hết
    if (conferenceId) {
        query += ` WHERE s.conference_id = $1`;
        params.push(conferenceId);
    }
    
    query += ` ORDER BY s.start_time ASC`;

    const result = await db.query(query, params);
    return result.rows;
};

// Tạo session mới (Cần thêm conference_id)
const createSession = async (data) => {
    const { session_name, start_time, end_time, location_id, conference_id } = data;
    const query = `
        INSERT INTO sessions (session_name, start_time, end_time, location_id, conference_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [session_name, start_time, end_time, location_id, conference_id];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Update session (Cho phép đổi cả conference_id nếu cần)
const updateSession = async (id, data) => {
    const { session_name, start_time, end_time, location_id, conference_id } = data;
    const query = `
        UPDATE sessions 
        SET session_name = $1, start_time = $2, end_time = $3, location_id = $4, conference_id = $5
        WHERE session_id = $6
        RETURNING *;
    `;
    const values = [session_name, start_time, end_time, location_id, conference_id, id];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Gán paper (Giữ nguyên)
const addPaperToSession = async (sessionId, paperId, order) => {
    const query = `
        INSERT INTO session_papers (session_id, paper_id, presentation_order)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const result = await db.query(query, [sessionId, paperId, order]);
    return result.rows[0];
};

module.exports = { getAllSessions, createSession, updateSession, addPaperToSession };