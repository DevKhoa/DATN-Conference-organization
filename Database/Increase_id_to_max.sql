SELECT setval(
  pg_get_serial_sequence('Conferences', 'conf_id'),
  (SELECT MAX(conf_id) FROM Conferences)
);


SELECT setval(
  pg_get_serial_sequence('Reviews', 'review_id'),
  (SELECT MAX(review_id) FROM Reviews)
);
