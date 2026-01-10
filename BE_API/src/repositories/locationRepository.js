const db = require('../config/db');

// Lấy danh sách (Lấy thêm các cột mới)
const getAllLocations = async () => {
    // Chọn cụ thể các cột hoặc dùng *
    const query = `
        SELECT location_id, location_name, capacity, address, description, image_url 
        FROM locations 
        ORDER BY location_id ASC
    `;
    const result = await db.query(query);
    return result.rows;
};

// Tạo mới (Cập nhật câu INSERT)
const createLocation = async (data) => {
    // Destructuring thêm các trường mới
    const { location_name, capacity, address, description, image_url } = data;
    
    const query = `
        INSERT INTO locations (location_name, capacity, address, description, image_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    
    // Mảng values phải khớp thứ tự với $1, $2...
    const values = [location_name, capacity, address, description, image_url];
    
    const result = await db.query(query, values);
    return result.rows[0];
};

module.exports = {
    getAllLocations,
    createLocation
};