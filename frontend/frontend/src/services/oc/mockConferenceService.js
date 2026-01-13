/**
 * MOCK CONFERENCE SERVICE
 * Temporary mock data for Conference Setup
 * TODO: Replace with real API calls after backend is ready
 */

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

const mockConferenceService = {
  /**
   * Get conference details
   * @param {number} conferenceId
   * @returns {Promise<Object>}
   */
  async getConferenceDetails(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: {
        id: conferenceId,
        name: "International Conference on AI 2026",
        shortName: "ICAI 2026",
        venue: "Grand Convention Center, Ho Chi Minh City",
        startDate: "2026-06-01",
        endDate: "2026-06-03",
        duration: 3,
        status: "DRAFT",
        theme: "Artificial Intelligence for Sustainable Development",
        description: "The premier conference for AI researchers and practitioners...",
        website: "https://icai2026.com",
        contactEmail: "info@icai2026.com",
        maxAttendees: 500,
        registrationDeadline: "2026-05-15",
        submissionDeadline: "2026-03-31",
        createdAt: "2025-01-10",
        updatedAt: "2025-03-15"
      }
    };
  },

  /**
   * Get conference overview/statistics
   * @param {number} conferenceId
   * @returns {Promise<Object>}
   */
  async getConferenceOverview(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: {
        totalPapers: 156,
        acceptedPapers: 45,
        rejectedPapers: 23,
        underReview: 88,
        totalRegistrations: 234,
        confirmedAttendees: 189,
        sessions: 12,
        keynotes: 3,
        sponsors: 8,
        budget: {
          total: 150000,
          used: 89000,
          remaining: 61000
        }
      }
    };
  },

  /**
   * Create new conference
   * @param {Object} conferenceData
   * @returns {Promise<Object>}
   */
  async createConference(conferenceData) {
    await delay();
    
    console.log('Mock: Creating conference', conferenceData);
    
    return {
      success: true,
      message: "Conference created successfully",
      data: {
        id: Math.floor(Math.random() * 1000) + 100,
        ...conferenceData,
        status: "DRAFT",
        createdAt: new Date().toISOString()
      }
    };
  },

  /**
   * Update conference details
   * @param {number} conferenceId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateConference(conferenceId, updateData) {
    await delay();
    
    console.log('Mock: Updating conference', conferenceId, updateData);
    
    return {
      success: true,
      message: "Conference updated successfully",
      data: {
        id: conferenceId,
        ...updateData,
        updatedAt: new Date().toISOString()
      }
    };
  },

  /**
   * Update conference status
   * @param {number} conferenceId
   * @param {string} status - DRAFT | PUBLISHED | CLOSED
   * @returns {Promise<Object>}
   */
  async updateConferenceStatus(conferenceId, status) {
    await delay();
    
    console.log('Mock: Updating conference status', conferenceId, status);
    
    return {
      success: true,
      message: `Conference status changed to ${status}`,
      data: {
        id: conferenceId,
        status: status,
        statusChangedAt: new Date().toISOString()
      }
    };
  },

  /**
   * Get conference timeline/schedule
   * @param {number} conferenceId
   * @returns {Promise<Object>}
   */
  async getConferenceTimeline(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: {
        milestones: [
          {
            id: 1,
            name: "Paper Submission Opens",
            date: "2026-01-15",
            status: "COMPLETED"
          },
          {
            id: 2,
            name: "Paper Submission Deadline",
            date: "2026-03-31",
            status: "UPCOMING"
          },
          {
            id: 3,
            name: "Notification of Acceptance",
            date: "2026-04-30",
            status: "UPCOMING"
          },
          {
            id: 4,
            name: "Early Bird Registration Deadline",
            date: "2026-05-15",
            status: "UPCOMING"
          },
          {
            id: 5,
            name: "Conference Start",
            date: "2026-06-01",
            status: "UPCOMING"
          }
        ],
        tracks: [
          {
            id: 1,
            name: "Machine Learning",
            keynote: "Dr. Jane Doe",
            sessionCount: 4,
            paperCount: 15
          },
          {
            id: 2,
            name: "Computer Vision",
            keynote: "Prof. John Smith",
            sessionCount: 3,
            paperCount: 12
          },
          {
            id: 3,
            name: "Natural Language Processing",
            keynote: "Dr. Mike Johnson",
            sessionCount: 3,
            paperCount: 10
          }
        ]
      }
    };
  },

  /**
   * Detect scheduling conflicts
   * @param {number} conferenceId
   * @returns {Promise<Object>}
   */
  async detectConflicts(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: {
        hasConflicts: true,
        conflicts: [
          {
            id: 1,
            type: "ROOM_CONFLICT",
            severity: "HIGH",
            message: "Room A is double-booked on June 1, 14:00-16:00",
            affectedSessions: [
              { id: 5, name: "ML Session 1" },
              { id: 8, name: "CV Session 2" }
            ],
            suggestions: [
              "Move ML Session 1 to Room B",
              "Reschedule CV Session 2 to 16:00-18:00"
            ]
          },
          {
            id: 2,
            type: "SPEAKER_CONFLICT",
            severity: "MEDIUM",
            message: "Dr. Jane Doe scheduled in two sessions at same time",
            affectedSessions: [
              { id: 3, name: "Keynote" },
              { id: 4, name: "Panel Discussion" }
            ],
            suggestions: [
              "Reschedule Panel Discussion to next day"
            ]
          }
        ]
      }
    };
  },

  /**
   * Resolve conflict
   * @param {number} conflictId
   * @param {string} resolution
   * @returns {Promise<Object>}
   */
  async resolveConflict(conflictId, resolution) {
    await delay();
    
    console.log('Mock: Resolving conflict', conflictId, resolution);
    
    return {
      success: true,
      message: "Conflict resolved successfully",
      data: {
        conflictId: conflictId,
        resolution: resolution,
        resolvedAt: new Date().toISOString()
      }
    };
  }
};

export default mockConferenceService;
