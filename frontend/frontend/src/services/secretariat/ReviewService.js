/**
 * REVIEW SERVICE - Mock API
 * Handles review decisions, best paper evaluation, and reviewer management
 */

const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

let mockReviews = [
  {
    id: "P001",
    title: "Deep Learning for Medical Imaging",
    avg: 4.2,
    count: 3,
    status: "Accepted",
    reviews: [
      { reviewerId: "R1", score: 4.5, confidence: 4, comments: "Strong paper with novel approach" },
      { reviewerId: "R2", score: 4.0, confidence: 3, comments: "Good work, minor revisions needed" },
      { reviewerId: "R3", score: 4.1, confidence: 5, comments: "Solid contribution to the field" },
    ],
  },
  {
    id: "P002",
    title: "Blockchain Transparency Systems",
    avg: 3.8,
    count: 3,
    status: "Accepted",
    reviews: [
      { reviewerId: "R4", score: 4.0, confidence: 4, comments: "Interesting blockchain application" },
      { reviewerId: "R5", score: 3.5, confidence: 3, comments: "Needs more evaluation" },
      { reviewerId: "R6", score: 3.9, confidence: 4, comments: "Accept with minor changes" },
    ],
  },
  {
    id: "P003",
    title: "Quantum Optimization Models",
    avg: 3.5,
    count: 2,
    status: "Minor Revision",
    reviews: [
      { reviewerId: "R7", score: 3.7, confidence: 3, comments: "Promising but needs more work" },
      { reviewerId: "R8", score: 3.3, confidence: 4, comments: "Minor revisions required" },
    ],
  },
  {
    id: "P004",
    title: "IoT Security Framework",
    avg: 2.8,
    count: 3,
    status: "Major Revision",
    reviews: [
      { reviewerId: "R9", score: 3.0, confidence: 4, comments: "Significant issues to address" },
      { reviewerId: "R10", score: 2.5, confidence: 5, comments: "Major revisions needed" },
      { reviewerId: "R11", score: 2.9, confidence: 3, comments: "Weak methodology" },
    ],
  },
];

let mockBestPaperCandidates = [
  {
    id: "P001",
    title: "Medical Imaging with Deep Learning",
    novelty: 4.5,
    impact: 4.2,
    clarity: 4.3,
    ai_depth: 8.9,
  },
  {
    id: "P002",
    title: "Blockchain Transparency Systems",
    novelty: 4.0,
    impact: 3.8,
    clarity: 4.1,
    ai_depth: 7.5,
  },
  {
    id: "P003",
    title: "Quantum Optimization Models",
    novelty: 3.8,
    impact: 4.0,
    clarity: 3.7,
    ai_depth: 8.1,
  },
  {
    id: "P004",
    title: "Federated Learning Framework",
    novelty: 4.3,
    impact: 4.5,
    clarity: 4.0,
    ai_depth: 9.2,
  },
];

/**
 * Get all review decisions
 */
export const getReviewDecisions = async (filters = {}) => {
  await delay();

  let filtered = [...mockReviews];

  if (filters.status) {
    filtered = filtered.filter((r) => r.status === filters.status);
  }

  if (filters.minScore) {
    filtered = filtered.filter((r) => r.avg >= filters.minScore);
  }

  return {
    success: true,
    data: filtered,
    total: filtered.length,
  };
};

/**
 * Get review by paper ID
 */
export const getReviewById = async (id) => {
  await delay();

  const review = mockReviews.find((r) => r.id === id);

  if (!review) {
    return {
      success: false,
      error: "Review not found",
    };
  }

  return {
    success: true,
    data: review,
  };
};

/**
 * Get review statistics
 */
export const getReviewStats = async () => {
  await delay(300);

  const total = mockReviews.length;
  const accepted = mockReviews.filter((r) => r.status === "Accepted").length;
  const revision = mockReviews.filter((r) => r.status.includes("Revision")).length;
  const rejected = mockReviews.filter((r) => r.status === "Rejected").length;
  const avgScore = (
    mockReviews.reduce((sum, r) => sum + r.avg, 0) / mockReviews.length
  ).toFixed(2);

  return {
    success: true,
    data: {
      total,
      accepted,
      revision,
      rejected,
      avgScore,
    },
  };
};

/**
 * Update review decision
 */
export const updateReviewDecision = async (id, decision) => {
  await delay();

  const index = mockReviews.findIndex((r) => r.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Review not found",
    };
  }

  mockReviews[index].status = decision;
  mockReviews[index].decidedAt = new Date().toISOString();

  return {
    success: true,
    data: mockReviews[index],
    message: "Review decision updated successfully",
  };
};

