-- Conferences
INSERT INTO Conferences (conf_id, conf_name, start_date, end_date, location) VALUES 
(1, 'Vietnam AI Summit 2024', '2024-12-01', '2024-12-03', 'Ho Chi Minh City'),
(2, 'Blockchain Global 2025', '2025-06-15', '2025-06-17', 'Da Nang');

-- Roles
INSERT INTO Roles (role_id, role_name) VALUES 
(1, 'ADMIN'), (2, 'SECRETARIAT'), (3, 'AUTHOR'), (4, 'REVIEWER'), (5, 'ATTENDEE');

-- Users
INSERT INTO Users (user_id, full_name, email, password_hash, organization) VALUES 
(1, 'Nguyen Admin', 'admin@conf.com', 'hash1', 'BTC'),             -- ADMIN
(2, 'Le Author', 'alice@uni.edu.vn', 'hash2', 'Hanoi University'), -- AUTHOR + ATTENDEE
(3, 'Tran Reviewer', 'bob@tech.com', 'hash3', 'FPT Software'),     -- REVIEWER
(4, 'Pham Attendee', 'charlie@student.com', 'hash4', 'BK U');      -- ATTENDEE

-- User_Roles
INSERT INTO User_Roles (user_id, role_id) VALUES 
(1, 1), -- Admin
(2, 3), -- Alice (Author)
(2, 5), -- Alice (Attendee)
(3, 4), -- Bob (Reviewer)
(4, 5); -- Charlie (Attendee)

-- Papers
INSERT INTO Papers (paper_id, conference_id, title, primary_author_id, status) VALUES 
(1, 1, 'Optimizing LLMs for Vietnamese Language', 2, 'ACCEPTED'),
(2, 1, 'Secure Smart Contract Design', 2, 'UNDER_REVIEW');

-- Paper_Versions
INSERT INTO Paper_Versions (version_id, paper_id, file_path, version_number, is_final, plagiarism_safe, format_ok) 
VALUES 
(1, 1, '/uploads/p1_v1.pdf', 1, FALSE, NULL, NULL),
(2, 1, '/uploads/p1_v2_final.pdf', 2, TRUE, TRUE, TRUE),
(3, 2, '/uploads/p2_v1.pdf', 1, FALSE, NULL, NULL);

-- AI_Paper_Analysis_Logs
INSERT INTO AI_Paper_Analysis_Logs (log_id, version_id, check_type, result_data, passed) VALUES 
(1, 2, 'PLAGIARISM', '{"similarity": 5.2}', TRUE),
(2, 2, 'FORMAT_CHECK', '{"font_error": 0}', TRUE);

-- Reviews
INSERT INTO Reviews (review_id, paper_id, reviewer_id, status, recommendation, score) VALUES 
(1, 1, 3, 'COMPLETED', 'ACCEPT', 4.5),
(2, 2, 3, 'COMPLETED', 'REVISION', 3.0);

-- Review_AI_Metrics
INSERT INTO Review_AI_Metrics (metric_id, review_id, ai_depth_score, ai_sentiment) VALUES 
(1, 1, 8.5, '{"positive": 0.8}'),
(2, 2, 6.2, '{"constructive": 0.5}');

-- Sessions
INSERT INTO Sessions (session_id, session_name, start_time, room_location, is_ai_generated) VALUES 
(1, 'NLP Morning Session', '2024-12-02 08:00:00', 'Hall A', FALSE);

-- Session_Papers
INSERT INTO Session_Papers (session_id, paper_id, presentation_order) VALUES 
(1, 1, 1);

-- Ticket_Configs
INSERT INTO Ticket_Configs (ticket_id, conference_id, ticket_name, price, quantity_limit, open_time, close_time) VALUES 
(1, 1, 'Early Bird Author', 1500000, 100, '2024-01-01', '2024-11-01'),
(2, 1, 'Regular Attendee', 2000000, 200, '2024-06-01', '2024-11-20');

-- Registrations
INSERT INTO Registrations (registration_id, user_id, ticket_id, paper_id, registration_status, payment_status, qr_code_token) VALUES 
(1, 2, 1, 1, 'APPROVED', 'PAID', 'QR_ALICE_AUTH'),
(2, 4, 2, NULL, 'PENDING', 'UNPAID', NULL);

-- Transactions
INSERT INTO Transactions (trans_id, registration_id, payment_gateway, gateway_trans_code, amount, status) VALUES 
(1, 1, 'MOMO', 'MOMO_TRANS_9999', 1500000, 'SUCCESS'),
(2, 2, 'VNPAY', 'VNPAY_TRANS_8888', 2000000, 'PAYMENT_ERROR');

-- CMS_Contents
INSERT INTO CMS_Contents (content_id, title, body_content, content_type, is_published, created_by) VALUES 
(1, 'Call for Papers 2024', '<p>Submit your paper now!</p>', 'CFP', TRUE, 1);

-- Email_Logs
INSERT INTO Email_Logs (email_log_id, recipient_email, email_type, status) VALUES 
(1, 'alice@uni.edu.vn', 'PAYMENT_CONFIRM', 'SENT'),
(2, 'charlie@student.com', 'PAYMENT_REMINDER', 'SENT');

-- Check data
-- 1. CORE SYSTEM
SELECT * FROM Conferences;
SELECT * FROM Roles;
SELECT * FROM Users;
SELECT * FROM User_Roles;

-- 2. SCIENTIFIC MODULE
SELECT * FROM Papers;
SELECT * FROM Paper_Versions;
SELECT * FROM AI_Paper_Analysis_Logs;
SELECT * FROM Reviews;
SELECT * FROM Review_AI_Metrics;
SELECT * FROM Sessions;
SELECT * FROM Session_Papers;

-- 3. REGISTRATION & COMMUNICATION
SELECT * FROM Ticket_Configs;
SELECT * FROM Registrations;
SELECT * FROM Transactions;
SELECT * FROM CMS_Contents;
SELECT * FROM Email_Logs;