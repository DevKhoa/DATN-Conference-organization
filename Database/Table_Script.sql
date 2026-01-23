-- 1. Xóa nhóm Đăng ký & Truyền thông
DROP TABLE IF EXISTS Transactions CASCADE;
DROP TABLE IF EXISTS Registrations CASCADE;
DROP TABLE IF EXISTS Ticket_Configs CASCADE;
DROP TABLE IF EXISTS CMS_Contents CASCADE;
DROP TABLE IF EXISTS Email_Logs CASCADE;

-- 2. Xóa nhóm Khoa học (Bài báo & AI)
DROP TABLE IF EXISTS Session_Papers CASCADE;
DROP TABLE IF EXISTS Sessions CASCADE;
DROP TABLE IF EXISTS Review_AI_Metrics CASCADE; 
DROP TABLE IF EXISTS AI_Paper_Analysis_Logs CASCADE; 
DROP TABLE IF EXISTS AI_Analysis_Logs CASCADE; 
DROP TABLE IF EXISTS Reviews CASCADE;
DROP TABLE IF EXISTS Paper_Versions CASCADE;
DROP TABLE IF EXISTS Papers CASCADE;

-- 3. Xóa nhóm Core System (User & Role)
DROP TABLE IF EXISTS User_Roles CASCADE;
DROP TABLE IF EXISTS Roles CASCADE;      
DROP TABLE IF EXISTS Conferences CASCADE;
DROP TABLE IF EXISTS Users CASCADE;

-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- =============================================
-- Bảng quản lý Danh sách Hội nghị / Sự kiện
-- =============================================
CREATE TABLE Conferences (
    conf_id SERIAL PRIMARY KEY,
    conf_name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE -- Trạng thái hoạt động của hội nghị
);
-- =============================================
-- USERS
-- =============================================
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    organization VARCHAR(255), -- Đơn vị công tác
    is_active BOOLEAN DEFAULT TRUE, -- Tài khoản có hoạt động không
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refresh_token TEXT,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP;
);
-- =============================================
-- Bảng Danh mục Quyền
-- =============================================
CREATE TABLE Roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL -- ADMIN, SECRETARIAT, AUTHOR, REVIEWER, ATTENDEE
);

-- Bảng liên kết User - Role (N-N)
-- Một user có thể có nhiều vai trò
CREATE TABLE User_Roles (
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    role_id INT REFERENCES Roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
-- =============================================
-- QUẢN LÝ BÀI BÁO & AI KHOA HỌC
-- =============================================

-- Bảng lưu bài báo gốc 
CREATE TABLE Papers (
    paper_id SERIAL PRIMARY KEY,
    conference_id INT REFERENCES Conferences(conf_id), -- [NEW] Liên kết hội nghị
    title TEXT NOT NULL,
    abstract TEXT,
    primary_author_id INT REFERENCES Users(user_id),
    status VARCHAR(50) DEFAULT 'SUBMITTED' 
        CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'REVISION_REQ')),
    best_paper_candidate BOOLEAN DEFAULT FALSE,
    final_decision_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng quản lý phiên bản (Final Submission) 
