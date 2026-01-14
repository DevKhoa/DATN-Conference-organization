/* ===== MOCK DATA: EVENTS & ATTENDEES ===== */

// Events cho từng hội nghị
export const mockEvents = {
  "conf-1": [
    {
      id: "e1",
      name: "Welcome Reception",
      date: "15 Jan 2024",
      time: "18:00 - 20:00",
      venue: "Garden Terrace",
      attendees: 120,
      vegetarian: 15,
      allergies: ["Gluten: 3", "Seafood: 2"],
      checkedIn: 0,
    },
    {
      id: "e2",
      name: "Gala Dinner",
      date: "16 Jan 2024",
      time: "19:00 - 22:00",
      venue: "Grand Ballroom",
      attendees: 150,
      vegetarian: 20,
      allergies: ["Gluten: 5", "Nuts: 1", "Seafood: 4"],
      checkedIn: 0,
    },
  ],
  "conf-2": [
    {
      id: "e3",
      name: "Conference Dinner",
      date: "21 Jan 2024",
      time: "19:00 - 21:30",
      venue: "Riverside Restaurant",
      attendees: 120,
      vegetarian: 12,
      allergies: ["Seafood: 3", "Dairy: 2"],
      checkedIn: 0,
    },
  ],
};

// Attendees cho từng event
export const mockAttendees = {
  e1: [
    {
      id: "a1",
      name: "Nguyen Van A",
      email: "nvana@example.com",
      dietary: ["Chay"],
      checkedIn: false,
    },
    {
      id: "a2",
      name: "Tran Thi B",
      email: "ttb@example.com",
      dietary: ["Dị ứng Gluten"],
      checkedIn: true,
    },
    {
      id: "a3",
      name: "Le Van C",
      email: "lvc@example.com",
      dietary: [],
      checkedIn: false,
    },
    {
      id: "a4",
      name: "Pham Thi D",
      email: "ptd@example.com",
      dietary: ["Chay", "Dị ứng Hải sản"],
      checkedIn: false,
    },
    {
      id: "a5",
      name: "Hoang Van E",
      email: "hve@example.com",
      dietary: ["Dị ứng Hải sản"],
      checkedIn: true,
    },
  ],
  e2: [
    {
      id: "a1",
      name: "Nguyen Van A",
      email: "nvana@example.com",
      dietary: ["Chay"],
      checkedIn: false,
    },
    {
      id: "a2",
      name: "Tran Thi B",
      email: "ttb@example.com",
      dietary: ["Dị ứng Gluten"],
      checkedIn: true,
    },
    {
      id: "a3",
      name: "Le Van C",
      email: "lvc@example.com",
      dietary: [],
      checkedIn: false,
    },
    {
      id: "a4",
      name: "Pham Thi D",
      email: "ptd@example.com",
      dietary: ["Chay", "Dị ứng Hải sản"],
      checkedIn: false,
    },
    {
      id: "a5",
      name: "Hoang Van E",
      email: "hve@example.com",
      dietary: ["Dị ứng Hải sản"],
      checkedIn: true,
    },
  ],
  e3: [
    {
      id: "a1",
      name: "Nguyen Van A",
      email: "nvana@example.com",
      dietary: ["Chay"],
      checkedIn: false,
    },
    {
      id: "a2",
      name: "Tran Thi B",
      email: "ttb@example.com",
      dietary: ["Dị ứng Gluten"],
      checkedIn: true,
    },
    {
      id: "a3",
      name: "Le Van C",
      email: "lvc@example.com",
      dietary: [],
      checkedIn: false,
    },
  ],
};

// Helper functions
export const getEventsByConferenceId = (conferenceId) => {
  return mockEvents[conferenceId] || [];
};

export const getAttendeesByEventId = (eventId) => {
  return mockAttendees[eventId] || [];
};
