CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL,
    capacity INT
);

INSERT INTO locations (location_name, capacity) VALUES ('Hall A', 300);

-- Thêm thông tin mô tả, địa chỉ cụ thể và link ảnh
ALTER TABLE locations
ADD COLUMN address VARCHAR(255),       -- Ví dụ: "Tầng 2, Tòa nhà C"
ADD COLUMN description TEXT,           -- Ví dụ: "Có máy chiếu, bảng trắng, điều hòa"
ADD COLUMN image_url TEXT;             -- Link ảnh phòng họp (để hiển thị lên web cho đẹp)

-- 1. Xóa cột room_location cũ (dạng chữ)
ALTER TABLE sessions DROP COLUMN IF EXISTS room_location;

-- 2. Thêm cột location_id (liên kết với bảng locations)
ALTER TABLE sessions ADD COLUMN location_id INT REFERENCES locations(location_id);

-- Reset lại sequence của bảng Sessions
SELECT setval('sessions_session_id_seq', (SELECT MAX(session_id) FROM sessions));


-------------- Update 11/01 ------------------------

-- Thêm cột conference_id vào bảng Sessions
ALTER TABLE sessions 
ADD COLUMN conference_id INT REFERENCES conferences(conf_id);

-- Update dữ liệu giả để test (Giả sử tất cả session hiện tại thuộc Conference ID = 1)
UPDATE sessions SET conference_id = 1 WHERE conference_id IS NULL;
-------------- Update 12/01 ------------------------

-- Thêm cột doi vào bảng Pappers 
ALTER TABLE Papers
ADD COLUMN doi VARCHAR(255);
