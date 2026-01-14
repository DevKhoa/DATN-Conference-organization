/* ===== MOCK DATA: CONFERENCES ===== */

// Danh sách tất cả hội nghị
export const mockConferences = [
  {
    id: "conf-1",
    name: "International AI Summit 2024",
    date: "15-17 Jan 2024",
    location: "Grand Convention Center, Hanoi",
    image: null,
    status: "live",
    daysUntil: 3,
    staffing: { value: "12/15 phiên", status: "warning" },
    gala: { attendees: 150 },
    hotels: { count: 5 },
    vip: { value: "3/5 đã chốt xe", status: "warning" },
    alerts: ["2 phiên chưa có Session Chair", "Thiếu 3 Kỹ thuật viên"],
  },
  {
    id: "conf-2",
    name: "Medical Research Conference",
    date: "20-22 Jan 2024",
    location: "University Medical Center, HCMC",
    image: null,
    status: "live",
    daysUntil: 8,
    staffing: { value: "8/10 phiên", status: "success" },
    gala: { attendees: 120 },
    hotels: { count: 3 },
    vip: { value: "2/2 hoàn tất", status: "success" },
    alerts: [],
  },
  {
    id: "conf-3",
    name: "Education Technology Forum",
    date: "25-26 Jan 2024",
    location: "Innovation Hub, Da Nang",
    image: null,
    status: "upcoming",
    daysUntil: 13,
    staffing: { value: "6/8 phiên", status: "success" },
    gala: { attendees: 80 },
    hotels: { count: 2 },
    vip: { value: "1/1 hoàn tất", status: "success" },
    alerts: [],
  },
  {
    id: "conf-4",
    name: "Blockchain & Fintech Summit",
    date: "1-3 Feb 2024",
    location: "Tech Park Convention Center, Hanoi",
    image: null,
    status: "upcoming",
    daysUntil: 20,
    staffing: { value: "4/12 phiên", status: "danger" },
    gala: { attendees: 200 },
    hotels: { count: 4 },
    vip: { value: "0/3 chưa xử lý", status: "danger" },
    alerts: ["8 phiên chưa có nhân sự", "Chưa xác nhận địa điểm Gala"],
  },
];

// Thống kê tổng quan cho Conference Gallery
export const mockStats = {
  totalConferences: 8,
  liveConferences: 3,
  staffingComplete: 87,
  staffAssigned: 42,
  staffTotal: 48,
  vipPending: 5,
  hotelsPublished: 12,
  hotelsDraft: 3,
};

// Helper function
export const getConferenceById = (conferenceId) => {
  return mockConferences.find((conf) => conf.id === conferenceId) || null;
};
