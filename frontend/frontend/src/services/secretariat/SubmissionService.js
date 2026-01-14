/**
 * SUBMISSION SERVICE - Mock API
 * Handles AI proofreading, pre-publish checks, and submission validation
 */

const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * AI Proofreading - Analyze document
 */
export const analyzeDocument = async (file) => {
  await delay(2000);

  // Simulate AI analysis
  const suggestions = [
    {
      type: "grammar",
      page: 3,
      line: 15,
      text: 'Grammar issue: "which" should be "that" in restrictive clause',
      severity: "medium",
    },
    {
      type: "clarity",
      page: 2,
      line: 8,
      text: "Paragraph contains complex sentences. Consider breaking into shorter statements.",
      severity: "low",
    },
    {
      type: "grammar",
      page: 1,
      line: 5,
      text: "Missing comma after introductory phrase in abstract",
      severity: "high",
    },
    {
      type: "style",
      page: 4,
      line: 20,
      text: "Consider using active voice in methodology section",
      severity: "low",
    },
    {
      type: "clarity",
      page: 3,
      line: 12,
      text: "Technical term 'CNN architecture' used without definition",
      severity: "medium",
    },
  ];

  const stats = {
    totalIssues: suggestions.length,
    grammar: suggestions.filter((s) => s.type === "grammar").length,
    clarity: suggestions.filter((s) => s.type === "clarity").length,
    style: suggestions.filter((s) => s.type === "style").length,
    qualityScore: 92,
    pagesChecked: 8,
    readabilityScore: 85,
  };

  return {
    success: true,
    data: {
      filename: file.name,
      size: file.size,
      suggestions,
      stats,
      analyzedAt: new Date().toISOString(),
    },
  };
};

/**
 * Generate revised PDF
 */
export const generateRevisedPDF = async (documentId, appliedSuggestions = []) => {
  await delay(1500);

  const filename = `revised_${documentId}_${Date.now()}.pdf`;

  return {
    success: true,
    data: {
      filename,
      url: `#download/${filename}`,
      appliedChanges: appliedSuggestions.length,
      generatedAt: new Date().toISOString(),
    },
    message: "Revised PDF generated successfully",
  };
};

/**
 * Pre-publish validation checks
 */
export const runPrePublishChecks = async () => {
  await delay(2000);

  const checks = [
    {
      id: 1,
      name: "Metadata completeness",
      status: "OK",
      details: "All required fields present (title, authors, keywords, abstract)",
      category: "metadata",
    },
    {
      id: 2,
      name: "Missing files",
      status: "FAIL",
      details: "2 papers missing source files (P003, P007)",
      category: "files",
      affectedPapers: ["P003", "P007"],
    },
    {
      id: 3,
      name: "PDF format compliance",
      status: "OK",
      details: "All PDFs meet IEEE standards (PDF/A-1b)",
      category: "format",
    },
    {
      id: 4,
      name: "Plagiarism scan",
      status: "OK",
      details: "No issues detected (average similarity: 12%, threshold: 15%)",
      category: "integrity",
    },
    {
      id: 5,
      name: "Author affiliations",
      status: "OK",
      details: "All authors have verified affiliations",
      category: "metadata",
    },
    {
      id: 6,
      name: "Reference formatting",
      status: "FAIL",
      details: "3 papers have inconsistent citation styles (P002, P005, P009)",
      category: "format",
      affectedPapers: ["P002", "P005", "P009"],
    },
    {
      id: 7,
      name: "Copyright forms",
      status: "OK",
      details: "All forms received and digitally signed",
      category: "legal",
    },
    {
      id: 8,
      name: "Page limit compliance",
      status: "OK",
      details: "All papers within 8-page limit",
      category: "format",
    },
    {
      id: 9,
      name: "Image resolution",
      status: "OK",
      details: "All images meet minimum 300 DPI requirement",
      category: "quality",
    },
    {
      id: 10,
      name: "Accessibility standards",
      status: "OK",
      details: "All PDFs include alt-text for images",
      category: "accessibility",
    },
  ];

  const stats = {
    total: checks.length,
    passed: checks.filter((c) => c.status === "OK").length,
    failed: checks.filter((c) => c.status === "FAIL").length,
    warnings: checks.filter((c) => c.status === "WARNING").length,
  };

  return {
    success: true,
    data: {
      checks,
      stats,
      checkedAt: new Date().toISOString(),
      readyToPublish: stats.failed === 0,
    },
  };
};

