import React, { useState } from "react";
import {
  Plane,
  User,
  Clock,
  Hotel,
  Phone,
  Edit,
  Check,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Button from "../../../ui/Button";

/* ===== VIP GUEST CARD COMPONENT ===== */
const VIPGuestCard = ({ guest, onUpdateStatus, onEdit }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusConfig = (status) => {
    const configs = {
      new: {
        label: "Mới",
        color: "bg-[#64748b15] text-[#64748b] border-[#64748b]",
        icon: "📨",
      },
      contacted: {
        label: "Đã liên hệ",
        color: "bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b]",
        icon: "📞",
      },
      confirmed: {
        label: "Đã xác nhận",
        color: "bg-[#10b98115] text-[#10b981] border-[#10b981]",
        icon: "✓",
      },
      completed: {
        label: "Hoàn tất",
        color: "bg-[#2563eb15] text-[#2563eb] border-[#2563eb]",
        icon: "🎉",
      },
    };
    return configs[status] || configs.new;
  };

  const statusConfig = getStatusConfig(guest.pickupStatus);

  return (
    <div className="bg-white rounded-xl border-2 border-[#e2e8f0] hover:border-[#2563eb] hover:shadow-lg transition-all overflow-hidden">
      {/* Header */}
      <div
        className="p-4 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="m-0 mb-1 text-[18px] font-bold">
              {guest.guestName}
            </h4>
            <div className="flex items-center gap-2 text-[13px] opacity-90">
              <User size={14} />
              <span>{guest.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`px-2 py-1 rounded text-[11px] font-semibold border ${statusConfig.color} bg-white`}
            >
              {statusConfig.icon} {statusConfig.label.toUpperCase()}
            </div>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Quick Info (Always Visible) */}
      <div className="p-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="flex items-start gap-2">
            <Plane size={14} className="text-[#2563eb] mt-0.5" />
            <div>
              <div className="text-[#64748b] text-[11px] mb-0.5">
                Chuyến bay
              </div>
              <div className="font-medium text-[#1e293b]">
                {guest.flightNumber}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={14} className="text-[#10b981] mt-0.5" />
            <div>
              <div className="text-[#64748b] text-[11px] mb-0.5">Đến</div>
              <div className="font-medium text-[#1e293b]">
                {guest.arrivalTime}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Departure */}
          <div className="flex items-start gap-2">
            <Clock size={16} className="text-[#ef4444] mt-0.5" />
            <div>
              <div className="text-[12px] text-[#64748b] mb-1">
                Thời gian khởi hành
              </div>
              <div className="text-[14px] font-medium text-[#1e293b]">
                {guest.departureTime}
              </div>
            </div>
          </div>

          {/* Hotel */}
          <div className="flex items-start gap-2">
            <Hotel size={16} className="text-[#8b5cf6] mt-0.5" />
            <div>
              <div className="text-[12px] text-[#64748b] mb-1">Lưu trú</div>
              <div className="text-[14px] font-medium text-[#1e293b]">
                {guest.hotelBooking || (
                  <span className="text-[#f59e0b]">Chưa xác định</span>
                )}
              </div>
            </div>
          </div>

          {/* Driver */}
          <div className="flex items-start gap-2">
            <Phone size={16} className="text-[#10b981] mt-0.5" />
            <div>
              <div className="text-[12px] text-[#64748b] mb-1">
                Tài xế đưa đón
              </div>
              <div className="text-[14px] font-medium text-[#1e293b]">
                {guest.assignedDriver || (
                  <span className="text-[#f59e0b]">Chưa phân công</span>
                )}
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {guest.specialRequests && (
            <div className="flex items-start gap-2 p-3 bg-[#fef3c7] border border-[#fde68a] rounded-lg">
              <MessageSquare size={16} className="text-[#f59e0b] mt-0.5" />
              <div>
                <div className="text-[12px] font-medium text-[#f59e0b] mb-1">
                  Yêu cầu đặc biệt
                </div>
                <div className="text-[13px] text-[#92400e]">
                  {guest.specialRequests}
                </div>
              </div>
            </div>
          )}

          {/* Status Flow */}
          <div className="pt-4 border-t border-[#e2e8f0]">
            <div className="text-[12px] font-medium text-[#64748b] mb-3">
              Cập nhật trạng thái:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["new", "contacted", "confirmed", "completed"].map((status) => {
                const config = getStatusConfig(status);
                const isActive = guest.pickupStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => onUpdateStatus(guest.id, status)}
                    disabled={isActive}
                    className={`px-3 py-2 rounded-lg text-[13px] font-medium border transition-all ${
                      isActive
                        ? config.color + " border-2"
                        : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2563eb]"
                    }`}
                  >
                    {config.icon} {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-[#e2e8f0]">
            <Button
              icon={Edit}
              variant="primary"
              size="sm"
              onClick={() => onEdit(guest)}
              style={{ flex: 1 }}
            >
              Chỉnh sửa thông tin
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ===== EDIT MODAL ===== */
const VIPEditModal = ({ guest, onSave, onClose }) => {
  const [formData, setFormData] = useState(guest);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#e2e8f0] bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white">
          <h3 className="m-0 text-[20px] font-bold">
            Chỉnh sửa thông tin VIP Guest
          </h3>
          <p className="text-[14px] opacity-90 mt-1 m-0">
            {formData.guestName}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Guest Name */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Tên khách VIP
              </label>
              <input
                type="text"
                required
                value={formData.guestName}
                onChange={(e) => handleChange("guestName", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Vai trò
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => handleChange("role", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="VD: Keynote Speaker"
              />
            </div>

            {/* Flight Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                  Số hiệu chuyến bay
                </label>
                <input
                  type="text"
                  value={formData.flightNumber}
                  onChange={(e) => handleChange("flightNumber", e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  placeholder="VD: VN123"
                />
              </div>
            </div>

            {/* Arrival & Departure */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                  Thời gian đến
                </label>
                <input
                  type="text"
                  value={formData.arrivalTime}
                  onChange={(e) => handleChange("arrivalTime", e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  placeholder="DD MMM YYYY, HH:MM"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                  Thời gian đi
                </label>
                <input
                  type="text"
                  value={formData.departureTime}
                  onChange={(e) =>
                    handleChange("departureTime", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  placeholder="DD MMM YYYY, HH:MM"
                />
              </div>
            </div>

            {/* Hotel Booking */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Đặt phòng khách sạn
              </label>
              <input
                type="text"
                value={formData.hotelBooking}
                onChange={(e) => handleChange("hotelBooking", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="VD: Hanoi Grand Hotel - Suite Room"
              />
            </div>

            {/* Assigned Driver */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Tài xế được phân công
              </label>
              <input
                type="text"
                value={formData.assignedDriver || ""}
                onChange={(e) =>
                  handleChange("assignedDriver", e.target.value)
                }
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="VD: Nguyen Van A - 0912345678"
              />
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Yêu cầu đặc biệt
              </label>
              <textarea
                rows={3}
                value={formData.specialRequests}
                onChange={(e) =>
                  handleChange("specialRequests", e.target.value)
                }
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="Ghi chú về yêu cầu đặc biệt của khách..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-[#e2e8f0]">
            <Button variant="primary" type="submit" style={{ flex: 1 }}>
              Lưu thay đổi
            </Button>
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ===== MAIN TAB COMPONENT ===== */
const VIPTab = ({ vipServices: initialServices }) => {
  const [services, setServices] = useState(initialServices || []);
  const [editingGuest, setEditingGuest] = useState(null);
  const [filter, setFilter] = useState("all");

  const handleUpdateStatus = (guestId, newStatus) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === guestId ? { ...s, pickupStatus: newStatus } : s
      )
    );
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
  };

  const handleSave = (updatedGuest) => {
    setServices((prev) =>
      prev.map((s) => (s.id === updatedGuest.id ? updatedGuest : s))
    );
    setEditingGuest(null);
  };

  // Filter services
  const filteredServices =
    filter === "all"
      ? services
      : services.filter((s) => s.pickupStatus === filter);

  const stats = {
    total: services.length,
    new: services.filter((s) => s.pickupStatus === "new").length,
    contacted: services.filter((s) => s.pickupStatus === "contacted").length,
    confirmed: services.filter((s) => s.pickupStatus === "confirmed").length,
    completed: services.filter((s) => s.pickupStatus === "completed").length,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e8f0]">
      {/* Header */}
      <div className="mb-6">
        <h3 className="m-0 mb-2 text-[20px] font-semibold text-[#1e293b]">
          ✈️ Dịch vụ Đưa đón & Lưu trú VIP
        </h3>
        <div className="flex flex-wrap gap-3 text-[13px]">
          <span className="text-[#64748b] font-medium">
            📋 Tổng: {stats.total}
          </span>
          <span className="text-[#f59e0b] font-medium">
            ⏳ Chưa xử lý: {stats.new + stats.contacted}
          </span>
          <span className="text-[#10b981] font-medium">
            ✓ Đã xác nhận: {stats.confirmed + stats.completed}
          </span>
        </div>
      </div>

      {/* Alert for pending items */}
      {stats.new > 0 && (
        <div className="mb-6 p-4 bg-[#fef2f2] border border-[#fee2e2] rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-[#ef4444] mt-0.5" />
          <div>
            <div className="text-[14px] font-medium text-[#ef4444] mb-1">
              ⚠️ Cần xử lý ngay
            </div>
            <div className="text-[13px] text-[#991b1b]">
              Có {stats.new} yêu cầu VIP mới chưa được liên hệ
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            filter === "all"
              ? "bg-[#2563eb] text-white"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc]"
          }`}
        >
          Tất cả ({stats.total})
        </button>
        <button
          onClick={() => setFilter("new")}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            filter === "new"
              ? "bg-[#2563eb] text-white"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc]"
          }`}
        >
          📨 Mới ({stats.new})
        </button>
        <button
          onClick={() => setFilter("contacted")}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            filter === "contacted"
              ? "bg-[#2563eb] text-white"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc]"
          }`}
        >
          📞 Đã liên hệ ({stats.contacted})
        </button>
        <button
          onClick={() => setFilter("confirmed")}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            filter === "confirmed"
              ? "bg-[#2563eb] text-white"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc]"
          }`}
        >
          ✓ Đã xác nhận ({stats.confirmed})
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            filter === "completed"
              ? "bg-[#2563eb] text-white"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc]"
          }`}
        >
          🎉 Hoàn tất ({stats.completed})
        </button>
      </div>

      {/* VIP Guest Cards */}
      {filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredServices.map((guest) => (
            <VIPGuestCard
              key={guest.id}
              guest={guest}
              onUpdateStatus={handleUpdateStatus}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-[#f8fafc] rounded-lg border-2 border-dashed border-[#e2e8f0]">
          <Plane size={48} className="mx-auto mb-3 text-[#94a3b8]" />
          <p className="text-[#64748b] text-[14px] m-0">
            Không có khách VIP nào trong danh sách này
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {editingGuest && (
        <VIPEditModal
          guest={editingGuest}
          onSave={handleSave}
          onClose={() => setEditingGuest(null)}
        />
      )}
    </div>
  );
};

export default VIPTab;
