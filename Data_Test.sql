-- =============================================
-- 1. DATA FOR USERS (Admin, Secretariat, Authors, Reviewers, Attendees)
-- =============================================
INSERT INTO Users (user_id, full_name, email, password_hash, role) VALUES 
(1, 'Nguyen Van A', 'nguyenvana@email.com', 'hash123', 'ADMIN'),
(2, 'Le Thi B', 'lethib@email.com', 'hash123', 'SECRETARIAT'),
(3, 'Tran Van C', 'tranvanc@email.com', 'hash123', 'AUTHOR'),
(4, 'Pham Thi D', 'phamthid@email.com', 'hash123', 'AUTHOR'),
(5, 'Dr. Nguyen E', 'nguyene@email.com', 'hash123', 'REVIEWER'),
(6, 'Prof. Le F', 'lef@email.com', 'hash123', 'REVIEWER'),
(7, 'Hoang Van G', 'hoangvang@email.com', 'hash123', 'ATTENDEE'),
(8, 'Do Thi H', 'dothih@email.com', 'hash123', 'ATTENDEE');

-- =============================================
-- 2. DATA FOR PAPERS (Bài báo)
-- =============================================
INSERT INTO Papers (paper_id, title, abstract, primary_author_id, status, best_paper_candidate) VALUES 
(1, 'Deep Learning in Healthcare', 'Abstract about DL applications...', 3, 'SUBMITTED', FALSE),
(2, 'Blockchain for Data Security', 'Abstract about Blockchain security...', 4, 'ACCEPTED', TRUE), -- Ứng viên Best Paper
(3, 'AI in Climate Change', 'Abstract about AI prediction models...', 3, 'UNDER_REVIEW', FALSE);

-- =============================================
-- 3. DATA FOR PAPER VERSIONS (Phiên bản nộp)
-- =============================================
INSERT INTO Paper_Versions (version_id, paper_id, file_path, version_number, is_final) VALUES 
(1, 1, '/files/p1_v1.pdf', 1, FALSE),
(2, 2, '/files/p2_v1.pdf', 1, FALSE),
(3, 2, '/files/p2_v2_final.pdf', 2, TRUE), -- Bản Final của bài 2
(4, 3, '/files/p3_v1.pdf', 1, FALSE);

-- =============================================
-- 4. DATA FOR REVIEWS (AI Attributes -> NULL)
-- =============================================
-- Lưu ý: ai_depth_score và ai_sentiment_analysis để NULL
INSERT INTO Reviews (review_id, paper_id, reviewer_id, score, comments, ai_depth_score, ai_sentiment_analysis) VALUES 
(1, 2, 5, 4.5, 'Excellent paper, good methodology.', NULL, NULL),
(2, 2, 6, 4.0, 'Good but needs minor revision.', NULL, NULL),
(3, 3, 5, 3.5, 'Interesting topic but lacks data.', NULL, NULL);

-- =============================================
-- 5. DATA FOR AI ANALYSIS LOGS (AI Result Data -> NULL)
-- =============================================
-- Log ghi nhận có hoạt động kiểm tra, nhưng chưa có kết quả (NULL)
INSERT INTO AI_Analysis_Logs (log_id, paper_version_id, check_type, result_data, passed) VALUES 
(1, 1, 'FORMAT_CHECK', NULL, FALSE),
(2, 3, 'PLAGIARISM', NULL, TRUE);

-- =============================================
-- 6. DATA FOR SESSIONS (Lịch trình)
-- =============================================
-- is_ai_generated để FALSE vì chưa chạy AI sắp xếp
INSERT INTO Sessions (session_id, session_name, start_time, end_time, room_location, is_ai_generated, chair_person_id) VALUES 
(1, 'Morning Session: AI Tech', '2023-11-20 08:00:00', '2023-11-20 12:00:00', 'Room 101', FALSE, 5),
(2, 'Afternoon Session: Security', '2023-11-20 13:00:00', '2023-11-20 17:00:00', 'Room 102', FALSE, 6);

-- =============================================
-- 7. DATA FOR SESSION PAPERS (Gán bài vào phiên)
-- =============================================
INSERT INTO Session_Papers (session_id, paper_id, presentation_order) VALUES 
(1, 1, 1), -- Bài 1 báo cáo đầu tiên phiên sáng
(1, 3, 2), -- Bài 3 báo cáo thứ hai phiên sáng
(2, 2, 1); -- Bài 2 báo cáo đầu tiên phiên chiều

-- =============================================
-- 8. DATA FOR TICKET CONFIGS (Loại vé)
-- =============================================
INSERT INTO Ticket_Configs (ticket_id, ticket_name, price, quantity_limit, sold_quantity, open_time, close_time) VALUES 
(1, 'Early Bird', 1000000, 50, 10, '2023-01-01 00:00:00', '2023-06-01 00:00:00'),
(2, 'Regular', 2000000, 100, 5, '2023-06-02 00:00:00', '2023-11-01 00:00:00');

-- =============================================
-- 9. DATA FOR REGISTRATIONS (Đăng ký tham dự)
-- =============================================
INSERT INTO Registrations (registration_id, user_id, ticket_id, registration_status, payment_status) VALUES 
(1, 7, 1, 'APPROVED', 'PAID'),  -- User 7 đã trả tiền vé Early Bird
(2, 8, 2, 'PENDING', 'UNPAID'); -- User 8 đăng ký vé thường nhưng chưa trả

-- =============================================
-- 10. DATA FOR TRANSACTIONS (Giao dịch)
-- =============================================
INSERT INTO Transactions (trans_id, registration_id, gateway_trans_code, amount, status, error_log) VALUES 
(1, 1, 'MOMO_123456789', 1000000, 'SUCCESS', NULL);

-- =============================================
-- 11. DATA FOR CMS CONTENTS (Tin tức)
-- =============================================
INSERT INTO CMS_Contents (content_id, title, body_content, content_type, scheduled_publish_time, is_published, created_by) VALUES 
(1, 'Call for Papers 2023', '<p>Welcome to submit...</p>', 'CFP', '2023-01-01 00:00:00', TRUE, 2);

-- Truy vấn data 
-- User
SELECT * FROM Users;

-- BÀI BÁO & AI
SELECT * FROM Papers;
SELECT * FROM Paper_Versions;
SELECT * FROM Reviews;       
SELECT * FROM AI_Analysis_Logs; 
SELECT * FROM Sessions;
SELECT * FROM Session_Papers;

-- ĐĂNG KÝ & TRUYỀN THÔNG
SELECT * FROM Ticket_Configs;
SELECT * FROM Registrations;
SELECT * FROM Transactions;
SELECT * FROM CMS_Contents;
