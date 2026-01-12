const pool = require('../config/db');

/**
 * Insert new conference
 */
exports.insert = async ({
  conf_name,
  start_date,
  end_date,
  location,
  description
}) => {
  const { rows } = await pool.query(
    `
    INSERT INTO Conferences (
      conf_name,
      start_date,
      end_date,
      location,
      description,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'DRAFT')
    RETURNING *
    `,
    [conf_name, start_date, end_date, location, description]
  );

  return rows[0];
};

/**
 * Find conference by ID
 */
exports.findById = async (conf_id) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM Conferences
    WHERE conf_id = $1
    `,
    [conf_id]
  );

  return rows[0];
};

/**
 * Update conference information
 */
exports.update = async (
  conf_id,
  { conf_name, start_date, end_date, location, description }
) => {
  const { rows } = await pool.query(
    `
    UPDATE Conferences
    SET
      conf_name = $1,
      start_date = $2,
      end_date = $3,
      location = $4,
      description = $5
    WHERE conf_id = $6
    RETURNING *
    `,
    [conf_name, start_date, end_date, location, description, conf_id]
  );

  return rows[0];
};

/**
 * Update conference status
 */
exports.updateStatus = async (conf_id, status) => {
  const { rows } = await pool.query(
    `
    UPDATE Conferences
    SET status = $1
    WHERE conf_id = $2
    RETURNING conf_id, status
    `,
    [status, conf_id]
  );

  return rows[0];
};

/**
 * Get conference overview dashboard
 */
exports.getOverview = async (conf_id) => {
  const { rows } = await pool.query(
    `
    SELECT
      c.conf_id,

      COUNT(DISTINCT p.paper_id)                       AS total_papers,
      COUNT(DISTINCT p.paper_id) FILTER (
        WHERE p.status = 'UNDER_REVIEW'
      )                                                 AS papers_under_review,
      COUNT(DISTINCT p.paper_id) FILTER (
        WHERE p.status = 'ACCEPTED'
      )                                                 AS accepted_papers,

      COUNT(DISTINCT r.registration_id)                AS total_registrations,
      COALESCE(SUM(t.amount), 0)                       AS total_revenue

    FROM Conferences c
    LEFT JOIN Papers p
      ON p.conference_id = c.conf_id
    LEFT JOIN Registrations r
      ON r.paper_id = p.paper_id
    LEFT JOIN Transactions t
      ON t.registration_id = r.registration_id
      AND t.status = 'PAID'

    WHERE c.conf_id = $1
    GROUP BY c.conf_id
    `,
    [conf_id]
  );

  return rows[0];
};


