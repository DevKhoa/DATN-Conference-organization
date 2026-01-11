const db = require('../config/db');

// 1. Tạo bản nháp (Draft)
const createDraft = async (conferenceId, userId) => {
    // Tự động tính Version tiếp theo (MAX version + 1)
    const versionQuery = `
        SELECT COALESCE(MAX(version), 0) + 1 as next_version 
        FROM agenda_drafts 
        WHERE conference_id = $1
    `;
    const versionResult = await db.query(versionQuery, [conferenceId]);
    const nextVersion = versionResult.rows[0].next_version;

    // Tạo draft mới
    const insertQuery = `
        INSERT INTO agenda_drafts (conference_id, version, created_by, is_final)
        VALUES ($1, $2, $3, FALSE)
        RETURNING *;
    `;
    const result = await db.query(insertQuery, [conferenceId, nextVersion, userId]);
    return result.rows[0];
};

// 2. Thêm comment vào draft
const addComment = async (draftId, userId, content) => {
    const query = `
        INSERT INTO agenda_comments (draft_id, commenter_id, comment_text)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const result = await db.query(query, [draftId, userId, content]);
    return result.rows[0];
};

// 3. Lấy danh sách comment của 1 draft
const getCommentsByDraft = async (draftId) => {
    const query = `
        SELECT c.comment_id, c.comment_text, c.commented_at, 
               u.full_name as commenter_name, u.user_id
        FROM agenda_comments c
        JOIN users u ON c.commenter_id = u.user_id
        WHERE c.draft_id = $1
        ORDER BY c.commented_at DESC;
    `;
    const result = await db.query(query, [draftId]);
    return result.rows;
};

// 4. Duyệt lịch trình (Approve)
const approveDraft = async (draftId) => {
    // Bước 1: Set tất cả các draft khác của conference này thành FALSE (để bỏ final cũ)
    // Cần lấy conference_id của draft này trước
    const confQuery = 'SELECT conference_id FROM agenda_drafts WHERE draft_id = $1';
    const confRes = await db.query(confQuery, [draftId]);
    
    if (confRes.rows.length > 0) {
        const confId = confRes.rows[0].conference_id;
        await db.query('UPDATE agenda_drafts SET is_final = FALSE WHERE conference_id = $1', [confId]);
    }

    // Bước 2: Set draft hiện tại thành TRUE
    const query = `
        UPDATE agenda_drafts 
        SET is_final = TRUE 
        WHERE draft_id = $1
        RETURNING *;
    `;
    const result = await db.query(query, [draftId]);
    return result.rows[0];
};

// 5. Kiểm tra xem hội nghị đã có bản Final chưa
const getFinalDraft = async (conferenceId) => {
    const query = `
        SELECT draft_id, version, created_at 
        FROM agenda_drafts 
        WHERE conference_id = $1 AND is_final = TRUE
        ORDER BY version DESC 
        LIMIT 1
    `;
    const result = await db.query(query, [conferenceId]);
    return result.rows[0]; // Trả về undefined nếu chưa có
};

// 6. Lấy dữ liệu chi tiết Sessions (Gom nhóm theo ngày)
const getAgendaDetails = async (conferenceId) => {
    const query = `
        SELECT 
            s.start_time::date as date,
            json_agg(json_build_object(
                'session_id', s.session_id,
                'session_name', s.session_name,
                'time_range', to_char(s.start_time, 'HH24:MI') || ' - ' || to_char(s.end_time, 'HH24:MI'),
                'location', l.location_name,
                'room_capacity', l.capacity,
                'papers', (
                    SELECT json_agg(json_build_object(
                        'title', p.title, 
                        'author', u.full_name,
                        'order', sp.presentation_order
                    ) ORDER BY sp.presentation_order)
                    FROM session_papers sp
                    JOIN papers p ON sp.paper_id = p.paper_id
                    JOIN users u ON p.primary_author_id = u.user_id
                    WHERE sp.session_id = s.session_id
                )
            ) ORDER BY s.start_time) as sessions
        FROM sessions s
        LEFT JOIN locations l ON s.location_id = l.location_id
        WHERE s.conference_id = $1
        GROUP BY s.start_time::date
        ORDER BY s.start_time::date;
    `;
    const result = await db.query(query, [conferenceId]);
    return result.rows;
};

const checkConferenceExists = async (conferenceId) => {
    const query = 'SELECT conf_id FROM conferences WHERE conf_id = $1';
    const result = await db.query(query, [conferenceId]);
    return result.rows.length > 0; // Trả về true nếu tồn tại
};

module.exports = {
    createDraft,
    addComment,
    getCommentsByDraft,
    approveDraft,
    getFinalDraft,
    getAgendaDetails,
    checkConferenceExists
};