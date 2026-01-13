/**
 * PAPERS SERVICE - Mock API
 * Handles paper management, submissions, and metadata
 */

const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

let mockPapers = [
  {
    id: "P001",
    title: "Deep Learning Approaches for Medical Image Analysis",
    authors: "Smith J., Lee K., Zhang M.",
    track: "AI & ML",
    keywords: "deep learning, medical imaging, CNN",
    type: "Oral",
    status: "Accepted",
    abstract: "This paper presents novel deep learning approaches...",
    submittedAt: "2024-11-15T10:30:00Z",
    version: 2,
    finalFile: "P001_final_v2.pdf",
  },
  {
    id: "P002",
    title: "Blockchain-based Supply Chain Transparency",
    authors: "Park S., Anderson M.",
    track: "Blockchain",
    keywords: "blockchain, supply chain, transparency",
    type: "Oral",
    status: "Accepted",
    abstract: "We propose a blockchain-based framework...",
    submittedAt: "2024-11-18T14:20:00Z",
    version: 1,
    finalFile: "P002_final_v1.pdf",
  },
  {
    id: "P003",
    title: "Quantum Computing for Optimization Problems",
    authors: "Chen W., Liu Y.",
    track: "Quantum Computing",
    keywords: "quantum computing, optimization, algorithms",
    type: "Poster",
    status: "Conditional",
    abstract: "This work explores quantum computing applications...",
    submittedAt: "2024-11-20T09:15:00Z",
    version: 1,
    finalFile: "P003_final_v1.pdf",
  },
  {
    id: "P004",
    title: "Federated Learning for Privacy-Preserving AI",
    authors: "Johnson M., Kim S., Taylor R.",
    track: "AI & ML",
    keywords: "federated learning, privacy, distributed AI",
    type: "Oral",
    status: "Accepted",
    abstract: "We present a federated learning framework...",
    submittedAt: "2024-11-22T11:00:00Z",
    version: 1,
    finalFile: "P004_final_v1.pdf",
  },
];

let mockFinalSubmissions = [
  {
    id: "P001",
    title: "Deep Learning for Imaging",
    author: "Smith J.",
    status: "Pending",
    file: "P001_final.pdf",
    submittedAt: "2025-03-15T10:00:00Z",
    version: 2,
  },
  {
    id: "P002",
    title: "Blockchain Transparency",
    author: "Park S.",
    status: "Approved",
    file: "P002_final.pdf",
    submittedAt: "2025-03-16T14:30:00Z",
    version: 1,
  },
  {
    id: "P003",
    title: "Quantum Optimization",
    author: "Chen W.",
    status: "Rejected",
    file: "P003_final.pdf",
    rejectionReason: "Format does not comply with template",
    submittedAt: "2025-03-17T09:45:00Z",
    version: 1,
  },
  {
    id: "P004",
    title: "Federated Learning",
    author: "Lee K.",
    status: "Approved",
    file: "P004_final.pdf",
    submittedAt: "2025-03-18T16:20:00Z",
    version: 1,
  },
];

/**
 * Get all papers with filters
 */
export const getPapers = async (filters = {}) => {
  await delay();

  let filtered = [...mockPapers];

  if (filters.status) {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  if (filters.track) {
    filtered = filtered.filter((p) => p.track === filters.track);
  }

  if (filters.type) {
    filtered = filtered.filter((p) => p.type === filters.type);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.authors.toLowerCase().includes(search) ||
        p.keywords.toLowerCase().includes(search)
    );
  }

  return {
    success: true,
    data: filtered,
    total: filtered.length,
  };
};

/**
 * Get paper by ID
 */
export const getPaperById = async (id) => {
  await delay();

  const paper = mockPapers.find((p) => p.id === id);

  if (!paper) {
    return {
      success: false,
      error: "Paper not found",
    };
  }

  return {
    success: true,
    data: paper,
  };
};

/**
 * Update paper metadata
 */
export const updatePaper = async (id, updates) => {
  await delay();

  const index = mockPapers.findIndex((p) => p.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Paper not found",
    };
  }

  mockPapers[index] = {
    ...mockPapers[index],
    ...updates,
  };

  return {
    success: true,
    data: mockPapers[index],
    message: "Paper updated successfully",
  };
};

/**
 * Get paper statistics
 */
export const getPaperStats = async () => {
  await delay(300);

  const total = mockPapers.length;
  const oral = mockPapers.filter((p) => p.type === "Oral").length;
  const poster = mockPapers.filter((p) => p.type === "Poster").length;
  const accepted = mockPapers.filter((p) => p.status === "Accepted").length;

  const trackDistribution = {};
  mockPapers.forEach((p) => {
    trackDistribution[p.track] = (trackDistribution[p.track] || 0) + 1;
  });

  return {
    success: true,
    data: {
      total,
      oral,
      poster,
      accepted,
      trackDistribution,
    },
  };
};

/**
 * Download paper file
 */
