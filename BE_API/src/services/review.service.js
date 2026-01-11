const reviewRepo = require('../repositories/review.repo');

exports.getReviewers = () => {
  return reviewRepo.getReviewers();
};

exports.assignReviewer = (data) => {
  return reviewRepo.assignReviewer(data);
};

exports.getReviewerDashboard = (reviewer_id) => {
  if (!reviewer_id) throw new Error('reviewer_id is required');
  return reviewRepo.getReviewerDashboard(reviewer_id);
};

exports.submitReview = (data) => {
  return reviewRepo.submitReview(data);
};

exports.getReviewSummary = (paper_id) => {
  if (!paper_id) throw new Error('paper_id is required');
  return reviewRepo.getReviewSummary(paper_id);
};
