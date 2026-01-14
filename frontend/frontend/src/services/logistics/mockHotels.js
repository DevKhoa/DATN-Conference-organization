/* ===== MOCK DATA: HOTELS ===== */

// Hotels cho từng hội nghị
export const mockHotels = {
  "conf-1": [
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
  "conf-2": [
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
};

// Helper function
export const getHotelsByConferenceId = (conferenceId) => {
  return mockHotels[conferenceId] || [];
};
