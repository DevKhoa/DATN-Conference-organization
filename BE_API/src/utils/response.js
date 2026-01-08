exports.success = (res, data, message = 'OK') => {
  res.json({
    success: true,
    message,
    data,
  });
};

exports.error = (res, status, message) => {
  res.status(status).json({
    success: false,
    message,
  });
};
