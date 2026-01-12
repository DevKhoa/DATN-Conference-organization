const reviewService = require('../services/review.service');

exports.getReviewers = async (req, res) => {
  res.json(await reviewService.getReviewers());
};

exports.assignReviewer = async (req, res) => {
  res.status(201).json(
    await reviewService.assignReviewer(req.body)
  );
};

exports.reviewerDashboard = async (req, res) => {
  const { reviewer_id } = req.query;
  res.json(
    await reviewService.getReviewerDashboard(reviewer_id)
  );
};

exports.submitReview = async (req, res) => {
  res.status(201).json(
    await reviewService.submitReview(req.body)
  );
};

exports.reviewSummary = async (req, res) => {
  const { paper_id } = req.query;
  res.json(
    await reviewService.getReviewSummary(paper_id)
  );
};

exports.votePaper = async (req, res) => {
  res.json(
    await reviewService.votePaper(req.body)
  );
};

exports.adjudicatePaper = async (req, res) => {
  res.json(
    await reviewService.adjudicatePaper(req.body)
  );
};