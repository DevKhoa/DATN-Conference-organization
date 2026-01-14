/**
 * REGISTRATION SERVICE - Mock API
 * Handles registration management, ticket settings, and participant data
 */

// Simulated delay for API calls
const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data storage
let mockRegistrations = [
  {
    id: "R001",
    name: "John Smith",
    email: "john@example.com",
    ticket: "Full Access",
    payment: "paid",
    status: "pending",
    amount: 350,
    registeredAt: "2025-01-10T09:30:00Z",
  },
  {
    id: "R002",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    ticket: "Student",
    payment: "paid",
    status: "approved",
    amount: 150,
    registeredAt: "2025-01-11T14:20:00Z",
  },
  {
    id: "R003",
    name: "Mike Chen",
    email: "mike@example.com",
    ticket: "Full Access",
    payment: "unpaid",
    status: "pending",
    amount: 350,
    registeredAt: "2025-01-12T10:15:00Z",
  },
  {
    id: "R004",
    name: "Emily Wang",
    email: "emily@example.com",
    ticket: "Early Bird",
    payment: "paid",
    status: "approved",
    amount: 300,
    registeredAt: "2025-01-09T08:00:00Z",
  },
];

let mockTicketTypes = [
  {
    id: "TT001",
    name: "Full Access (Early Bird)",
    price: 300,
    limit: 100,
    sold: 78,
    status: "Active",
  },
  {
    id: "TT002",
    name: "Regular Attendee",
    price: 350,
    limit: null,
    sold: 145,
    status: "Active",
  },
  {
    id: "TT003",
    name: "Student",
    price: 150,
    limit: 150,
    sold: 92,
    status: "Active",
  },
  {
    id: "TT004",
    name: "On-Site Registration",
    price: 400,
    limit: null,
    sold: 0,
    status: "Inactive",
  },
];

let portalSettings = {
  isOpen: true,
  openDate: "2024-11-01T00:00:00Z",
  closeDate: "2025-04-10T23:59:59Z",
};

/**
 * Get all registrations with optional filters
 */
export const getRegistrations = async (filters = {}) => {
  await delay();

  let filtered = [...mockRegistrations];

  // Apply filters
  if (filters.status) {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters.payment) {
    filtered = filtered.filter((r) => r.payment === filters.payment);
  }
  if (filters.ticket) {
    filtered = filtered.filter((r) => r.ticket === filters.ticket);
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.email.toLowerCase().includes(search) ||
        r.id.toLowerCase().includes(search)
    );
  }

  return {
    success: true,
    data: filtered,
    total: filtered.length,
  };
};

/**
 * Get registration by ID
 */
export const getRegistrationById = async (id) => {
  await delay();

  const registration = mockRegistrations.find((r) => r.id === id);

  if (!registration) {
    return {
      success: false,
      error: "Registration not found",
    };
  }

  return {
    success: true,
    data: registration,
  };
};

/**
 * Approve registration
 */
export const approveRegistration = async (id) => {
  await delay();

  const index = mockRegistrations.findIndex((r) => r.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Registration not found",
    };
  }

  mockRegistrations[index].status = "approved";

  return {
    success: true,
    data: mockRegistrations[index],
    message: "Registration approved successfully",
  };
};

/**
 * Reject registration
 */
export const rejectRegistration = async (id, reason) => {
  await delay();

  const index = mockRegistrations.findIndex((r) => r.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Registration not found",
    };
  }

  mockRegistrations[index].status = "rejected";
  mockRegistrations[index].rejectionReason = reason;

  return {
    success: true,
    data: mockRegistrations[index],
    message: "Registration rejected",
  };
};

/**
 * Get registration statistics
 */
export const getRegistrationStats = async () => {
  await delay(300);

  const total = mockRegistrations.length;
  const pending = mockRegistrations.filter((r) => r.status === "pending").length;
  const approved = mockRegistrations.filter((r) => r.status === "approved").length;
  const paid = mockRegistrations.filter((r) => r.payment === "paid").length;
  const totalRevenue = mockRegistrations
    .filter((r) => r.payment === "paid")
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    success: true,
    data: {
      total,
      pending,
      approved,
      paid,
      totalRevenue,
    },
  };
};

/**
 * Get all ticket types
 */
export const getTicketTypes = async () => {
  await delay();

  return {
    success: true,
    data: mockTicketTypes,
  };
};

/**
 * Create ticket type
 */
export const createTicketType = async (ticketData) => {
  await delay();

  const newTicket = {
    id: `TT${String(mockTicketTypes.length + 1).padStart(3, "0")}`,
    ...ticketData,
    sold: 0,
    status: "Active",
  };

  mockTicketTypes.push(newTicket);

  return {
    success: true,
    data: newTicket,
    message: "Ticket type created successfully",
  };
};

/**
 * Update ticket type
 */
export const updateTicketType = async (id, updates) => {
  await delay();

  const index = mockTicketTypes.findIndex((t) => t.id === id);

  if (index === -1) {
    return {
      success: false,
      error: "Ticket type not found",
    };
  }

  mockTicketTypes[index] = {
    ...mockTicketTypes[index],
    ...updates,
  };

  return {
    success: true,
    data: mockTicketTypes[index],
    message: "Ticket type updated successfully",
  };
};

/**
 * Get portal settings
 */
export const getPortalSettings = async () => {
  await delay(300);

  return {
    success: true,
    data: portalSettings,
  };
};

/**
 * Toggle portal status
 */