/**
 * Get best paper candidates
 */
export const getBestPaperCandidates = async () => {
  await delay();

  return {
    success: true,
    data: mockBestPaperCandidates,
    total: mockBestPaperCandidates.length,
  };
};

/**
 * Run AI deep review analysis
 */
export const runAIDeepReview = async () => {
  await delay(2000);

  // Simulate AI analysis
  const updatedCandidates = mockBestPaperCandidates.map((paper) => ({
    ...paper,
    ai_depth: +(Math.random() * (9.5 - 7) + 7).toFixed(1),
    ai_analyzed_at: new Date().toISOString(),
  }));

  mockBestPaperCandidates = updatedCandidates;

  return {
    success: true,
    data: updatedCandidates,
    message: "AI analysis completed",
  };
};

/**
 * Get best paper statistics
 */
export const getBestPaperStats = async () => {
  await delay(300);

  const total = mockBestPaperCandidates.length;
  const avgScore = (
    mockBestPaperCandidates.reduce(
      (sum, p) => sum + (p.novelty + p.impact + p.clarity) / 3,
      0
    ) / total
  ).toFixed(2);
  const avgAI = (
    mockBestPaperCandidates.reduce((sum, p) => sum + p.ai_depth, 0) / total
  ).toFixed(1);
  const topScore = Math.max(
    ...mockBestPaperCandidates.map((p) => (p.novelty + p.impact + p.clarity) / 3)
  ).toFixed(2);

  return {
    success: true,
    data: {
      total,
      avgScore,
      avgAI,
      topScore,
    },
  };
};

/**
 * Save best paper evaluation
 */
export const saveBestPaperEvaluation = async (paperId, evaluation) => {
  await delay();

  const index = mockBestPaperCandidates.findIndex((p) => p.id === paperId);

  if (index === -1) {
    return {
      success: false,
      error: "Paper not found",
    };
  }

  mockBestPaperCandidates[index] = {
    ...mockBestPaperCandidates[index],
    ...evaluation,
    evaluatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    data: mockBestPaperCandidates[index],
    message: "Evaluation saved successfully",
  };
};

/**
 * Finalize best paper selection
 */
export const finalizeBestPaper = async (paperIds) => {
  await delay();

  const selectedPapers = mockBestPaperCandidates.filter((p) =>
    paperIds.includes(p.id)
  );

  return {
    success: true,
    data: {
      selectedPapers,
      count: selectedPapers.length,
      finalizedAt: new Date().toISOString(),
    },
    message: `${selectedPapers.length} paper(s) selected as Best Paper`,
  };
};

/**
 * Send decision notification email to authors
 */
export const sendDecisionNotification = async (paperId, decision) => {
  await delay(1200);

  const review = mockReviews.find((r) => r.id === paperId);

  if (!review) {
    return {
      success: false,
      error: "Paper not found",
    };
  }

  const emailTemplates = {
    Accepted: {
      subject: "Congratulations! Your paper has been accepted",
      content: "We are pleased to inform you that your paper has been accepted...",
    },
    "Minor Revision": {
      subject: "Your paper requires minor revisions",
      content: "Your paper shows promise but requires minor revisions...",
    },
    "Major Revision": {
      subject: "Your paper requires major revisions",
      content: "After careful review, your paper requires substantial revisions...",
    },
    Rejected: {
      subject: "Paper submission decision",
      content: "We regret to inform you that your paper was not accepted...",
    },
  };

  const template = emailTemplates[decision];

  return {
    success: true,
    data: {
      paperId,
      decision,
      emailSent: true,
      sentAt: new Date().toISOString(),
      recipients: ["author1@example.com", "author2@example.com"],
      template,
    },
    message: "Decision notification sent successfully",
  };
};

/**
 * Send batch decision notifications
 */
export const sendBatchNotifications = async (decisions) => {
  await delay(2000);

  const results = decisions.map((dec) => ({
    paperId: dec.paperId,
    success: true,
    sentAt: new Date().toISOString(),
  }));

  return {
    success: true,
    data: {
      sent: results.length,
      failed: 0,
      results,
    },
    message: `${results.length} notifications sent successfully`,
  };
};

export default {
  getReviewDecisions,
  getReviewById,
  getReviewStats,
  updateReviewDecision,
  getBestPaperCandidates,
  runAIDeepReview,
  getBestPaperStats,
  saveBestPaperEvaluation,
  finalizeBestPaper,
  sendDecisionNotification,
  sendBatchNotifications,
};
