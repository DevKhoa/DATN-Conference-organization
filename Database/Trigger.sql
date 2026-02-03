--  Tạo các ràng buộc cho CSDL
-- 1. Ràng buộc về Thời gian & Logic Ngày tháng
-- Bảng Hội nghị (Conferences): Ngày kết thúc >= Ngày bắt đầu
ALTER TABLE Conferences
ADD CONSTRAINT chk_conf_dates 
CHECK (end_date >= start_date);

-- Bảng Phiên họp (Sessions): Giờ kết thúc > Giờ bắt đầu
ALTER TABLE Sessions
ADD CONSTRAINT chk_session_times 
CHECK (end_time > start_time);

-- Bảng Vé (Ticket_Configs): 
-- Thời gian đóng cổng > Thời gian mở cổng
-- Số lượng bán ra không được âm
ALTER TABLE Ticket_Configs
ADD CONSTRAINT chk_ticket_times CHECK (close_time > open_time),
ADD CONSTRAINT chk_ticket_sold_non_negative CHECK (sold_quantity >= 0);

-- Bảng Bài báo (Papers): Ngày ra quyết định phải sau ngày tạo
ALTER TABLE Papers
ADD CONSTRAINT chk_decision_date 
CHECK (final_decision_date IS NULL OR final_decision_date >= created_at);

-- 2. Ràng buộc về Giá trị số và Định dạng
-- Bảng Vé (Ticket_Configs): Giá vé không âm
ALTER TABLE Ticket_Configs
ADD CONSTRAINT chk_ticket_price_vnd CHECK (price_vnd >= 0),
ADD CONSTRAINT chk_ticket_price_usd CHECK (price_usd >= 0);

-- Bảng Giao dịch (Transactions): Số tiền thanh toán > 0
ALTER TABLE Transactions
ADD CONSTRAINT chk_transaction_amount 
CHECK (amount > 0);

-- Bảng Đánh giá (Reviews): Điểm số nên nằm trong thang điểm cụ thể (Ví dụ: 0 đến 10)
-- Giả sử hệ thống dùng thang 10.0
ALTER TABLE Reviews
ADD CONSTRAINT chk_review_score_range 
CHECK (score IS NULL OR (score >= 0 AND score <= 10));

-- Bảng Địa điểm (Locations - từ Table_Bonus2): Sức chứa > 0
ALTER TABLE locations
ADD CONSTRAINT chk_location_capacity 
CHECK (capacity > 0);

-- Bảng Paper_Versions: Số phiên bản phải dương
ALTER TABLE Paper_Versions
ADD CONSTRAINT chk_version_number 
CHECK (version_number > 0);

-- 3. Ràng buộc Logic Nghiệp vụ phức tạp (Triggers)
-- Logic: Tác giả chính (primary_author_id) không được phép làm Reviewer cho chính bài báo của mình.
CREATE OR REPLACE FUNCTION check_conflict_of_interest()
RETURNS TRIGGER AS $$
DECLARE
    author_id INT;
BEGIN
    -- Lấy ID tác giả của bài báo
    SELECT primary_author_id INTO author_id 
    FROM Papers 
    WHERE paper_id = NEW.paper_id;

    -- Kiểm tra nếu người được gán review trùng với tác giả
    IF NEW.reviewer_id = author_id THEN
        RAISE EXCEPTION 'CONFLICT_ERROR: Tác giả (User ID %) không thể review bài báo của chính mình.', author_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng cho bảng phân công Review (Reviewer_Assignments trong Table_Bonus1)
CREATE TRIGGER trg_check_reviewer_conflict
BEFORE INSERT OR UPDATE ON Reviewer_Assignments
FOR EACH ROW
EXECUTE FUNCTION check_conflict_of_interest();

-- Logic: Không được phép tạo Đăng ký (Registrations) mới 
-- nếu số lượng vé đã bán (sold_quantity) đạt mức giới hạn (quantity_limit)
CREATE OR REPLACE FUNCTION check_ticket_availability()
RETURNS TRIGGER AS $$
DECLARE
    sold INT;
    "limit" INT;
BEGIN
    -- Lấy thông tin số lượng
    SELECT sold_quantity, quantity_limit INTO sold, "limit"
    FROM Ticket_Configs
    WHERE ticket_id = NEW.ticket_id;

    -- Nếu có giới hạn và đã bán hết
    IF "limit" IS NOT NULL AND sold >= "limit" THEN
        RAISE EXCEPTION 'SOLD_OUT: Loại vé này đã bán hết số lượng cho phép.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_ticket_limit
BEFORE INSERT ON Registrations
FOR EACH ROW
EXECUTE FUNCTION check_ticket_availability();

-- Logic: Khi một Registrations chuyển sang trạng thái PAID, 
-- tự động tăng sold_quantity trong bảng Ticket_Configs
CREATE OR REPLACE FUNCTION update_sold_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu trạng thái chuyển sang PAID
    IF NEW.payment_status = 'PAID' AND (OLD.payment_status <> 'PAID' OR OLD.payment_status IS NULL) THEN
        UPDATE Ticket_Configs
        SET sold_quantity = sold_quantity + 1
        WHERE ticket_id = NEW.ticket_id;
    
    -- Nếu hoàn tiền hoặc hủy vé đã paid thì giảm xuống
    ELSIF (NEW.payment_status = 'REFUNDED' OR NEW.registration_status = 'CANCELLED') 
          AND OLD.payment_status = 'PAID' THEN
        UPDATE Ticket_Configs
        SET sold_quantity = sold_quantity - 1
        WHERE ticket_id = NEW.ticket_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_ticket_sold
AFTER UPDATE ON Registrations
FOR EACH ROW
EXECUTE FUNCTION update_sold_quantity();

-- 4.
-- Một User chỉ được Check-in 1 lần cho 1 vé
-- Đã có UNIQUE(user_id, ticket_id) trong bảng Registration
-- Tránh duplicate tên Template Email
ALTER TABLE Email_Templates
ADD CONSTRAINT uq_template_name UNIQUE (template_name);
-- Đảm bảo Transaction ID từ Merchant (Hệ thống mình) là duy nhất
ALTER TABLE Transactions
ADD CONSTRAINT uq_merchant_order UNIQUE (merchant_order_id);

