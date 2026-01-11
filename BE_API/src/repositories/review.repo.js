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
