/**
 * CMS SERVICE - Mock API
 * Handles content management, publishing, and post-event communication
 */

const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

let mockContent = [
  {
    id: "C001",
    title: "Call for Papers (CFP)",
    status: "Published",
    date: "2024-10-01",
    publishDate: "2024-10-01T00:00:00Z",
    views: 1240,
    content: "We invite submissions for ICAI 2026...",
    author: "Conference Committee",
  },
  {
    id: "C002",
    title: "Final Agenda",
    status: "Scheduled",
    scheduledDate: "2025-04-15",
    date: "2025-04-01",
    views: 0,
    content: "Conference schedule and session details...",
    author: "Program Committee",
  },
  {
    id: "C003",
    title: "Venue Information & Map",
    status: "Published",
    date: "2024-12-01",
    publishDate: "2024-12-01T08:00:00Z",
    views: 856,
    content: "Conference venue details and directions...",
    author: "Logistics Team",
  },
  {
    id: "C004",
    title: "Keynote Speakers Bio",
    status: "Draft",
    date: "2025-03-25",
    views: 0,
    content: "Biographies of our distinguished keynote speakers...",
    author: "Communications Team",
  },
];

let postEventData = {
  attendees: 234,
  speakers: 45,
  sponsors: 12,
  lastEmailSent: null,
};

/**
 * Get all content with filters
 */
export const getContent = async (filters = {}) => {
  await delay();

  let filtered = [...mockContent];

  if (filters.status) {
    filtered = filtered.filter((c) => c.status === filters.status);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(search) ||
        c.content.toLowerCase().includes(search)
    );
  }

  return {
    success: true,
    data: filtered,
    total: filtered.length,
  };
};

/**
 * Get content by ID
 */
export const getContentById = async (id) => {
  await delay();

  const content = mockContent.find((c) => c.id === id);

  if (!content) {
    return {
      success: false,
      error: "Content not found",
    };
  }

  return {
    success: true,
    data: content,
  };
};

/**
 * Create new content
 */
export const createContent = async (contentData) => {
  await delay();

  const newContent = {
    id: `C${String(mockContent.length + 1).padStart(3, "0")}`,
    ...contentData,
    status: "Draft",
    date: new Date().toISOString().split("T")[0],
    views: 0,
    author: "Current User",
  };

  mockContent.push(newContent);

  return {
    success: true,
    data: newContent,
    message: "Content created successfully",
  };
};

/**
 * Update content
 */
export const updateContent = async (id, updates) => {
  await delay();

  const index = mockContent.findIndex((c) => c.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Content not found",
    };
  }

  mockContent[index] = {
    ...mockContent[index],
    ...updates,
    date: new Date().toISOString().split("T")[0],
  };

  return {
    success: true,
    data: mockContent[index],
    message: "Content updated successfully",
  };
};

/**
 * Publish content
 */
export const publishContent = async (id, publishDate = null) => {
  await delay();

  const index = mockContent.findIndex((c) => c.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Content not found",
    };
  }

  if (publishDate) {
    mockContent[index].status = "Scheduled";
    mockContent[index].scheduledDate = publishDate;
  } else {
    mockContent[index].status = "Published";
    mockContent[index].publishDate = new Date().toISOString();
  }

  return {
    success: true,
    data: mockContent[index],
    message: publishDate ? "Content scheduled successfully" : "Content published successfully",
  };
};

/**
 * Delete content
 */
export const deleteContent = async (id) => {
  await delay();

  const index = mockContent.findIndex((c) => c.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Content not found",
    };
  }

  const deleted = mockContent.splice(index, 1)[0];

  return {
    success: true,
    data: deleted,
    message: "Content deleted successfully",
  };
};

/**
 * Get content statistics
 */
export const getContentStats = async () => {
  await delay(300);

  const total = mockContent.length;
  const published = mockContent.filter((c) => c.status === "Published").length;
  const draft = mockContent.filter((c) => c.status === "Draft").length;
  const scheduled = mockContent.filter((c) => c.status === "Scheduled").length;
  const totalViews = mockContent.reduce((sum, c) => sum + c.views, 0);

  return {
    success: true,
    data: {
      total,
      published,
      draft,
      scheduled,
      totalViews,
    },
  };
};

/**
 * Get post-event statistics
 */
export const getPostEventStats = async () => {
  await delay(300);

  return {
    success: true,
    data: postEventData,
  };
};

/**
 * Send post-event email
 */
export const sendPostEventEmail = async (emailData) => {
  await delay(1500);

  const { subject, content, attachments = [], recipients = "all", scheduledTime } = emailData;

  // Simulate email sending
  postEventData.lastEmailSent = {
    subject,
    sentAt: scheduledTime || new Date().toISOString(),
    recipientCount: postEventData.attendees,
    status: scheduledTime ? "scheduled" : "sent",
  };

  return {
    success: true,
    data: postEventData.lastEmailSent,
    message: scheduledTime
      ? `Email scheduled for ${new Date(scheduledTime).toLocaleString()}`
      : `Email sent to ${postEventData.attendees} recipients`,
  };
};

/**
 * Get email templates
 */
export const getEmailTemplates = async () => {
  await delay(300);

  return {
    success: true,
    data: [
      {
        id: "TPL001",
        name: "Thank You Email",
        subject: "Thank You for Attending ICAI 2026!",
        content: "Dear [Name],\n\nThank you for participating...",
      },
      {
        id: "TPL002",
        name: "Proceedings Notification",
        subject: "Conference Proceedings Now Available",
        content: "Dear [Name],\n\nThe conference proceedings are now available...",
      },
      {
        id: "TPL003",
        name: "Feedback Request",
        subject: "We Value Your Feedback",
        content: "Dear [Name],\n\nPlease help us improve...",
      },
    ],
  };
};

/**
 * Track email opens/clicks
 */
export const trackEmailEngagement = async (emailId) => {
  await delay(200);

  return {
    success: true,
    data: {
      opens: Math.floor(Math.random() * 200) + 50,
      clicks: Math.floor(Math.random() * 100) + 20,
      bounces: Math.floor(Math.random() * 10),
    },
  };
};

export default {
  getContent,
  getContentById,
  createContent,
  updateContent,
  publishContent,
  deleteContent,
  getContentStats,
  getPostEventStats,
  sendPostEventEmail,
  getEmailTemplates,
  trackEmailEngagement,
};
