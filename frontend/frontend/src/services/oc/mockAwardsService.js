/**
 * MOCK AWARDS SERVICE
 * Temporary mock data for Awards Announcement
 * TODO: Replace with real API calls after backend is ready
 */

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

const mockAwardsService = {
  /**
   * Get award candidates
   * @param {number} conferenceId
   * @returns {Promise<Object>}
   */
  async getAwardCandidates(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: [
        {
          id: "P001",
          paperId: 101,
          title: "Medical Imaging with Deep Learning",
          authors: ["Dr. Sarah Chen", "Prof. Michael Brown"],
          score: 92.3,
          reviewScore: 9.2,
          audienceVotes: 156,
          status: "PROPOSED",
          type: "BEST_PAPER",
          nominatedBy: "Scientific Committee",
          nominatedDate: "2025-03-10"
        },
        {
          id: "P005",
          paperId: 105,
          title: "Quantum Machine Learning Algorithms",
          authors: ["Alex Martinez", "Dr. Emma Wilson"],
          score: 88.3,
          reviewScore: 8.8,
          audienceVotes: 124,
          status: "PROPOSED",
          type: "BEST_STUDENT_PAPER",
          nominatedBy: "Track Chair - ML",
          nominatedDate: "2025-03-12"
        },
        {
          id: "C001",
          paperId: null,
          title: "Dr. Evelyn Reed",
          authors: null,
          score: null,
          reviewScore: null,
          audienceVotes: null,
          status: "FINALIZED",
          type: "LIFETIME_ACHIEVEMENT",
          nominatedBy: "Organizing Committee",
          nominatedDate: "2025-02-15",
          finalizedDate: "2025-03-01"
        },
        {
          id: "P012",
          paperId: 112,
          title: "Sustainable AI for Climate Change",
          authors: ["Prof. David Lee", "Dr. Rachel Green"],
          score: 85.7,
          reviewScore: 8.5,
          audienceVotes: 98,
          status: "UNDER_REVIEW",
          type: "BEST_PAPER",
          nominatedBy: "Track Chair - AI Applications",
          nominatedDate: "2025-03-14"
        }
      ]
    };
  },

  /**
   * Get award candidate details
   * @param {string} candidateId
   * @returns {Promise<Object>}
   */
  async getAwardCandidateDetails(candidateId) {
    await delay();
    
    return {
      success: true,
      data: {
        id: candidateId,
        paperId: 101,
        title: "Medical Imaging with Deep Learning",
        authors: ["Dr. Sarah Chen", "Prof. Michael Brown"],
        abstract: "This paper presents a novel approach to medical image analysis...",
        type: "BEST_PAPER",
        status: "PROPOSED",
        scores: {
          reviewScore: 9.2,
          originalityScore: 9.5,
          clarityScore: 9.0,
          significanceScore: 9.3,
          audienceVotes: 156
        },
        reviews: [
          {
            reviewer: "Reviewer 1",
            score: 9.0,
            comments: "Excellent work with significant practical applications"
          },
          {
            reviewer: "Reviewer 2",
            score: 9.5,
            comments: "Outstanding research methodology and results"
          }
        ],
        nominatedBy: "Scientific Committee",
        nominatedDate: "2025-03-10",
        supportingDocuments: []
      }
    };
  },

  /**
   * Finalize award decision
   * @param {string} candidateId
   * @param {Object} decision
   * @returns {Promise<Object>}
   */
  async finalizeAward(candidateId, decision) {
    await delay();
    
    console.log('Mock: Finalizing award', candidateId, decision);
    
    return {
      success: true,
      message: "Award decision finalized",
      data: {
        id: candidateId,
        status: "FINALIZED",
        awarded: decision.awarded,
        finalizedBy: decision.finalizedBy || "Admin",
        finalizedDate: new Date().toISOString(),
        notes: decision.notes || ""
      }
    };
  },

  /**
   * Announce awards
   * @param {number} conferenceId
   * @param {Array} awardIds
   * @returns {Promise<Object>}
   */
  async announceAwards(conferenceId, awardIds) {
    await delay(1000);
    
    console.log('Mock: Announcing awards', conferenceId, awardIds);
    
    return {
      success: true,
      message: "Awards announced successfully",
      data: {
        conferenceId: conferenceId,
        awardIds: awardIds,
        announcedAt: new Date().toISOString(),
        notificationsSent: awardIds.length * 2, // authors + nominators
        websitePublished: true,
        emailsSent: true
      }
    };
  },

  /**
   * Send internal notification about awards
   * @param {number} conferenceId
   * @param {Array} recipientIds
   * @returns {Promise<Object>}
   */
  async sendInternalNotification(conferenceId, recipientIds) {
    await delay();
    
    console.log('Mock: Sending internal notification', conferenceId, recipientIds);
    
    return {
      success: true,
      message: "Internal notifications sent",
      data: {
        conferenceId: conferenceId,
        recipientIds: recipientIds,
        sentAt: new Date().toISOString()
      }
    };
  },

  /**
   * Get award statistics
   * @param {number} conferenceId
   * @returns {Promise<Object>}
   */
  async getAwardStats(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: {
        totalCandidates: 15,
        proposed: 8,
        underReview: 4,
        finalized: 3,
        announced: 2,
        byType: {
          BEST_PAPER: 6,
          BEST_STUDENT_PAPER: 4,
          BEST_PRESENTATION: 3,
          LIFETIME_ACHIEVEMENT: 2
        }
      }
    };
  }
};

export default mockAwardsService;