/**
 * Get specific check details
 */
export const getCheckDetails = async (checkId) => {
  await delay(500);

  const checkDetailsMap = {
    2: {
      affectedPapers: [
        { id: "P003", title: "Quantum Optimization", missingFiles: ["source.zip"] },
        { id: "P007", title: "IoT Framework", missingFiles: ["source.zip", "data.csv"] },
      ],
    },
    6: {
      affectedPapers: [
        { id: "P002", title: "Blockchain", issue: "Mix of APA and IEEE styles" },
        { id: "P005", title: "ML Pipeline", issue: "Inconsistent author-year format" },
        { id: "P009", title: "Cloud Computing", issue: "Missing DOIs in references" },
      ],
    },
  };

  return {
    success: true,
    data: checkDetailsMap[checkId] || { message: "No additional details available" },
  };
};

/**
 * Fix specific issue
 */
export const fixIssue = async (checkId, paperId, fixAction) => {
  await delay(1000);

  return {
    success: true,
    data: {
      checkId,
      paperId,
      fixAction,
      fixedAt: new Date().toISOString(),
    },
    message: "Issue fixed successfully",
  };
};

/**
 * Batch format check
 */
export const batchFormatCheck = async (paperIds) => {
  await delay(1500);

  const results = paperIds.map((id) => ({
    paperId: id,
    formatScore: Math.floor(Math.random() * 30) + 70, // 70-100
    issues: Math.floor(Math.random() * 5),
    status: Math.random() > 0.3 ? "PASS" : "FAIL",
  }));

  return {
    success: true,
    data: results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.status === "PASS").length,
      failed: results.filter((r) => r.status === "FAIL").length,
    },
  };
};

/**
 * Check plagiarism for single paper
 */
export const checkPlagiarism = async (paperId) => {
  await delay(2000);

  const similarity = Math.floor(Math.random() * 20) + 5; // 5-25%

  return {
    success: true,
    data: {
      paperId,
      similarityScore: similarity,
      status: similarity < 15 ? "PASS" : "WARNING",
      sources: [
        { title: "Similar Paper 1", similarity: 8, url: "https://example.com/paper1" },
        { title: "Similar Paper 2", similarity: 5, url: "https://example.com/paper2" },
      ],
      checkedAt: new Date().toISOString(),
    },
  };
};

/**
 * Generate proceedings package
 */
export const generateProceedings = async (options = {}) => {
  await delay(3000);

  const {
    includeIndex = true,
    includeTOC = true,
    format = "pdf",
  } = options;

  return {
    success: true,
    data: {
      filename: `proceedings_ICAI2026.${format}`,
      url: `#download/proceedings_ICAI2026.${format}`,
      size: 45678, // KB
      paperCount: 120,
      pageCount: 1024,
      generatedAt: new Date().toISOString(),
    },
    message: "Proceedings package generated successfully",
  };
};

/**
 * Validate proceedings metadata
 */
export const validateProceedingsMetadata = async () => {
  await delay(1000);

  const validations = {
    isbn: { valid: true, value: "978-1-234-56789-0" },
    issn: { valid: true, value: "1234-5678" },
    doi: { valid: true, value: "10.1234/icai2026" },
    publisher: { valid: true, value: "Conference Publications" },
    year: { valid: true, value: "2026" },
    volume: { valid: true, value: "15" },
  };

  const allValid = Object.values(validations).every((v) => v.valid);

  return {
    success: true,
    data: {
      validations,
      isValid: allValid,
      checkedAt: new Date().toISOString(),
    },
  };
};

export default {
  analyzeDocument,
  generateRevisedPDF,
  runPrePublishChecks,
  getCheckDetails,
  fixIssue,
  batchFormatCheck,
  checkPlagiarism,
  generateProceedings,
  validateProceedingsMetadata,
};