CREATE TABLE Paper_Versions (
    version_id SERIAL PRIMARY KEY,
    paper_id INT REFERENCES Papers(paper_id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    version_number INT NOT NULL, 
    is_final BOOLEAN DEFAULT FALSE,
    
    -- Cờ trạng thái kiểm tra nhanh
    plagiarism_safe BOOLEAN DEFAULT NULL, -- NULL: Chưa check, TRUE: An toàn, FALSE: Vi phạm
    format_ok BOOLEAN DEFAULT NULL,       -- TRUE: Đúng định dạng
    
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upload_by INT REFERENCES Users(user_id),
    
    -- [NEĐảm bảo mỗi bài chỉ có 1 bản v1, 1 bản v2...
    UNIQUE (paper_id, version_number) 
);

-- Bảng Review
CREATE TABLE Reviews (
    review_id SERIAL PRIMARY KEY,
    paper_id INT REFERENCES Papers(paper_id),
    reviewer_id INT REFERENCES Users(user_id),
    
    -- Trạng thái và Kết quả review
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
    recommendation VARCHAR(20) CHECK (recommendation IN ('ACCEPT', 'REJECT', 'WEAK_ACCEPT', 'REVISION')),
    
    score DECIMAL(3, 1),
    comments TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Đảm bảo 1 reviewer chỉ review 1 lần cho 1 bài
    UNIQUE (paper_id, reviewer_id)
);
-- Bảng riêng cho AI đánh giá Review
CREATE TABLE Review_AI_Metrics (
    metric_id SERIAL PRIMARY KEY,
    review_id INT REFERENCES Reviews(review_id) ON DELETE CASCADE,
    ai_depth_score DECIMAL(3, 1), -- Điểm độ sâu nhận xét
    ai_sentiment JSONB,           -- Phân tích thái độ
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Log kiểm tra bài báo (Format, Đạo văn)
CREATE TABLE AI_Paper_Analysis_Logs (
    log_id SERIAL PRIMARY KEY,
    version_id INT REFERENCES Paper_Versions(version_id),
    check_type VARCHAR(50) CHECK (check_type IN ('FORMAT_CHECK', 'PROOFREADING', 'PLAGIARISM')),
    result_data JSONB, -- Sử dụng JSONB để linh hoạt lưu kết quả
    passed BOOLEAN DEFAULT FALSE,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Lịch trình & Phiên (AI đề xuất) 
CREATE TABLE Sessions (
    session_id SERIAL PRIMARY KEY,
    session_name VARCHAR(255),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    room_location VARCHAR(100),
    
    -- Cờ đánh dấu: Có phải do AI tạo tự động không?
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
    conference_id INT REFERENCES Conferences(conf_id),
    ticket_name VARCHAR(100) NOT NULL,
    price_vnd BIGINT NOT NULL DEFAULT 0, -- Giá vé VND
    price_usd DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Giá vé USD
    quantity_limit INT,
    sold_quantity INT DEFAULT 0,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE, -- đóng / mở bán
    is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete
    description TEXT
);

-- Hồ sơ đăng ký 
CREATE TABLE Registrations (
    registration_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    ticket_id INT REFERENCES Ticket_Configs(ticket_id),
    
    -- Link tới bài báo (nếu là vé Tác giả/Presenter)
    paper_id INT REFERENCES Papers(paper_id), 
    
    registration_status VARCHAR(50) DEFAULT 'PENDING' 
        CHECK (registration_status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    payment_status VARCHAR(50) DEFAULT 'UNPAID'
        CHECK (payment_status IN ('UNPAID', 'PAID', 'PAYMENT_ERROR', 'REFUNDED', 'FREE')),
    
    -- Mã QR check-in (sinh ra khi PAID)
    qr_code_token VARCHAR(255) UNIQUE, 

    -- Trạng thái Check-in
    checkin_status VARCHAR(20) DEFAULT 'NOT_CHECKED_IN'
        CHECK (checkin_status IN ('NOT_CHECKED_IN', 'CHECKED_IN')),
        
    -- Thời gian check-in thực tế
    checked_in_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);
-- Một user không được mua trùng cùng 1 loại vé. Chỉ bắt trùng NẾU trạng thái vé KHÔNG PHẢI là đã hủy/từ chối
-- Nghĩa là 1 user có thể có 10 dòng 'CANCELLED', nhưng chỉ được phép có 1 dòng 'PENDING'/'APPROVED'/'PAID'
CREATE UNIQUE INDEX unique_active_registration 
ON Registrations (user_id, ticket_id) 
WHERE registration_status NOT IN ('CANCELLED', 'REJECTED');

-- Giao dịch & Đối soát 
CREATE TABLE Transactions (
    trans_id SERIAL PRIMARY KEY,
    registration_id INT REFERENCES Registrations(registration_id) ON DELETE CASCADE,
    
    -- Phân loại giao dịch: Thanh toán / Hoàn tiền
    transaction_type VARCHAR(20) DEFAULT 'PAYMENT' 
        CHECK (transaction_type IN ('PAYMENT', 'REFUND')),

    -- Cổng thanh toán: MOMO / PAYPAL
    payment_gateway VARCHAR(20) NOT NULL 
        CHECK (payment_gateway IN ('MOMO', 'PAYPAL')),

    -- Mã đơn hàng do hệ thống hội nghị sinh ra (gửi sang cổng thanh toán)
    merchant_order_id VARCHAR(100) UNIQUE NOT NULL,

    -- Mã giao dịch do cổng thanh toán trả về (dùng để đối soát)
    gateway_transaction_id VARCHAR(100),

    -- Số tiền và loại tiền thực tế của giao dịch này
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(5) NOT NULL CHECK (currency IN ('VND', 'USD')),

    -- Trạng thái giao dịch
    status VARCHAR(20) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED')),

    -- JSONB lưu toàn bộ phản hồi từ cổng thanh toán (PayerID (PayPal), số ví/thẻ (MoMo), signature, token,...)
    gateway_raw_response JSONB,

    -- Ghi lại lỗi nếu thanh toán thất bại
    error_message TEXT,

    -- Thời gian tạo và cập nhật
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Bảng quản lý Hóa đơn VAT
CREATE TABLE Invoices (
    invoice_id SERIAL PRIMARY KEY,
    registration_id INT REFERENCES Registrations(registration_id),
    user_id INT REFERENCES Users(user_id), -- Người yêu cầu
    
    -- Thông tin xuất hóa đơn
    company_name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    email_receive VARCHAR(255) NOT NULL, -- Email nhận hóa đơn
    
    status VARCHAR(20) DEFAULT 'REQUESTED' 
        CHECK (status IN ('REQUESTED', 'SENT')),
    
    invoice_url TEXT, -- Link file hóa đơn (PDF) nếu có sau khi xuất
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP
);