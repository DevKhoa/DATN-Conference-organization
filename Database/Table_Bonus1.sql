-- Conference lifecycle (cho /conferences/:id/status)
ALTER TABLE Conferences
ADD COLUMN status VARCHAR(30) DEFAULT 'DRAFT'
CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED'));

ALTER TABLE Conferences
ADD COLUMN description TEXT;

--Dùng cho API:
-- POST /reviews/assign
-- GET /reviewer/dashboard
CREATE TABLE Reviewer_Assignments (
    assignment_id SERIAL PRIMARY KEY,
    paper_id INT REFERENCES Papers(paper_id) ON DELETE CASCADE,
    reviewer_id INT REFERENCES Users(user_id),
    assigned_by INT REFERENCES Users(user_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (paper_id, reviewer_id)
);

-- Final Decision Log (cho /decisions/finalize)
CREATE TABLE Paper_Decisions (
    decision_id SERIAL PRIMARY KEY,
    paper_id INT REFERENCES Papers(paper_id),
    decision VARCHAR(20) CHECK (decision IN ('ACCEPT', 'REJECT')),
    decided_by INT REFERENCES Users(user_id),
    decision_note TEXT,
    decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dùng cho:
-- /agenda/draft
-- /agenda/comment
-- /agenda/approve
CREATE TABLE Agenda_Drafts (
    draft_id SERIAL PRIMARY KEY,
    conference_id INT REFERENCES Conferences(conf_id),
    version INT NOT NULL,
    is_final BOOLEAN DEFAULT FALSE,
    created_by INT REFERENCES Users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (conference_id, version)
);

CREATE TABLE Agenda_Comments (
    comment_id SERIAL PRIMARY KEY,
    draft_id INT REFERENCES Agenda_Drafts(draft_id) ON DELETE CASCADE,
    commenter_id INT REFERENCES Users(user_id),
    comment_text TEXT,
    commented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gắn trực tiếp với:
-- /emails/templates
-- /notifications/send-bulk
CREATE TABLE Email_Templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE,
    subject VARCHAR(255),
    body_html TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);