export const togglePortalStatus = async () => {
  await delay();

  portalSettings.isOpen = !portalSettings.isOpen;

  return {
    success: true,
    data: portalSettings,
    message: `Portal ${portalSettings.isOpen ? "opened" : "closed"} successfully`,
  };
};

/**
 * Export registrations to CSV
 */
export const exportRegistrations = async (format = "csv") => {
  await delay(1000);

  // Simulate file generation
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `registrations_${timestamp}.${format}`;

  return {
    success: true,
    data: {
      filename,
      url: `#download/${filename}`,
      count: mockRegistrations.length,
    },
    message: "Export completed successfully",
  };
};

/**
 * Verify payment transaction
 */
export const verifyPayment = async (registrationId, transactionId) => {
  await delay(1500);

  const index = mockRegistrations.findIndex((r) => r.id === registrationId);

  if (index === -1) {
    return {
      success: false,
      error: "Registration not found",
    };
  }

  // Simulate payment verification
  const isValid = Math.random() > 0.1; // 90% success rate

  if (isValid) {
    mockRegistrations[index].payment = "paid";
    mockRegistrations[index].transactionId = transactionId;
    mockRegistrations[index].paidAt = new Date().toISOString();

    return {
      success: true,
      data: mockRegistrations[index],
      message: "Payment verified successfully",
    };
  } else {
    return {
      success: false,
      error: "Payment verification failed",
      data: {
        transactionId,
        reason: "Transaction not found or invalid",
      },
    };
  }
};

/**
 * Send confirmation email after payment
 */
export const sendConfirmationEmail = async (registrationId) => {
  await delay(1000);

  const registration = mockRegistrations.find((r) => r.id === registrationId);

  if (!registration) {
    return {
      success: false,
      error: "Registration not found",
    };
  }

  if (registration.payment !== "paid") {
    return {
      success: false,
      error: "Payment not completed",
    };
  }

  return {
    success: true,
    data: {
      registrationId,
      emailSent: true,
      sentTo: registration.email,
      sentAt: new Date().toISOString(),
      qrCode: `QR_${registrationId}_${Date.now()}`,
    },
    message: "Confirmation email sent with QR code",
  };
};

/**
 * Detect payment errors and pending transactions
 */
export const detectPaymentErrors = async () => {
  await delay(800);

  const errors = mockRegistrations
    .filter((r) => r.payment === "unpaid" && r.status === "approved")
    .map((r) => ({
      registrationId: r.id,
      name: r.name,
      email: r.email,
      amount: r.amount,
      daysPending: Math.floor((Date.now() - new Date(r.registeredAt)) / 86400000),
      errorType: "payment_pending",
    }));

  return {
    success: true,
    data: {
      errors,
      count: errors.length,
      checkedAt: new Date().toISOString(),
    },
  };
};

/**
 * Send payment reminder email
 */
export const sendPaymentReminder = async (registrationId) => {
  await delay(1000);

  const registration = mockRegistrations.find((r) => r.id === registrationId);

  if (!registration) {
    return {
      success: false,
      error: "Registration not found",
    };
  }

  return {
    success: true,
    data: {
      registrationId,
      reminderSent: true,
      sentTo: registration.email,
      sentAt: new Date().toISOString(),
      reminderCount: (registration.reminderCount || 0) + 1,
    },
    message: "Payment reminder sent",
  };
};

/**
 * Cancel registration due to payment timeout
 */
export const cancelRegistration = async (registrationId, reason = "Payment timeout") => {
  await delay(800);

  const index = mockRegistrations.findIndex((r) => r.id === registrationId);

  if (index === -1) {
    return {
      success: false,
      error: "Registration not found",
    };
  }

  mockRegistrations[index].status = "cancelled";
  mockRegistrations[index].cancelledAt = new Date().toISOString();
  mockRegistrations[index].cancelReason = reason;

  return {
    success: true,
    data: mockRegistrations[index],
    message: "Registration cancelled successfully",
  };
};

/**
 * Process payment error batch (auto-reminder/cancel)
 */
export const processPaymentErrors = async (action = "remind") => {
  await delay(2000);

  const pendingPayments = mockRegistrations.filter(
    (r) => r.payment === "unpaid" && r.status === "approved"
  );

  const results = [];

  for (const reg of pendingPayments) {
    const daysPending = Math.floor((Date.now() - new Date(reg.registeredAt)) / 86400000);

    if (action === "remind" && daysPending >= 1 && daysPending < 3) {
      results.push({
        registrationId: reg.id,
        action: "reminded",
        success: true,
      });
    } else if (action === "cancel" && daysPending >= 3) {
      results.push({
        registrationId: reg.id,
        action: "cancelled",
        success: true,
      });
    }
  }

  return {
    success: true,
    data: {
      processed: results.length,
      reminded: results.filter((r) => r.action === "reminded").length,
      cancelled: results.filter((r) => r.action === "cancelled").length,
      results,
    },
    message: `Processed ${results.length} payment errors`,
  };
};

export default {
  getRegistrations,
  getRegistrationById,
  approveRegistration,
  rejectRegistration,
  getRegistrationStats,
  getTicketTypes,
  createTicketType,
  updateTicketType,
  getPortalSettings,
  togglePortalStatus,
  exportRegistrations,
  verifyPayment,
  sendConfirmationEmail,
  detectPaymentErrors,
  sendPaymentReminder,
  cancelRegistration,
  processPaymentErrors,
};
