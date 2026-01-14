/* ===== MOCK DATA: SESSIONS & STAFF ===== */

// Sessions cho từng hội nghị
export const mockSessions = {
  "conf-1": [
    {
      id: "s1",
      date: "15 Jan 2024",
      time: "09:00 - 10:30",
      room: "Hall A",
      title: "Opening Keynote: Future of AI",
      chair: { id: "p1", name: "Dr. Nguyen Van A", available: true },
      technician: { id: "t1", name: "Tran Van B", available: true },
      status: "assigned", // assigned | pending | conflict
    },
    {
      id: "s2",
      date: "15 Jan 2024",
      time: "11:00 - 12:30",
      room: "Hall B",
      title: "Machine Learning Applications",
      chair: null,
      technician: { id: "t2", name: "Le Thi C", available: false }, // bận phiên khác
      status: "pending",
    },
    {
      id: "s3",
      date: "15 Jan 2024",
      time: "14:00 - 15:30",
      room: "Hall A",
      title: "Deep Learning Workshop",
      chair: { id: "p2", name: "Prof. Pham Thi D", available: true },
      technician: null,
      status: "pending",
    },
    {
      id: "s4",
      date: "16 Jan 2024",
      time: "09:00 - 10:30",
      room: "Hall C",
      title: "AI Ethics Panel Discussion",
      chair: { id: "p1", name: "Dr. Nguyen Van A", available: false }, // xung đột với s5
      technician: { id: "t3", name: "Hoang Van E", available: true },
      status: "conflict",
    },
    {
      id: "s5",
      date: "16 Jan 2024",
      time: "09:00 - 10:30",
      room: "Hall D",
      title: "Natural Language Processing",
      chair: { id: "p1", name: "Dr. Nguyen Van A", available: false }, // xung đột với s4
      technician: { id: "t4", name: "Nguyen Thi F", available: true },
      status: "conflict",
    },
  ],
  "conf-2": [
    {
      id: "s1",
      date: "20 Jan 2024",
      time: "09:00 - 10:30",
      room: "Auditorium A",
      title: "Cancer Research Updates",
      chair: { id: "p1", name: "Dr. Tran Van A", available: true },
      technician: { id: "t1", name: "Le Van B", available: true },
      status: "assigned",
    },
    {
      id: "s2",
      date: "20 Jan 2024",
      time: "11:00 - 12:30",
      room: "Room 101",
      title: "Cardiovascular Studies",
      chair: { id: "p2", name: "Prof. Nguyen Thi C", available: true },
      technician: { id: "t2", name: "Pham Thi D", available: true },
      status: "assigned",
    },
  ],
};

// Available chairs cho từng hội nghị
export const mockAvailableChairs = {
  "conf-1": [
    { id: "p1", name: "Dr. Nguyen Van A", expertise: "AI/ML" },
    { id: "p2", name: "Prof. Pham Thi D", expertise: "Deep Learning" },
    { id: "p3", name: "Dr. Le Van G", expertise: "NLP" },
    { id: "p4", name: "Assoc. Prof. Tran Thi H", expertise: "Computer Vision" },
  ],
  "conf-2": [
    { id: "p1", name: "Dr. Tran Van A", expertise: "Oncology" },
    { id: "p2", name: "Prof. Nguyen Thi C", expertise: "Cardiology" },
  ],
};

// Available technicians cho từng hội nghị
export const mockAvailableTechnicians = {
  "conf-1": [
    { id: "t1", name: "Tran Van B" },
    { id: "t2", name: "Le Thi C" },
    { id: "t3", name: "Hoang Van E" },
    { id: "t4", name: "Nguyen Thi F" },
    { id: "t5", name: "Pham Van G" },
  ],
  "conf-2": [
    { id: "t1", name: "Le Van B" },
    { id: "t2", name: "Pham Thi D" },
  ],
};

// Helper functions
export const getSessionsByConferenceId = (conferenceId) => {
  return mockSessions[conferenceId] || [];
};

export const getAvailableChairsByConferenceId = (conferenceId) => {
  return mockAvailableChairs[conferenceId] || [];
};

export const getAvailableTechniciansByConferenceId = (conferenceId) => {
  return mockAvailableTechnicians[conferenceId] || [];
};
