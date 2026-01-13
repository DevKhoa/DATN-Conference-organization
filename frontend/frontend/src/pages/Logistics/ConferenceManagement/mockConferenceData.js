/* ===== MOCK DATA CHO HỆ THỐNG QUẢN LÝ HỘI NGHỊ ===== */

// Data cho danh sách hội nghị
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

// Thống kê tổng quan
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

// Data chi tiết cho từng hội nghị
export const mockConferenceDetails = {
  "conf-1": {
    id: "conf-1",
    name: "International AI Summit 2024",
    date: "15-17 Jan 2024",
    location: "Grand Convention Center, Hanoi",
    daysUntil: 3,
    status: "live",
    // DATA CHO TAB "PHIÊN & NHÂN SỰ"
    sessions: [
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
    // Danh sách nhân sự khả dụng
    availableChairs: [
      { id: "p1", name: "Dr. Nguyen Van A", expertise: "AI/ML" },
      { id: "p2", name: "Prof. Pham Thi D", expertise: "Deep Learning" },
      { id: "p3", name: "Dr. Le Van G", expertise: "NLP" },
      { id: "p4", name: "Assoc. Prof. Tran Thi H", expertise: "Computer Vision" },
    ],
    availableTechnicians: [
      { id: "t1", name: "Tran Van B" },
      { id: "t2", name: "Le Thi C" },
      { id: "t3", name: "Hoang Van E" },
      { id: "t4", name: "Nguyen Thi F" },
      { id: "t5", name: "Pham Van G" },
    ],
    // DATA CHO TAB "DỊCH VỤ & TIỆC"
    events: [
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
    // DATA CHO TAB "KHÁCH SẠN"
    hotels: [
      {
        id: "h1",
        name: "Hanoi Grand Hotel",
        website: "https://hanoigrand.com",
        discount: "15% off với code AI2024",
        roomBlock: "20 phòng đặt trước",
        distance: "500m từ hội trường",
        mapUrl: "https://maps.google.com/?q=Hanoi+Grand+Hotel",
        status: "published", // published | draft
      },
      {
        id: "h2",
        name: "Luxury Suites Hanoi",
        website: "https://luxurysuites.vn",
        discount: "10% off + Miễn phí đưa đón",
        roomBlock: "15 phòng đặt trước",
        distance: "1.2km từ hội trường",
        mapUrl: "https://maps.google.com/?q=Luxury+Suites+Hanoi",
        status: "published",
      },
      {
        id: "h3",
        name: "Budget Inn",
        website: "https://budgetinn.com",
        discount: "20% off",
        roomBlock: "10 phòng",
        distance: "2km từ hội trường",
        mapUrl: "",
        status: "draft",
      },
    ],
    // DATA CHO TAB "DỊCH VỤ VIP"
    vipServices: [
      {
        id: "v1",
        guestName: "Prof. John Smith",
        role: "Keynote Speaker",
        flightNumber: "VN123",
        arrivalTime: "14 Jan 2024, 14:30",
        departureTime: "18 Jan 2024, 10:00",
        pickupStatus: "confirmed", // new | contacted | confirmed | completed
        hotelBooking: "Hanoi Grand Hotel - Suite Room",
        specialRequests: "Vegetarian meals, Early check-in",
        assignedDriver: "Nguyen Van X - 0912345678",
      },
      {
        id: "v2",
        guestName: "Dr. Maria Garcia",
        role: "Panel Speaker",
        flightNumber: "QR456",
        arrivalTime: "15 Jan 2024, 08:00",
        departureTime: "17 Jan 2024, 16:30",
        pickupStatus: "contacted",
        hotelBooking: "Luxury Suites - Deluxe Room",
        specialRequests: "Wheelchair accessible",
        assignedDriver: null,
      },
      {
        id: "v3",
        guestName: "Prof. Li Wei",
        role: "Workshop Leader",
        flightNumber: "CA789",
        arrivalTime: "14 Jan 2024, 20:15",
        departureTime: "17 Jan 2024, 22:00",
        pickupStatus: "new",
        hotelBooking: "TBD",
        specialRequests: "",
        assignedDriver: null,
      },
    ],
  },
  "conf-2": {
    id: "conf-2",
    name: "Medical Research Conference",
    date: "20-22 Jan 2024",
    location: "University Medical Center, HCMC",
    daysUntil: 8,
    status: "live",
    sessions: [
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
    availableChairs: [
      { id: "p1", name: "Dr. Tran Van A", expertise: "Oncology" },
      { id: "p2", name: "Prof. Nguyen Thi C", expertise: "Cardiology" },
    ],
    availableTechnicians: [
      { id: "t1", name: "Le Van B" },
      { id: "t2", name: "Pham Thi D" },
    ],
    events: [
      {
        id: "e1",
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
    hotels: [
      {
        id: "h1",
        name: "Medical Center Hotel",
        website: "https://medcenterhotel.vn",
        discount: "20% off",
        roomBlock: "25 phòng",
        distance: "100m từ hội trường",
        mapUrl: "https://maps.google.com",
        status: "published",
      },
    ],
    vipServices: [
      {
        id: "v1",
        guestName: "Dr. Robert Johnson",
        role: "Keynote Speaker",
        flightNumber: "UA555",
        arrivalTime: "19 Jan 2024, 16:00",
        departureTime: "23 Jan 2024, 09:00",
        pickupStatus: "confirmed",
        hotelBooking: "Medical Center Hotel - Premium Suite",
        specialRequests: "Airport lounge access",
        assignedDriver: "Tran Van Y - 0987654321",
      },
    ],
  },
};

// Helper function để lấy conference details theo ID
export const getConferenceById = (conferenceId) => {
  return mockConferenceDetails[conferenceId] || null;
};

// Helper function để lấy conference overview theo ID
export const getConferenceOverview = (conferenceId) => {
  return mockConferences.find((conf) => conf.id === conferenceId) || null;
};