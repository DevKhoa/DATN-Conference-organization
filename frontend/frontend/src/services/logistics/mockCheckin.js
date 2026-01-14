/* ===== MOCK DATA: CHECK-IN & QR SCANNER ===== */

// Stats cho QR Scanner
export const mockCheckinStats = {
  todayScans: 342,
  successRate: 98.5,
  failedScans: 5,
};

// Recent scans cho QR Scanner
export const mockRecentScans = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    conference: "International AI Summit",
    time: "2 phút trước",
    status: "success",
  },
  {
    id: 2,
    name: "Trần Thị B",
    email: "tranthib@email.com",
    conference: "Medical Research Conference",
    time: "5 phút trước",
    status: "success",
  },
  {
    id: 3,
    name: "Lê Văn C",
    email: "levanc@email.com",
    conference: "Education Technology Forum",
    time: "8 phút trước",
    status: "failed",
  },
];

// Live stats cho Secretariat QR Checkin
export const mockLiveStats = [
  { label: "Total Checked In", value: 1247, color: "blue" },
  { label: "Checked In Today", value: 342, color: "green" },
  { label: "Pending", value: 89, color: "yellow" },
];