export const downloadPaper = async (id) => {
  await delay(500);

  const paper = mockPapers.find((p) => p.id === id);

  if (!paper) {
    return {
      success: false,
      error: "Paper not found",
    };
  }

  return {
    success: true,
    data: {
      filename: paper.finalFile,
      url: `#download/${paper.finalFile}`,
      size: Math.floor(Math.random() * 5000) + 1000, // KB
    },
  };
};

/**
 * Export papers list
 */
export const exportPapers = async (format = "xlsx") => {
  await delay(1000);

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `papers_list_${timestamp}.${format}`;

  return {
    success: true,
    data: {
      filename,
      url: `#download/${filename}`,
      count: mockPapers.length,
    },
    message: "Export completed successfully",
  };
};

/**
 * Get all final submissions
 */
export const getFinalSubmissions = async () => {
  await delay();

  return {
    success: true,
    data: mockFinalSubmissions,
    total: mockFinalSubmissions.length,
  };
};

/**
 * Get final submission by ID
 */
export const getFinalSubmissionById = async (id) => {
  await delay();

  const submission = mockFinalSubmissions.find((s) => s.id === id);

  if (!submission) {
    return {
      success: false,
      error: "Submission not found",
    };
  }

  return {
    success: true,
    data: submission,
  };
};

/**
 * Approve final submission
 */
export const approveFinalSubmission = async (id) => {
  await delay();

  const index = mockFinalSubmissions.findIndex((s) => s.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Submission not found",
    };
  }

  mockFinalSubmissions[index].status = "Approved";
  mockFinalSubmissions[index].approvedAt = new Date().toISOString();

  return {
    success: true,
    data: mockFinalSubmissions[index],
    message: "Final submission approved",
  };
};

/**
 * Reject final submission
 */
export const rejectFinalSubmission = async (id, reason) => {
  await delay();

  const index = mockFinalSubmissions.findIndex((s) => s.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Submission not found",
    };
  }

  mockFinalSubmissions[index].status = "Rejected";
  mockFinalSubmissions[index].rejectionReason = reason;
  mockFinalSubmissions[index].rejectedAt = new Date().toISOString();

  return {
    success: true,
    data: mockFinalSubmissions[index],
    message: "Final submission rejected",
  };
};

/**
 * Get final submission statistics
 */
export const getFinalSubmissionStats = async () => {
  await delay(300);

  const total = mockFinalSubmissions.length;
  const pending = mockFinalSubmissions.filter((s) => s.status === "Pending").length;
  const approved = mockFinalSubmissions.filter((s) => s.status === "Approved").length;
  const rejected = mockFinalSubmissions.filter((s) => s.status === "Rejected").length;

  return {
    success: true,
    data: {
      total,
      pending,
      approved,
      rejected,
    },
  };
};

/**
 * Upload final version of paper
 */
export const uploadFinalVersion = async (paperId, file) => {
  await delay(1500);

  const paper = mockPapers.find((p) => p.id === paperId);

  if (!paper) {
    return {
      success: false,
      error: "Paper not found",
    };
  }

  // Simulate file upload
  const newVersion = paper.version + 1;
  const filename = `${paperId}_final_v${newVersion}.pdf`;

  paper.version = newVersion;
  paper.finalFile = filename;
  paper.uploadedAt = new Date().toISOString();

  return {
    success: true,
    data: {
      paperId,
      version: newVersion,
      filename,
      size: file.size,
      uploadedAt: paper.uploadedAt,
    },
    message: `Version ${newVersion} uploaded successfully`,
  };
};

/**
 * Get version history of a paper
 */
export const getVersionHistory = async (paperId) => {
  await delay(500);

  const paper = mockPapers.find((p) => p.id === paperId);

  if (!paper) {
    return {
      success: false,
      error: "Paper not found",
    };
  }

  // Simulate version history
  const versions = [];
  for (let i = 1; i <= paper.version; i++) {
    versions.push({
      version: i,
      filename: `${paperId}_final_v${i}.pdf`,
      uploadedAt: new Date(Date.now() - (paper.version - i) * 86400000).toISOString(),
      size: Math.floor(Math.random() * 3000) + 1000, // KB
      status: i === paper.version ? "current" : "archived",
    });
  }

  return {
    success: true,
    data: {
      paperId,
      currentVersion: paper.version,
      versions,
    },
  };
};

/**
 * Download specific version of paper
 */
export const downloadPaperVersion = async (paperId, version) => {
  await delay(500);

  const paper = mockPapers.find((p) => p.id === paperId);

  if (!paper) {
    return {
      success: false,
      error: "Paper not found",
    };
  }

  if (version > paper.version) {
    return {
      success: false,
      error: "Version not found",
    };
  }

  const filename = `${paperId}_final_v${version}.pdf`;

  return {
    success: true,
    data: {
      filename,
      url: `#download/${filename}`,
      version,
      size: Math.floor(Math.random() * 3000) + 1000,
    },
  };
};

export default {
  getPapers,
  getPaperById,
  updatePaper,
  getPaperStats,
  downloadPaper,
  exportPapers,
  getFinalSubmissions,
  getFinalSubmissionById,
  approveFinalSubmission,
  rejectFinalSubmission,
  getFinalSubmissionStats,
  uploadFinalVersion,
  getVersionHistory,
  downloadPaperVersion,
};
