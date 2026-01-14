/* ===== CENTRAL EXPORT HUB FOR LOGISTICS MOCK DATA ===== */

// Re-export everything from individual modules
export * from "./mockConferences";
export * from "./mockSessions";
export * from "./mockEvents";
export * from "./mockHotels";
export * from "./mockVIPServices";
export * from "./mockCheckin";
export * from "./mockDashboard";

// Import for building conference details
import { mockConferences } from "./mockConferences";
import {
  mockSessions,
  mockAvailableChairs,
  mockAvailableTechnicians,
} from "./mockSessions";
import { mockEvents } from "./mockEvents";
import { mockHotels } from "./mockHotels";
import { mockVIPServices } from "./mockVIPServices";

// Helper function để lấy conference overview (backward compatibility)
export const getConferenceOverview = (conferenceId) => {
  const conference = mockConferences.find((c) => c.id === conferenceId);
  if (!conference) return null;

  return {
    ...conference,
    sessions: mockSessions[conferenceId] || [],
    availableChairs: mockAvailableChairs[conferenceId] || [],
    availableTechnicians: mockAvailableTechnicians[conferenceId] || [],
    events: mockEvents[conferenceId] || [],
    hotels: mockHotels[conferenceId] || [],
    vipServices: mockVIPServices[conferenceId] || [],
  };
};
