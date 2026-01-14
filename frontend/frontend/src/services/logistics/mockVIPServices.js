/* ===== MOCK DATA: VIP SERVICES ===== */

// VIP Services cho từng hội nghị
export const mockVIPServices = {
  "conf-1": [
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
  "conf-2": [
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
};

// Helper function
export const getVIPServicesByConferenceId = (conferenceId) => {
  return mockVIPServices[conferenceId] || [];
};

// Helper function cho Dashboard - VIP arrivals trong 6h tới
export const getUpcomingVIPArrivals = () => {
  const now = new Date();
  const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  const allVIPs = Object.values(mockVIPServices).flat();

  // Mock data với thời gian tương đối
  return [
    {
      name: "Prof. Nguyễn Văn A",
      flightNumber: "VN208",
      arrivalTime: "14:30",
      hoursUntil: "2.5",
      transportStatus: "ready",
    },
    {
      name: "Dr. Sarah Johnson",
      flightNumber: "QR975",
      arrivalTime: "16:45",
      hoursUntil: "4.75",
      transportStatus: "pending",
    },
    {
      name: "Prof. Michael Chen",
      flightNumber: "SQ656",
      arrivalTime: "18:20",
      hoursUntil: "6.3",
      transportStatus: "missing",
    },
  ];
};
