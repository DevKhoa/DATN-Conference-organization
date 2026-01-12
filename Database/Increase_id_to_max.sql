-- do lỡ insert thủ công mấy cái id có kiểu data SERIAL nên thành ra bị lệch id khi thêm hội nghị hay bài review mới
-- nên query cho nó lên max để insert trên web 
SELECT setval(
  pg_get_serial_sequence('Conferences', 'conf_id'),
  (SELECT MAX(conf_id) FROM Conferences)
);


SELECT setval(
  pg_get_serial_sequence('Reviews', 'review_id'),
  (SELECT MAX(review_id) FROM Reviews)
);
