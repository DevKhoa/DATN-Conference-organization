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
 * Get conference overview
 */
exports.getOverview = async (conf_id) => {
  const { rows } = await pool.query(
    `
    SELECT
      c.conf_id,
      c.conf_name,
      c.status,
      COUNT(p.paper_id) AS total_papers
    FROM Conferences c
    LEFT JOIN Papers p
      ON p.conference_id = c.conf_id
    WHERE c.conf_id = $1
    GROUP BY c.conf_id, c.conf_name, c.status
    `,
    [conf_id]
  );

  return rows[0];
};
