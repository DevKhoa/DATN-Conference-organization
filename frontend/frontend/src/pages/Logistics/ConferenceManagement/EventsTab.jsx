import React, { useState } from "react";
import {
  UtensilsCrossed,
  Users,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  MapPin,
  Clock,
} from "lucide-react";
import Button from "../../../ui/Button";

/* ===== ATTENDEE ROW COMPONENT ===== */
const AttendeeRow = ({ attendee, onCheckIn }) => {
  return (
    <tr className="border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors">
      <td className="px-4 py-3 text-[14px]">{attendee.name}</td>
      <td className="px-4 py-3 text-[14px] text-[#64748b]">{attendee.email}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {attendee.dietary.length > 0 ? (
            attendee.dietary.map((diet, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-[#fef3c7] text-[#f59e0b] rounded text-[12px] font-medium"
              >
                {diet}
              </span>
            ))
          ) : (
            <span className="text-[#94a3b8] text-[12px]">Không có</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        {attendee.checkedIn ? (
          <div className="flex items-center justify-center gap-1 text-[#10b981]">
            <CheckCircle2 size={16} />
            <span className="text-[13px] font-medium">Đã check-in</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCheckIn(attendee.id)}
          >
            Check-in
          </Button>
        )}
      </td>
    </tr>
  );
};

/* ===== EVENT CARD COMPONENT ===== */
const EventCard = ({ event, isActive, onClick }) => {
  const checkinRate = Math.round((event.checkedIn / event.attendees) * 100);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        isActive
          ? "border-[#2563eb] bg-[#eff6ff] shadow-md"
          : "border-[#e2e8f0] bg-white hover:border-[#2563eb] hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="m-0 text-[16px] font-semibold text-[#1e293b]">
          {event.name}
        </h4>
        <UtensilsCrossed
          size={20}
          className={isActive ? "text-[#2563eb]" : "text-[#64748b]"}
        />
      </div>

      <div className="space-y-2 text-[13px] text-[#64748b]">
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          <span>{event.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} />
          <span>{event.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} />
          <span>{event.venue}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-[#64748b]">
            <Users size={14} className="inline mr-1" />
            {event.attendees} khách
          </span>
          <span
            className={`font-medium ${
              checkinRate > 50 ? "text-[#10b981]" : "text-[#f59e0b]"
            }`}
          >
            {event.checkedIn}/{event.attendees} đã check-in
          </span>
        </div>
      </div>
    </button>
  );
};

/* ===== MAIN TAB COMPONENT ===== */
const EventsTab = ({ events }) => {
  const [activeEventId, setActiveEventId] = useState(events[0]?.id || null);
  const [eventData, setEventData] = useState(events);

  const activeEvent = eventData.find((e) => e.id === activeEventId);

  // Mock attendees data
  const [attendees, setAttendees] = useState([
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
  ]);

  const handleCheckIn = (attendeeId) => {
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === attendeeId ? { ...a, checkedIn: true } : a
      )
    );

    setEventData((prev) =>
      prev.map((e) =>
        e.id === activeEventId ? { ...e, checkedIn: e.checkedIn + 1 } : e
      )
    );
  };

  const handleExport = () => {
    alert("📊 Xuất danh sách Excel (Coming soon...)");
  };

  if (!activeEvent) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e8f0] text-center">
        <p className="text-[#64748b]">Chưa có sự kiện nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventData.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isActive={activeEventId === event.id}
            onClick={() => setActiveEventId(event.id)}
          />
        ))}
      </div>

      {/* Active Event Details */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#e2e8f0] bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white">
          <h3 className="m-0 mb-4 text-[22px] font-bold">
            {activeEvent.name}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-[13px] opacity-90 mb-1">Tổng khách</div>
              <div className="text-[24px] font-bold">{activeEvent.attendees}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-[13px] opacity-90 mb-1">Suất chay</div>
              <div className="text-[24px] font-bold">
                {activeEvent.vegetarian}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-[13px] opacity-90 mb-1">Dị ứng</div>
              <div className="text-[24px] font-bold">
                {activeEvent.allergies.length}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-[13px] opacity-90 mb-1">Đã check-in</div>
              <div className="text-[24px] font-bold">{activeEvent.checkedIn}</div>
            </div>
          </div>
        </div>

        {/* Allergies Alert */}
        {activeEvent.allergies.length > 0 && (
          <div className="p-4 bg-[#fef2f2] border-b border-[#fee2e2]">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-[#ef4444] mt-0.5" />
              <div>
                <div className="text-[13px] font-medium text-[#ef4444] mb-1">
                  ⚠️ Lưu ý về Dị ứng:
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeEvent.allergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white border border-[#fee2e2] rounded text-[12px] text-[#ef4444]"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendee Table */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="m-0 text-[16px] font-semibold text-[#1e293b]">
              Danh sách tham dự
            </h4>
            <Button icon={Download} variant="outline" size="sm" onClick={handleExport}>
              Xuất Excel
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
            <table className="w-full">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <tr>
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#64748b]">
                    Tên
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#64748b]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#64748b]">
                    Ghi chú đặc biệt
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-semibold text-[#64748b]">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((attendee) => (
                  <AttendeeRow
                    key={attendee.id}
                    attendee={attendee}
                    onCheckIn={handleCheckIn}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsTab;