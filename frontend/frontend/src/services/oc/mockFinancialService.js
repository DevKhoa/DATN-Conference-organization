/**
 * MOCK FINANCIAL SERVICE
 * Temporary mock data for Financial Dashboard
 * TODO: Replace with real API calls after backend is ready
 */

// Simulate API delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

const mockFinancialService = {
  /**
   * Get financial summary
   * @returns {Promise<Object>}
   */
  async getFinancialSummary(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: {
        totalRevenue: 2000000,
        totalExpense: 89000,
        netProfit: 36000,
        budgetLimit: 150000,
        budgetUsedPercentage: 59.3,
        revenueChange: "+12%",
        expenseChange: "+8%",
        profitChange: "+15%",
      }
    };
  },

  /**
   * Get revenue breakdown by source
   * @returns {Promise<Object>}
   */
  async getRevenueBySource(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: [
        {
          id: 1,
          source: "Registration",
          amount: 85000,
          percentage: 68,
          color: "#2563eb"
        },
        {
          id: 2,
          source: "Sponsorship",
          amount: 30000,
          percentage: 24,
          color: "#10b981"
        },
        {
          id: 3,
          source: "Exhibition",
          amount: 10000,
          percentage: 8,
          color: "#f59e0b"
        }
      ]
    };
  },

  /**
   * Get expense breakdown by category
   * @returns {Promise<Object>}
   */
  async getExpenseByCategory(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: [
        {
          id: 1,
          category: "Venue",
          amount: 35000,
          percentage: 39.3,
          color: "#ef4444"
        },
        {
          id: 2,
          category: "Catering",
          amount: 28000,
          percentage: 31.5,
          color: "#8b5cf6"
        },
        {
          id: 3,
          category: "Marketing",
          amount: 15000,
          percentage: 16.9,
          color: "#ec4899"
        },
        {
          id: 4,
          category: "Technology",
          amount: 11000,
          percentage: 12.4,
          color: "#06b6d4"
        }
      ]
    };
  },

  /**
   * Get detailed financial report
   * @returns {Promise<Object>}
   */
  async getDetailedReport(conferenceId, startDate, endDate) {
    await delay();
    
    return {
      success: true,
      data: {
        summary: {
          totalRevenue: 125000,
          totalExpense: 89000,
          netProfit: 36000
        },
        transactions: [
          {
            id: 1,
            date: "2025-03-15",
            type: "INCOME",
            category: "Registration",
            amount: 5000,
            description: "Early bird registrations batch #12"
          },
          {
            id: 2,
            date: "2025-03-14",
            type: "EXPENSE",
            category: "Venue",
            amount: 15000,
            description: "Convention center deposit"
          }
        ]
      }
    };
  }
};

export default mockFinancialService;
