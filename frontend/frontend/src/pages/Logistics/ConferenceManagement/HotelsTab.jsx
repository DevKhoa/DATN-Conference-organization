import React, { useState } from "react";
import {
  Hotel,
  ExternalLink,
  MapPin,
  Tag,
  Edit,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Save,
  X,
} from "lucide-react";
import Button from "../../../ui/Button";

/* ===== HOTEL CARD COMPONENT ===== */
const HotelCard = ({ hotel, onEdit, onDelete, onToggleStatus }) => {
  const isPublished = hotel.status === "published";

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all overflow-hidden ${
        isPublished
          ? "border-[#10b981] shadow-md"
          : "border-[#e2e8f0] opacity-75"
      }`}
    >
      {/* Header với Status Badge */}
      <div className="p-4 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white">
        <div className="flex items-start justify-between mb-2">
          <h4 className="m-0 text-[18px] font-bold">{hotel.name}</h4>
          <div
            className={`px-2 py-1 rounded text-[11px] font-semibold ${
              isPublished ? "bg-[#10b981]" : "bg-[#64748b]"
            }`}
          >
            {isPublished ? "✓ CÔNG BỐ" : "📝 NHÁP"}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px] opacity-90">
          <MapPin size={14} />
          <span>{hotel.distance}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="space-y-3 mb-4">
          {/* Website */}
          {hotel.website && (
            <div className="flex items-start gap-2">
              <ExternalLink size={16} className="text-[#2563eb] mt-0.5" />
              <a
                href={hotel.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-[#2563eb] hover:underline break-all"
              >
                {hotel.website}
              </a>
            </div>
          )}

          {/* Discount */}
          {hotel.discount && (
            <div className="flex items-start gap-2">
              <Tag size={16} className="text-[#f59e0b] mt-0.5" />
              <span className="text-[14px] text-[#1e293b] font-medium">
                {hotel.discount}
              </span>
            </div>
          )}

          {/* Room Block */}
          {hotel.roomBlock && (
            <div className="flex items-start gap-2">
              <Hotel size={16} className="text-[#8b5cf6] mt-0.5" />
              <span className="text-[14px] text-[#64748b]">
                {hotel.roomBlock}
              </span>
            </div>
          )}
        </div>

        {/* Map Link */}
        {hotel.mapUrl && (
          <a
            href={hotel.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-3 text-[13px] text-[#2563eb] hover:underline"
          >
            🗺️ Xem trên Google Maps
          </a>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-[#e2e8f0]">
          <Button
            icon={isPublished ? EyeOff : Eye}
            variant="outline"
            size="sm"
            onClick={() => onToggleStatus(hotel.id)}
            style={{ flex: 1 }}
          >
            {isPublished ? "Ẩn" : "Công bố"}
          </Button>
          <Button
            icon={Edit}
            variant="ghost"
            size="sm"
            onClick={() => onEdit(hotel)}
          >
            Sửa
          </Button>
          <Button
            icon={Trash2}
            variant="ghost"
            size="sm"
            onClick={() => onDelete(hotel.id)}
          >
            Xóa
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ===== HOTEL FORM MODAL ===== */
const HotelFormModal = ({ hotel, onSave, onClose }) => {
  const [formData, setFormData] = useState(
    hotel || {
      name: "",
      website: "",
      discount: "",
      roomBlock: "",
      distance: "",
      mapUrl: "",
      status: "draft",
    }
  );

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
            {hotel ? "Chỉnh sửa Khách sạn" : "Thêm Khách sạn mới"}
          </h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Tên khách sạn <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="VD: Hanoi Grand Hotel"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="https://example.com"
              />
            </div>

            {/* Discount */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Mã giảm giá / Ưu đãi
              </label>
              <input
                type="text"
                value={formData.discount}
                onChange={(e) => handleChange("discount", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="VD: 15% off với code AI2024"
              />
            </div>

            {/* Room Block */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Số phòng đặt trước
              </label>
              <input
                type="text"
                value={formData.roomBlock}
                onChange={(e) => handleChange("roomBlock", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="VD: 20 phòng đặt trước"
              />
            </div>

            {/* Distance */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Khoảng cách từ hội trường
              </label>
              <input
                type="text"
                value={formData.distance}
                onChange={(e) => handleChange("distance", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="VD: 500m từ hội trường"
              />
            </div>

            {/* Map URL */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Google Maps URL
              </label>
              <input
                type="url"
                value={formData.mapUrl}
                onChange={(e) => handleChange("mapUrl", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                placeholder="https://maps.google.com/?q=..."
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[14px] font-medium text-[#1e293b] mb-2">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="draft">Nháp</option>
                <option value="published">Công bố</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-[#e2e8f0]">
            <Button
              icon={Save}
              variant="primary"
              type="submit"
              style={{ flex: 1 }}
            >
              {hotel ? "Lưu thay đổi" : "Thêm khách sạn"}
            </Button>
            <Button icon={X} variant="outline" onClick={onClose}>
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ===== MAIN TAB COMPONENT ===== */
const HotelsTab = ({ hotels: initialHotels }) => {
  const [hotels, setHotels] = useState(initialHotels || []);
  const [showForm, setShowForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [filter, setFilter] = useState("all"); // all | published | draft

  const handleSave = (hotelData) => {
    if (editingHotel) {
      // Update existing
      setHotels((prev) =>
        prev.map((h) =>
          h.id === editingHotel.id ? { ...hotelData, id: h.id } : h
        )
      );
    } else {
      // Add new
      setHotels((prev) => [
        ...prev,
        { ...hotelData, id: `h${Date.now()}` },
      ]);
    }
    setShowForm(false);
    setEditingHotel(null);
  };

  const handleEdit = (hotel) => {
    setEditingHotel(hotel);
    setShowForm(true);
  };

  const handleDelete = (hotelId) => {
    if (confirm("Bạn có chắc muốn xóa khách sạn này?")) {
      setHotels((prev) => prev.filter((h) => h.id !== hotelId));
    }
  };

  const handleToggleStatus = (hotelId) => {
    setHotels((prev) =>
      prev.map((h) =>
        h.id === hotelId
          ? {
              ...h,
              status: h.status === "published" ? "draft" : "published",
            }
          : h
      )
    );
  };

  const handleAddNew = () => {
    setEditingHotel(null);
    setShowForm(true);
  };

  // Filter hotels
  const filteredHotels =
    filter === "all"
      ? hotels
      : hotels.filter((h) => h.status === filter);

  const stats = {
    total: hotels.length,
    published: hotels.filter((h) => h.status === "published").length,
    draft: hotels.filter((h) => h.status === "draft").length,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e8f0]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="m-0 mb-2 text-[20px] font-semibold text-[#1e293b]">
            🏨 Quản lý Danh sách Khách sạn
          </h3>
          <div className="flex gap-3 text-[13px]">
            <span className="text-[#2563eb] font-medium">
              📋 Tổng: {stats.total}
            </span>
            <span className="text-[#10b981] font-medium">
              ✓ Công bố: {stats.published}
            </span>
            <span className="text-[#64748b] font-medium">
              📝 Nháp: {stats.draft}
            </span>
          </div>
        </div>

        <Button icon={Plus} variant="primary" onClick={handleAddNew}>
          Thêm khách sạn
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
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
          onClick={() => setFilter("published")}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            filter === "published"
              ? "bg-[#2563eb] text-white"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc]"
          }`}
        >
          Công bố ({stats.published})
        </button>
        <button
          onClick={() => setFilter("draft")}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            filter === "draft"
              ? "bg-[#2563eb] text-white"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc]"
          }`}
        >
          Nháp ({stats.draft})
        </button>
      </div>

      {/* Hotel Grid */}
      {filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-[#f8fafc] rounded-lg border-2 border-dashed border-[#e2e8f0]">
          <Hotel size={48} className="mx-auto mb-3 text-[#94a3b8]" />
          <p className="text-[#64748b] text-[14px] m-0">
            {filter === "all"
              ? "Chưa có khách sạn nào. Nhấn 'Thêm khách sạn' để bắt đầu!"
              : `Không có khách sạn nào ở trạng thái ${
                  filter === "published" ? "Công bố" : "Nháp"
                }`}
          </p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <HotelFormModal
          hotel={editingHotel}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingHotel(null);
          }}
        />
      )}
    </div>
  );
};

export default HotelsTab;
