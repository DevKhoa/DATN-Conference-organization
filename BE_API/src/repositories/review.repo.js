const pool = require('../config/db');

/**
 * Get all reviewers
 */
exports.getReviewers = async () => {
  const { rows } = await pool.query(`
    SELECT
      u.user_id AS reviewer_id,
      u.full_name,
      u.email,
      u.organization
    FROM Users u
    JOIN User_Roles ur ON ur.user_id = u.user_id
    JOIN Roles r ON r.role_id = ur.role_id
    WHERE r.role_name = 'REVIEWER'
  `);
  return rows;
};

/**
 * Assign reviewer to paper
 */
exports.assignReviewer = async ({ paper_id, reviewer_id, assigned_by }) => {
  const { rows } = await pool.query(`
    INSERT INTO Reviewer_Assignments (
      paper_id,
      reviewer_id,
      assigned_by
    )
    VALUES ($1, $2, $3)
    RETURNING assignment_id, paper_id, reviewer_id, assigned_at
  `, [paper_id, reviewer_id, assigned_by]);

  return rows[0];
};

/**
 * Reviewer dashboard
 */
exports.getReviewerDashboard = async (reviewer_id) => {
  const { rows } = await pool.query(`
    SELECT
      p.paper_id,
      p.title,
      p.abstract,
      ra.assigned_at
    FROM Reviewer_Assignments ra
    JOIN Papers p ON p.paper_id = ra.paper_id
    WHERE ra.reviewer_id = $1
  `, [reviewer_id]);

  return rows;
};

/**
 * Submit review
 */
exports.submitReview = async ({
  paper_id,
  reviewer_id,
  score,
  recommendation,
  comments
}) => {
  const { rows } = await pool.query(`
    INSERT INTO Reviews (
      paper_id,
      reviewer_id,
      score,
      recommendation,
      comments,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'COMPLETED')
    ON CONFLICT (paper_id, reviewer_id)
    DO UPDATE SET
      score = EXCLUDED.score,
      recommendation = EXCLUDED.recommendation,
      comments = EXCLUDED.comments,
      status = 'COMPLETED',
      review_date = now()
    RETURNING review_id, paper_id, status
  `, [paper_id, reviewer_id, score, recommendation, comments]);

  return rows[0];
};

/**
 * Review summary for chair
 */
exports.getReviewSummary = async (paper_id) => {
  const { rows } = await pool.query(`
    SELECT
      paper_id,
      AVG(score) AS average_score,
      COUNT(*) FILTER (WHERE recommendation = 'ACCEPT') AS accept_count,
      COUNT(*) FILTER (WHERE recommendation = 'REJECT') AS reject_count
    FROM Reviews
    WHERE paper_id = $1
    GROUP BY paper_id
  `, [paper_id]);

  return rows[0];
};

/**
 * Vote (Make Final Decision)
 */
exports.votePaper = async ({ paper_id, vote, decided_by }) => {
  const { rows } = await pool.query(`
    INSERT INTO Paper_Decisions (paper_id, decision, decided_by, decided_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING 
        decision_id, 
        paper_id, 
        decision AS final_vote, 
        decided_at  -- [THÊM] Trả về ngày duyệt
  `, [paper_id, vote, decided_by]);
  
  // Cập nhật trạng thái bài báo
  if (vote) {
      await pool.query(`
        UPDATE Papers 
        SET status = CASE WHEN $1 = 'ACCEPT' THEN 'ACCEPTED' ELSE 'REJECTED' END,
            final_decision_date = NOW()
        WHERE paper_id = $2
      `, [vote, paper_id]);
  }

  return rows[0];
};

/**
 * Adjudicate (Resolve Conflicts)
 * Logic: Ghi chú xử lý mâu thuẫn vào Paper_Decisions (hoặc cập nhật note nếu đã có decision)
 */
exports.adjudicatePaper = async ({ paper_id, decision_note, decided_by }) => {
  // Kiểm tra xem đã có quyết định chưa, nếu chưa thì tạo mới với trạng thái pending hoặc chỉ lưu note
  // Ở đây giả định Adjudicate là bước ghi chú giải quyết mâu thuẫn trước khi Vote hoặc kèm theo Vote  
  const { rows } = await pool.query(`
    INSERT INTO Paper_Decisions (paper_id, decision_note, decided_by, decided_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING paper_id, decision_note, true as adjudicated
  `, [paper_id, decision_note, decided_by]);

  return rows[0];
};