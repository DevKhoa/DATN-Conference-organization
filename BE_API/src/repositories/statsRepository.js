const db = require('../config/db');

// 1. Thống kê tổng quan (Overview)
const getOverviewStats = async (conferenceId) => {
    // Chạy song song các query để tối ưu hiệu năng
    const queries = {
        // Query 1: Đếm User (Join qua Ticket_Configs để lọc Conference)
        users: `
            SELECT COUNT(DISTINCT r.user_id) as val 
            FROM Registrations r
            JOIN Ticket_Configs tc ON r.ticket_id = tc.ticket_id
            WHERE tc.conference_id = $1
        `,
        
        // Query 2: Đếm Bài báo (Không thay đổi)
        papers: `
            SELECT COUNT(*) as val 
            FROM Papers 
            WHERE conference_id = $1
        `,
        
        // Query 3: Tổng lượt đăng ký (Join qua Ticket_Configs)
        registrations: `
            SELECT COUNT(*) as val 
            FROM Registrations r
            JOIN Ticket_Configs tc ON r.ticket_id = tc.ticket_id
            WHERE tc.conference_id = $1
        `,
        
        // Query 4: Tổng doanh thu thực tế
        // Logic: Lấy tổng tiền từ bảng Transactions, 
        // ĐK: Transaction đó thuộc Registration của Conf này VÀ trạng thái Reg là PAID
        revenue: `
            SELECT COALESCE(SUM(tr.amount), 0) as val 
            FROM Transactions tr
            JOIN Registrations r ON tr.registration_id = r.registration_id
            JOIN Ticket_Configs tc ON r.ticket_id = tc.ticket_id
            WHERE tc.conference_id = $1 
            AND r.payment_status = 'PAID' 
            -- Có thể thêm điều kiện AND tr.status = 'SUCCESS' nếu muốn chặt chẽ hơn
        `
    };

    const results = await Promise.all([
        db.query(queries.users, [conferenceId]),
        db.query(queries.papers, [conferenceId]),
        db.query(queries.registrations, [conferenceId]),
        db.query(queries.revenue, [conferenceId])
    ]);

    return {
        total_users: parseInt(results[0].rows[0].val),
        total_papers: parseInt(results[1].rows[0].val),
        total_registrations: parseInt(results[2].rows[0].val),
        total_revenue: parseFloat(results[3].rows[0].val)
    };
};

// 2. Thống kê theo Quốc gia (Geo)
const getGeoStats = async (conferenceId) => {
    // 1. Query theo Quốc gia
    const countryQuery = `
        SELECT 
            u.country, 
            COUNT(DISTINCT u.user_id) as participants
        FROM Users u
        JOIN Registrations r ON u.user_id = r.user_id
        JOIN Ticket_Configs tc ON r.ticket_id = tc.ticket_id
        WHERE tc.conference_id = $1 
        AND u.country IS NOT NULL AND u.country <> ''
        GROUP BY u.country
        ORDER BY participants DESC;
    `;

    // 2. Query theo Tổ chức/Đơn vị (Lấy Top 10 đơn vị đông nhất)
    const orgQuery = `
        SELECT 
            u.organization, 
            COUNT(DISTINCT u.user_id) as participants
        FROM Users u
        JOIN Registrations r ON u.user_id = r.user_id
        JOIN Ticket_Configs tc ON r.ticket_id = tc.ticket_id
        WHERE tc.conference_id = $1 
        AND u.organization IS NOT NULL AND u.organization <> ''
        GROUP BY u.organization
        ORDER BY participants DESC
        LIMIT 10; 
    `;
    
    // Chạy song song 2 query
    const [countryRes, orgRes] = await Promise.all([
        db.query(countryQuery, [conferenceId]),
        db.query(orgQuery, [conferenceId])
    ]);
    
    // Format kết quả trả về
    return {
        by_country: countryRes.rows.map(row => ({
            name: row.country,
            value: parseInt(row.participants)
        })),
        by_organization: orgRes.rows.map(row => ({
            name: row.organization,
            value: parseInt(row.participants)
        }))
    };
};

module.exports = {
    getOverviewStats,
    getGeoStats
};