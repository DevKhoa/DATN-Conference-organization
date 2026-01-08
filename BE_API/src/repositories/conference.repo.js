const db = require('../config/db');

exports.createConference = async (payload) => {
  const { conf_name, start_date, end_date, location } = payload;

  const result = await db.query(
    `INSERT INTO Conferences (conf_name, start_date, end_date, location)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [conf_name, start_date, end_date, location]
  );

  return result.rows[0];
};

exports.getConferenceById = async (id) => {
  const result = await db.query(
    `SELECT * FROM Conferences WHERE conf_id = $1`,
    [id]
  );
  return result.rows[0];
};

exports.updateConference = async (id, payload) => {
  const { conf_name, start_date, end_date, location } = payload;

  const result = await db.query(
    `UPDATE Conferences
     SET conf_name = $1,
         start_date = $2,
         end_date = $3,
         location = $4
     WHERE conf_id = $5
     RETURNING *`,
    [conf_name, start_date, end_date, location, id]
  );

  return result.rows[0];
};

exports.updateStatus = async (id, status) => {
  const result = await db.query(
    `UPDATE Conferences
     SET is_active = $1
     WHERE conf_id = $2
     RETURNING *`,
    [status === 'PUBLISHED', id]
  );
  return result.rows[0];
};
