/* ===== MOCK DATA: DASHBOARD ===== */

import { mockConferences } from "./mockConferences";
import { getUpcomingVIPArrivals } from "./mockVIPServices";

// Today's Overview Stats
export const mockTodayStats = {
  checkInProgress: { current: 876, total: 1024, percentage: 85.5, changeFromYesterday: 45 },
  staffCoverage: {
    total: { current: 42, total: 48 },
    today: { current: 15, total: 18 },
    percentage: 87.5,
  },
  specialMeals: {
    total: { vegetarian: 28, allergies: 15, total: 43 },
    today: { vegetarian: 12, allergies: 6, total: 18 },
  },
};

// Active Conferences với warnings
export const mockActiveConferences = [
  {
    id: "conf-1",
    name: "International AI Summit 2024",
    venue: "Grand Hall A",
    dateRange: "12-14/01",
    currentDay: 2,
    totalDays: 3,
    checkedIn: 342,
    total: 400,
    checkinChange: 28, // so với ngày hôm qua
    warnings: [
      { type: "staff", message: "2/5 phiên chưa đủ nhân sự (thiếu 3 Kỹ thuật viên)" },
      { type: "chair", message: "Session Chair chưa có mặt cho phiên 14:00" },
    ],
  },
  {
    id: "conf-2",
    name: "Medical Research Conference",
    venue: "Conference Center B",
    dateRange: "13/01",
    currentDay: 1,
    totalDays: 1,
    checkedIn: 298,
    total: 328,
    checkinChange: undefined, // không có vì là ngày đầu tiên
    warnings: [{ type: "staff", message: "1/4 phiên chưa có Session Chair" }],
  },
  {
    id: "conf-3",
    name: "Education Technology Forum",
    venue: "Innovation Hub C",
    dateRange: "12-13/01",
    currentDay: 2,
    totalDays: 2,
    checkedIn: 236,
    total: 296,
    checkinChange: 17, // so với ngày hôm qua
    warnings: [],
  },
];

// Issue Log
export const mockIssueLog = [
  {
    type: "schedule",
    message: "Xung đột lịch trình phát hiện tại International AI Summit - Phòng A1",
    time: "2 phút trước",
  },
  {
    type: "vip",
    message: "Prof. Nguyễn Văn A vừa thay đổi giờ bay từ 13:30 → 14:30",
    time: "15 phút trước",
  },
  {
    type: "checkin",
    message: "Check-in thành công tại quầy số 2 - Medical Research Conference",
    time: "23 phút trước",
  },
  {
    type: "schedule",
    message: "Cập nhật: Phòng họp B2 chuyển từ 100 → 120 chỗ ngồi",
    time: "1 giờ trước",
  },
];

// Helper functions
export const getActiveConferences = () => {
  return mockConferences.filter((c) => c.status === "live");
};

export const getVIPArrivalsForDashboard = getUpcomingVIPArrivals;
