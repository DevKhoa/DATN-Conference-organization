import React, { useEffect } from "react";
import { Plus, Edit, X, Loader, AlertCircle, Settings } from "lucide-react";
import Button from "../../../ui/Button";
import { useRegistration } from "../../../hooks/secretariat/useRegistration";

/* ===== STATUS BADGE ===== */
const StatusBadge = ({ status }) => {
  const isActive = status === "Active";
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
        isActive ? "bg-[#d1fae5] text-[#059669]" : "bg-[#fee2e2] text-[#dc2626]"
      }`}
    >
      {status}
    </span>
  );
};

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading settings...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading settings</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== INFO BOX ===== */
const InfoBox = ({ children, type = "info" }) => {
  const config = {
    info: { bg: "bg-[#eff6ff]", border: "border-[#dbeafe]", text: "text-[#1e40af]" },
    warning: { bg: "bg-[#fef3c7]", border: "border-[#fde68a]", text: "text-[#d97706]" },
    success: { bg: "bg-[#d1fae5]", border: "border-[#a7f3d0]", text: "text-[#059669]" },
  };

  const style = config[type];

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <p className={`text-[13px] ${style.text} leading-relaxed`}>{children}</p>
    </div>
  );
};

/* ===== MAIN COMPONENT ===== */
const RegistrationSettings = () => {
  const {
    ticketTypes,
    portalSettings,
    loading,
    error,
    fetchTicketTypes,
    fetchPortalSettings,
    togglePortal,
  } = useRegistration();

  useEffect(() => {
    fetchTicketTypes();
    fetchPortalSettings();
  }, [fetchTicketTypes, fetchPortalSettings]);

  if (loading) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          fetchTicketTypes();
          fetchPortalSettings();
        }}
      />
    );

  const portalOpen = portalSettings?.isOpen;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
            Registration Settings 🎟️
          </h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            Configure ticket types, pricing, and limits
          </p>
        </div>

        <Button icon={Settings} variant="secondary">
          Advanced Settings
        </Button>
      </div>

      {/* PORTAL STATUS */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-[16px] font-semibold text-[#1e293b] mb-2">
              Registration Portal Status
            </h3>
            <p className="text-[14px] text-[#64748b]">
              Portal is currently{" "}
              <span
                className={`font-semibold ${
                  portalOpen ? "text-[#10b981]" : "text-[#ef4444]"
                }`}
              >
                {portalOpen ? "OPEN" : "CLOSED"}
              </span>
            </p>
          </div>

          <Button
            icon={X}
            variant={portalOpen ? "danger" : "success"}
            onClick={togglePortal}
          >
            {portalOpen ? "Close Portal" : "Open Portal"}
          </Button>
        </div>
      </div>

      {/* TICKET TYPES */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[18px] font-semibold text-[#1e293b]">Ticket Types</h3>
          <Button size="sm" icon={Plus}>
            Add Ticket Type
          </Button>
        </div>

        <div className="space-y-3">
          {ticketTypes.map((t) => (
            <div
              key={t.id}
              className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h4 className="text-[14px] font-semibold text-[#1e293b] mb-1">
                    {t.name}
                  </h4>
                  <div className="flex items-center gap-4 text-[13px] text-[#64748b]">
                    <span>
                      Limit:{" "}
                      <strong className="text-[#334155]">
                        {t.limit ?? "No Limit"}
                      </strong>
                    </span>
                    <span>
                      Sold: <strong className="text-[#334155]">{t.sold}</strong>
                    </span>
                    {typeof t.limit === "number" && (
                      <span>
                        Available:{" "}
                        <strong
                          className={
                            t.limit - t.sold < 10
                              ? "text-[#f59e0b]"
                              : "text-[#10b981]"
                          }
                        >
                          {t.limit - t.sold}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[16px] font-bold text-[#2563eb]">
                    ${t.price}
                  </span>
                  <StatusBadge status={t.status} />
                  <Button size="sm" icon={Edit} variant="secondary">
                    Edit
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              {typeof t.limit === "number" && (
                <div className="mt-3">
                  <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (t.sold / t.limit) * 100 > 90
                          ? "bg-[#f59e0b]"
                          : "bg-[#10b981]"
                      }`}
                      style={{ width: `${(t.sold / t.limit) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* INFO */}
      <InfoBox type="info">
        💡 <strong>Tip:</strong> Early bird tickets are limited and selling fast!
        Consider increasing capacity or adding a new tier.
      </InfoBox>
    </div>
  );
};

export default RegistrationSettings;
