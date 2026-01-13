/**
 * MOCK BUDGET SERVICE
 * Temporary mock data for Budget Approval
 * TODO: Replace with real API calls after backend is ready
 */

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

const mockBudgetService = {
  /**
   * Get all budget requests
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>}
   */
  async getBudgetRequests(conferenceId, filters = {}) {
    await delay();
    
    const allRequests = [
      {
        id: 1,
        category: "Catering",
        amount: 5000,
        reason: "Additional VIP dinner",
        status: "PENDING",
        date: "2025-03-15",
        requestedBy: "John Doe",
        attachments: []
      },
      {
        id: 2,
        category: "Marketing",
        amount: 3000,
        reason: "Social media ads campaign",
        status: "PENDING",
        date: "2025-03-14",
        requestedBy: "Jane Smith",
        attachments: []
      },
      {
        id: 3,
        category: "Technology",
        amount: 2500,
        reason: "Extra AV equipment",
        status: "APPROVED",
        date: "2025-03-12",
        requestedBy: "Mike Johnson",
        approvedBy: "Admin",
        approvedDate: "2025-03-13"
      },
      {
        id: 4,
        category: "Venue",
        amount: 8000,
        reason: "Extended venue hours for networking",
        status: "REJECTED",
        date: "2025-03-10",
        requestedBy: "Sarah Wilson",
        rejectedBy: "Admin",
        rejectedDate: "2025-03-11",
        rejectionReason: "Budget constraint"
      }
    ];

    // Apply filters
    let filtered = allRequests;
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters.category) {
      filtered = filtered.filter(r => r.category === filters.category);
    }

    return {
      success: true,
      data: {
        requests: filtered,
        total: filtered.length,
        pending: allRequests.filter(r => r.status === "PENDING").length,
        approved: allRequests.filter(r => r.status === "APPROVED").length,
        rejected: allRequests.filter(r => r.status === "REJECTED").length
      }
    };
  },

  /**
   * Get single budget request detail
   * @param {number} requestId
   * @returns {Promise<Object>}
   */
  async getBudgetRequestById(requestId) {
    await delay();
    
    return {
      success: true,
      data: {
        id: requestId,
        category: "Catering",
        amount: 5000,
        reason: "Additional VIP dinner for keynote speakers",
        status: "PENDING",
        date: "2025-03-15",
        requestedBy: "John Doe",
        requestedByEmail: "john@conference.com",
        currentBudget: 89000,
        budgetLimit: 150000,
        detailedDescription: "We need to host 15 additional VIP guests including keynote speakers...",
        attachments: [
          { name: "quote.pdf", url: "#", size: "234 KB" }
        ]
      }
    };
  },

  /**
   * Approve budget request
   * @param {number} requestId
   * @param {Object} data - Approval data
   * @returns {Promise<Object>}
   */
  async approveBudgetRequest(requestId, data) {
    await delay();
    
    console.log('Mock: Approving request', requestId, data);
    
    return {
      success: true,
      message: "Budget request approved successfully",
      data: {
        id: requestId,
        status: "APPROVED",
        approvedBy: data.approvedBy || "Admin",
        approvedDate: new Date().toISOString(),
        notes: data.notes || ""
      }
    };
  },

  /**
   * Reject budget request
   * @param {number} requestId
   * @param {Object} data - Rejection data
   * @returns {Promise<Object>}
   */
  async rejectBudgetRequest(requestId, data) {
    await delay();
    
    console.log('Mock: Rejecting request', requestId, data);
    
    return {
      success: true,
      message: "Budget request rejected",
      data: {
        id: requestId,
        status: "REJECTED",
        rejectedBy: data.rejectedBy || "Admin",
        rejectedDate: new Date().toISOString(),
        rejectionReason: data.reason || "Budget constraint"
      }
    };
  },

  /**
   * Create new budget request
   * @param {Object} requestData
   * @returns {Promise<Object>}
   */
  async createBudgetRequest(requestData) {
    await delay();
    
    console.log('Mock: Creating request', requestData);
    
    return {
      success: true,
      message: "Budget request created successfully",
      data: {
        id: Math.floor(Math.random() * 1000) + 100,
        ...requestData,
        status: "PENDING",
        date: new Date().toISOString()
      }
    };
  }
};

export default mockBudgetService;
