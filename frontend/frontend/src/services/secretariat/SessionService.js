/**
 * SESSION SERVICE - Mock API
 * Handles session management, AI session building, and scheduling
 */

const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

let mockSessions = [
  {
    id: "S1",
    title: "AI & Machine Learning Applications",
    time: "2025-04-15T09:00",
    room: "Hall A",
    chair: "Dr. Smith",
    locked: false,
    papers: ["P001", "P004", "P007"],
    duration: 120, // minutes
  },
  {
    id: "S2",
    title: "Blockchain & Distributed Systems",
    time: "2025-04-15T11:00",
    room: "Hall B",
    chair: "Dr. Johnson",
    locked: true,
    papers: ["P002", "P005"],
    duration: 90,
  },
  {
    id: "S3",
    title: "Quantum Computing",
    time: "2025-04-15T14:00",
    room: "Hall C",
    chair: "Dr. Lee",
    locked: false,
    papers: ["P003"],
    duration: 60,
  },
];

let mockAISessions = [
  {
    id: "AI-S1",
    title: "Deep Learning & Neural Networks",
    papers: 5,
    confidence: 92,
    topicKeywords: ["deep learning", "neural networks", "CNN", "RNN"],
  },
  {
    id: "AI-S2",
    title: "Natural Language Processing",
    papers: 4,
    confidence: 88,
    topicKeywords: ["NLP", "transformers", "BERT", "language models"],
  },
  {
    id: "AI-S3",
    title: "Computer Vision Applications",
    papers: 6,
    confidence: 95,
    topicKeywords: ["computer vision", "image processing", "object detection"],
  },
  {
    id: "AI-S4",
    title: "Reinforcement Learning",
    papers: 3,
    confidence: 75,
    topicKeywords: ["reinforcement learning", "Q-learning", "policy gradient"],
  },
];

/**
 * Get all sessions
 */
export const getSessions = async (filters = {}) => {
  await delay();

  let filtered = [...mockSessions];

  if (filters.locked !== undefined) {
    filtered = filtered.filter((s) => s.locked === filters.locked);
  }

  if (filters.date) {
    filtered = filtered.filter((s) => s.time.startsWith(filters.date));
  }

  return {
    success: true,
    data: filtered,
    total: filtered.length,
  };
};

/**
 * Get session by ID
 */
export const getSessionById = async (id) => {
  await delay();

  const session = mockSessions.find((s) => s.id === id);

  if (!session) {
    return {
      success: false,
      error: "Session not found",
    };
  }

  return {
    success: true,
    data: session,
  };
};

/**
 * Create session
 */
export const createSession = async (sessionData) => {
  await delay();

  const newSession = {
    id: `S${mockSessions.length + 1}`,
    ...sessionData,
    papers: sessionData.papers || [],
    locked: false,
  };

  mockSessions.push(newSession);

  return {
    success: true,
    data: newSession,
    message: "Session created successfully",
  };
};

/**
 * Update session
 */
export const updateSession = async (id, updates) => {
  await delay();

  const index = mockSessions.findIndex((s) => s.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Session not found",
    };
  }

  mockSessions[index] = {
    ...mockSessions[index],
    ...updates,
  };

  return {
    success: true,
    data: mockSessions[index],
    message: "Session updated successfully",
  };
};

/**
 * Toggle session lock
 */
export const toggleSessionLock = async (id) => {
  await delay();

  const index = mockSessions.findIndex((s) => s.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Session not found",
    };
  }

  mockSessions[index].locked = !mockSessions[index].locked;

  return {
    success: true,
    data: mockSessions[index],
    message: `Session ${mockSessions[index].locked ? "locked" : "unlocked"} successfully`,
  };
};

/**
 * Delete session
 */
export const deleteSession = async (id) => {
  await delay();

  const index = mockSessions.findIndex((s) => s.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Session not found",
    };
  }

  const deleted = mockSessions.splice(index, 1)[0];

  return {
    success: true,
    data: deleted,
    message: "Session deleted successfully",
  };
};

