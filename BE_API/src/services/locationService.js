const locationRepository = require('../repositories/locationRepository');

// Logic lấy danh sách
const getAllLocations = async () => {
    // Sau này có thể thêm logic caching ở đây nếu cần
    return await locationRepository.getAllLocations();
};

// Logic tạo mới
const createLocation = async (data) => {
    // 1. Validate nghiệp vụ (Ví dụ: Sức chứa phải là số dương)
    if (data.capacity <= 0) {
        throw new Error('Sức chứa (capacity) phải lớn hơn 0');
    }

    // 2. Validate nghiệp vụ (Ví dụ: Tên không được để trống - dù DB có check nhưng Service nên check lại)
    if (!data.location_name || data.location_name.trim() === '') {
        throw new Error('Tên phòng họp không được để trống');
    }

    // 3. Gọi Repository để lưu
    const newLocation = await locationRepository.createLocation(data);
    return newLocation;
};

module.exports = {
    getAllLocations,
    createLocation
};