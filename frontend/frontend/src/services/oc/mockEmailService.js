/**
 * MOCK EMAIL SERVICE
 * Temporary mock data for Email Management
 * TODO: Replace with real API calls after backend is ready
 */

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

const mockEmailService = {
  /**
   * Get email statistics
   * @returns {Promise<Object>}
   */
  async getEmailStats(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: {
        sent: 45,
        accepted: 38,
        declined: 3,
        pending: 4,
        bounced: 0,
        opened: 42,
        openRate: 93.3
      }
    };
  },

  /**
   * Get email templates
   * @returns {Promise<Object>}
   */
  async getTemplates(conferenceId) {
    await delay();
    
    return {
      success: true,
      data: [
        {
          id: 1,
          name: "Keynote Invitation",
          subject: "Invitation to speak at {{conference_name}}",
          type: "INVITATION",
          status: "ACTIVE",
          lastUsed: "2025-03-10",
          timesUsed: 12
        },
        {
          id: 2,
          name: "Session Chair Invitation",
          subject: "Invitation to chair a session",
          type: "INVITATION",
          status: "ACTIVE",
          lastUsed: "2025-03-12",
          timesUsed: 8
        },
        {
          id: 3,
          name: "Reminder Email",
          subject: "Reminder: {{conference_name}} starting soon",
          type: "REMINDER",
          status: "DRAFT",
          lastUsed: null,
          timesUsed: 0
        }
      ]
    };
  },

  /**
   * Get template by ID
   * @param {number} templateId
   * @returns {Promise<Object>}
   */
  async getTemplateById(templateId) {
    await delay();
    
    return {
      success: true,
      data: {
        id: templateId,
        name: "Keynote Invitation",
        subject: "Invitation to speak at {{conference_name}}",
        body: `Dear {{recipient_name}},\n\nWe are honored to invite you to speak at {{conference_name}}...\n\nBest regards,\n{{sender_name}}`,
        type: "INVITATION",
        status: "ACTIVE",
        variables: ["conference_name", "recipient_name", "sender_name"],
        createdAt: "2025-01-15",
        updatedAt: "2025-03-10"
      }
    };
  },

  /**
   * Get email logs
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async getEmailLogs(conferenceId, filters = {}) {
    await delay();
    
    const logs = [
      {
        id: 1,
        recipient: "dr.jane@university.edu",
        recipientName: "Dr. Jane Doe",
        template: "Keynote Invitation",
        subject: "Invitation to speak at ICAI 2026",
        status: "ACCEPTED",
        sentAt: "2025-03-10 09:30:00",
        openedAt: "2025-03-10 14:22:00",
        respondedAt: "2025-03-11 10:15:00"
      },
      {
        id: 2,
        recipient: "prof.john@institute.com",
        recipientName: "Prof. John Smith",
        template: "Session Chair Invitation",
        subject: "Invitation to chair a session",
        status: "PENDING",
        sentAt: "2025-03-12 11:00:00",
        openedAt: "2025-03-12 15:30:00",
        respondedAt: null
      },
      {
        id: 3,
        recipient: "dr.mike@research.org",
        recipientName: "Dr. Mike Johnson",
        template: "Keynote Invitation",
        subject: "Invitation to speak at ICAI 2026",
        status: "DECLINED",
        sentAt: "2025-03-08 10:00:00",
        openedAt: "2025-03-08 16:45:00",
        respondedAt: "2025-03-09 09:20:00"
      }
    ];

    return {
      success: true,
      data: {
        logs: logs,
        total: logs.length
      }
    };
  },

  /**
   * Send invitation email
   * @param {Object} emailData
   * @returns {Promise<Object>}
   */
  async sendInvitation(emailData) {
    await delay(800);
    
    console.log('Mock: Sending email', emailData);
    
    return {
      success: true,
      message: "Invitation sent successfully",
      data: {
        id: Math.floor(Math.random() * 1000) + 100,
        ...emailData,
        status: "SENT",
        sentAt: new Date().toISOString()
      }
    };
  },

  /**
   * Create or update template
   * @param {Object} templateData
   * @returns {Promise<Object>}
   */
  async saveTemplate(templateData) {
    await delay();
    
    console.log('Mock: Saving template', templateData);
    
    return {
      success: true,
      message: templateData.id ? "Template updated" : "Template created",
      data: {
        id: templateData.id || Math.floor(Math.random() * 1000) + 100,
        ...templateData,
        updatedAt: new Date().toISOString()
      }
    };
  },

  /**
   * Schedule reminder emails
   * @param {Object} scheduleData
   * @returns {Promise<Object>}
   */
  async scheduleReminder(scheduleData) {
    await delay();
    
    console.log('Mock: Scheduling reminder', scheduleData);
    
    return {
      success: true,
      message: "Reminder scheduled successfully",
      data: {
        id: Math.floor(Math.random() * 1000) + 100,
        ...scheduleData,
        status: "SCHEDULED",
        scheduledAt: new Date().toISOString()
      }
    };
  }
};

export default mockEmailService;