/**
 * Get session statistics
 */
export const getSessionStats = async () => {
  await delay(300);

  const total = mockSessions.length;
  const locked = mockSessions.filter((s) => s.locked).length;
  const papers = mockSessions.reduce((sum, s) => sum + s.papers.length, 0);
  const avgPapers = (papers / total).toFixed(1);

  return {
    success: true,
    data: {
      total,
      locked,
      papers,
      avgPapers,
    },
  };
};

/**
 * Run AI session optimization
 */
export const runAIOptimization = async (config = {}) => {
  await delay(2000);

  const {
    minPapers = 3,
    maxPapers = 6,
    similarityThreshold = 0.75,
  } = config;

  // Simulate AI analysis
  const optimizedSessions = mockAISessions.map((session) => ({
    ...session,
    papers: Math.floor(Math.random() * (maxPapers - minPapers + 1)) + minPapers,
    confidence: Math.floor(Math.random() * 30) + 70, // 70-100
    optimizedAt: new Date().toISOString(),
  }));

  return {
    success: true,
    data: optimizedSessions,
    config,
    message: "AI optimization completed",
  };
};

/**
 * Get AI session suggestions
 */
export const getAISessionSuggestions = async () => {
  await delay();

  return {
    success: true,
    data: mockAISessions,
    total: mockAISessions.length,
  };
};

/**
 * Accept AI session proposals
 */
export const acceptAIProposals = async (sessionIds = []) => {
  await delay();

  const selectedSessions = sessionIds.length > 0
    ? mockAISessions.filter((s) => sessionIds.includes(s.id))
    : mockAISessions;

  // Convert AI sessions to regular sessions
  const newSessions = selectedSessions.map((aiSession, index) => ({
    id: `S${mockSessions.length + index + 1}`,
    title: aiSession.title,
    time: `2025-04-15T${9 + index * 2}:00`, // Auto-schedule
    room: `Hall ${String.fromCharCode(65 + index)}`, // A, B, C...
    chair: "TBD",
    locked: false,
    papers: [], // Would be populated with actual paper IDs
    duration: aiSession.papers * 20, // 20 min per paper
    aiGenerated: true,
    confidence: aiSession.confidence,
  }));

  mockSessions.push(...newSessions);

  return {
    success: true,
    data: newSessions,
    message: `${newSessions.length} AI-proposed sessions accepted`,
  };
};

/**
 * Get AI session statistics
 */
export const getAISessionStats = async () => {
  await delay(300);

  const sessions = mockAISessions.length;
  const papers = mockAISessions.reduce((sum, s) => sum + s.papers, 0);
  const avgConfidence = Math.round(
    mockAISessions.reduce((sum, s) => sum + s.confidence, 0) / sessions
  );

  return {
    success: true,
    data: {
      sessions,
      papers,
      avgConfidence,
    },
  };
};

/**
 * Detect scheduling conflicts
 */
export const detectConflicts = async () => {
  await delay(500);

  const conflicts = [];

  // Check for time/room conflicts
  for (let i = 0; i < mockSessions.length; i++) {
    for (let j = i + 1; j < mockSessions.length; j++) {
      if (
        mockSessions[i].time === mockSessions[j].time &&
        mockSessions[i].room === mockSessions[j].room
      ) {
        conflicts.push({
          type: "time_room",
          sessions: [mockSessions[i].id, mockSessions[j].id],
          message: `Sessions ${mockSessions[i].id} and ${mockSessions[j].id} overlap`,
        });
      }
    }
  }

  return {
    success: true,
    data: conflicts,
    hasConflicts: conflicts.length > 0,
  };
};

export default {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  toggleSessionLock,
  deleteSession,
  getSessionStats,
  runAIOptimization,
  getAISessionSuggestions,
  acceptAIProposals,
  getAISessionStats,
  detectConflicts,
};
