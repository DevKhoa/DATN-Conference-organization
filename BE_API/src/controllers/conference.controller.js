exports.createConference = (req, res) => {
  res.status(201).json({
    message: 'Conference created',
    data: req.body
  });
};

exports.getAllConferences = (req, res) => {
  res.json({
    data: []
  });
};

exports.getConferenceById = (req, res) => {
  res.json({
    id: req.params.id
  });
};

exports.updateConferenceStatus = (req, res) => {
  res.json({
    id: req.params.id,
    status: req.body.status
  });
};
