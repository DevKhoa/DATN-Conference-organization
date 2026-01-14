import React, { useState } from "react";
import {
  QrCode,
  Search,
  Printer,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  Camera,
  Upload,
} from "lucide-react";
import Button from "../../../ui/Button";
import { mockCheckinStats, mockRecentScans } from "@/services/logistics";

/* ===== STAT CARD ===== */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={24} color={color} />
      </div>
      <div>
        <div className="text-[13px] text-[#64748b] mb-1">{label}</div>
        <div className="text-[28px] font-bold" style={{ color }}>
          {value}
        </div>
      </div>
    </div>
  </div>
);

/* ===== RECENT SCAN ITEM ===== */
const RecentScanItem = ({ scan }) => {
  const isSuccess = scan.status === "success";

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-[#e2e8f0] mb-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        {isSuccess ? (
          <CheckCircle size={20} className="text-[#10b981]" />
        ) : (
          <XCircle size={20} className="text-[#ef4444]" />
        )}
        <div>
          <div className="font-medium text-[#1e293b]">{scan.name}</div>
          <div className="text-[13px] text-[#64748b]">{scan.email}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[13px] text-[#64748b]">{scan.time}</div>
        <div className={`text-[12px] font-medium ${
          isSuccess ? "text-[#10b981]" : "text-[#ef4444]"
        }`}>
          {scan.conference}
        </div>
      </div>
    </div>
  );
};

/* ===== MAIN QR SCANNER ===== */
const QRScanner = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  /* ===== MOCK DATA ===== */
  const stats = mockCheckinStats;
  const [recentScans, setRecentScans] = useState(mockRecentScans);

  /* ===== HANDLERS ===== */
  const handleQRScan = () => {
    setIsScanning(true);
    alert("Mở camera để quét QR Code");
    // TODO: Implement QR scanner with camera
    setTimeout(() => setIsScanning(false), 2000);
  };

  const handleUploadQR = () => {
    alert("Tải lên hình ảnh QR Code");
    // TODO: Implement QR upload
  };

  const handleSearchAttendee = () => {
    alert(`Tìm kiếm người tham dự: ${searchQuery}`);
    // TODO: Implement search functionality
  };

  const handlePrintBadge = () => {
    alert("Mở giao diện in badge nhanh");
    // TODO: Implement badge printing
  };

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div className="mb-6">
        <h2 className="m-0 mb-2 text-[28px] font-semibold text-[#1e293b]">
          QR Code Scanner 📱
        </h2>
        <p className="text-[#64748b] text-sm">
          Quét mã QR để check-in người tham dự hoặc tìm kiếm thông tin nhanh
        </p>
      </div>

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          icon={QrCode}
          label="Số lượt quét hôm nay"
          value={stats.todayScans}
          color="#2563eb"
        />
        <StatCard
          icon={CheckCircle}
          label="Tỷ lệ thành công"
          value={`${stats.successRate}%`}
          color="#10b981"
        />
        <StatCard
          icon={XCircle}
          label="Quét thất bại"
          value={stats.failedScans}
          color="#ef4444"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - QR SCANNER */}
        <div className="lg:col-span-2">
          {/* ===== QR SCANNER AREA ===== */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <h3 className="m-0 mb-6 text-lg font-semibold text-[#1e293b] text-center">
              Quét mã QR Check-in
            </h3>

            {/* Scanner Display */}
            <div className="bg-[#f8fafc] rounded-xl p-8 mb-6 flex items-center justify-center min-h-[400px] border-2 border-dashed border-[#cbd5e1]">
              {isScanning ? (
                <div className="text-center">
                  <Camera size={64} className="text-[#2563eb] mx-auto mb-4 animate-pulse" />
                  <p className="text-[#64748b] text-lg">Đang quét...</p>
                </div>
              ) : (
                <div className="text-center">
                  <QrCode size={64} className="text-[#cbd5e1] mx-auto mb-4" />
                  <p className="text-[#64748b]">Nhấn nút bên dưới để bắt đầu quét</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                icon={Camera}
                variant="primary"
                onClick={handleQRScan}
                size="lg"
                style={{ width: "100%" }}
                disabled={isScanning}
              >
                {isScanning ? "Đang quét..." : "Bắt đầu quét"}
              </Button>
              <Button
                icon={Upload}
                variant="secondary"
                onClick={handleUploadQR}
                size="lg"
                style={{ width: "100%" }}
              >
                Tải ảnh QR lên
              </Button>
            </div>
          </div>

          {/* ===== RECENT SCANS ===== */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-lg font-semibold text-[#1e293b]">
                Lịch sử quét gần đây
              </h3>
              <span className="text-[13px] text-[#64748b]">
                {recentScans.length} lượt quét
              </span>
            </div>

            <div>
              {recentScans.map((scan) => (
                <RecentScanItem key={scan.id} scan={scan} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - QUICK ACTIONS */}
        <div>
          {/* ===== SEARCH ATTENDEE ===== */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="m-0 mb-4 text-lg font-semibold text-[#1e293b]">
              Tìm kiếm nhanh 🔍
            </h3>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tìm theo Tên/Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 p-2.5 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:border-[#2563eb]"
                  onKeyPress={(e) => e.key === "Enter" && handleSearchAttendee()}
                />
                <Button
                  icon={Search}
                  variant="primary"
                  onClick={handleSearchAttendee}
                />
              </div>

              <Button
                icon={Printer}
                variant="ghost"
                onClick={handlePrintBadge}
                size="md"
                style={{ width: "100%" }}
              >
                In Badge nhanh
              </Button>
            </div>
          </div>

          {/* ===== TIPS ===== */}
          <div className="bg-gradient-to-br from-[#2563eb] to-[#1e40af] rounded-xl shadow-sm p-6 text-white">
            <h3 className="m-0 mb-3 text-lg font-semibold">
              💡 Mẹo sử dụng
            </h3>
            <ul className="space-y-2 text-[13px] leading-relaxed">
              <li>• Đảm bảo mã QR nằm trong khung hình</li>
              <li>• Giữ camera ổn định khi quét</li>
              <li>• Tránh ánh sáng phản chiếu vào mã QR</li>
              <li>• Nếu quét thất bại, dùng chức năng tìm kiếm</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;