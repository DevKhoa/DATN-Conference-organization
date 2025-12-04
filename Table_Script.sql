-- =============================================
-- USERS
-- =============================================

CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('ADMIN', 'SECRETARIAT', 'AUTHOR', 'REVIEWER', 'ATTENDEE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- QUẢN LÝ BÀI BÁO & AI KHOA HỌC
-- =============================================

-- Bảng lưu bài báo gốc 
CREATE TABLE Papers (
    paper_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    primary_author_id INT REFERENCES Users(user_id),
    status VARCHAR(50) DEFAULT 'SUBMITTED' 
        CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'REVISION_REQ')),
    final_decision_date TIMESTAMP,
    best_paper_candidate BOOLEAN DEFAULT FALSE, -- Cờ đánh dấu ứng viên Best Paper 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng quản lý phiên bản (Final Submission) 
CREATE TABLE Paper_Versions (
    version_id SERIAL PRIMARY KEY,
    paper_id INT REFERENCES Papers(paper_id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    version_number INT NOT NULL, -- Vd: 1, 2, 3
    is_final BOOLEAN DEFAULT FALSE, -- Xác nhận đây là bản chốt
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upload_by INT REFERENCES Users(user_id)
);

-- Bảng Review & AI đánh gía
CREATE TABLE Reviews (
    review_id SERIAL PRIMARY KEY,
    paper_id INT REFERENCES Papers(paper_id),
    reviewer_id INT REFERENCES Users(user_id),
    score DECIMAL(3, 1), -- Điểm số từ người
    comments TEXT,
    
    -- AI 
    ai_depth_score DECIMAL(3, 1), -- Điểm độ sâu do AI chấm
    ai_sentiment_analysis JSONB, -- Phân tích thái độ (Lưu dạng JSON)
    
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng lưu lịch sử AI kiểm tra 
CREATE TABLE AI_Analysis_Logs (
    log_id SERIAL PRIMARY KEY,
    paper_version_id INT REFERENCES Paper_Versions(version_id),
    check_type VARCHAR(50) CHECK (check_type IN ('FORMAT_CHECK', 'PROOFREADING', 'PLAGIARISM')),
    
    -- Kết quả chi tiết từ AI (Lỗi font, lỗi ngữ pháp, % trùng lặp)
    result_data JSONB, 
    
    passed BOOLEAN DEFAULT FALSE, -- Đạt chuẩn hay chưa
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Lịch trình & Phiên (AI đề xuất) 
CREATE TABLE Sessions (
    session_id SERIAL PRIMARY KEY,
    session_name VARCHAR(255),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    room_location VARCHAR(100),
    
    -- Cờ đánh dấu do AI tạo tự động
    is_ai_generated BOOLEAN DEFAULT FALSE, 
    chair_person_id INT REFERENCES Users(user_id)
);

-- Bảng liên kết Bài báo vào Phiên (Nhiều bài trong 1 phiên)
CREATE TABLE Session_Papers (
    session_id INT REFERENCES Sessions(session_id),
    paper_id INT REFERENCES Papers(paper_id),
    presentation_order INT, -- Thứ tự trình bày
    PRIMARY KEY (session_id, paper_id)
);

-- =============================================
-- QUẢN LÝ ĐĂNG KÝ & TRUYỀN THÔNG
-- =============================================

-- Cấu hình vé (Mở/đóng cổng) 
CREATE TABLE Ticket_Configs (
    ticket_id SERIAL PRIMARY KEY,
    ticket_name VARCHAR(100) NOT NULL, -- Vd: Early Bird, Student, Regular
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    quantity_limit INT,
    sold_quantity INT DEFAULT 0,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    description TEXT
);

-- Hồ sơ đăng ký 
CREATE TABLE Registrations (
    registration_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    ticket_id INT REFERENCES Ticket_Configs(ticket_id),
    
    -- Trạng thái quy trình: Chờ duyệt, Đã duyệt, Hủy
    registration_status VARCHAR(50) DEFAULT 'PENDING' 
        CHECK (registration_status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    
    -- Trạng thái thanh toán 
    payment_status VARCHAR(50) DEFAULT 'UNPAID'
        CHECK (payment_status IN ('UNPAID', 'PAID', 'PAYMENT_ERROR', 'REFUNDED')),
        
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Giao dịch
CREATE TABLE Transactions (
    trans_id SERIAL PRIMARY KEY,
    registration_id INT REFERENCES Registrations(registration_id),
    gateway_trans_code VARCHAR(100), -- TransactionID từ cổng thanh toán
    amount DECIMAL(10, 2),
    
    -- Trạng thái giao dịch chi tiết
    status VARCHAR(50), 
    error_log TEXT, -- Ghi chú nếu có lỗi thanh toán
    
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CMS & Truyền thông
CREATE TABLE CMS_Contents (
    content_id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    body_content TEXT, -- Có thể chứa HTML
    content_type VARCHAR(50) CHECK (content_type IN ('CFP', 'AGENDA', 'VENUE', 'POST_EVENT_MAIL')),
    
    scheduled_publish_time TIMESTAMP, -- Lịch trình xuất bản
    is_published BOOLEAN DEFAULT FALSE,
    created_by INT REFERENCES Users(user_id)
);

-- Log gửi Email (Để theo dõi việc gửi mail cảm ơn/xác nhận)
CREATE TABLE Email_Logs (
    email_log_id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(255),
    email_type VARCHAR(50), -- Vd: PAYMENT_CONFIRM, THANK_YOU
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('SENT', 'FAILED'))
);