import React, { useEffect } from "react";
import { Plus, Edit, X, Loader, AlertCircle, Settings } from "lucide-react";
import { useRegistration } from "../../../hooks/secretariat/useRegistration";
import Button from "../../../ui/Button"

/* ===== STATUS BADGE ===== */
const StatusBadge = ({ status }) => {
  const isActive = status === "Active";
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
        isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {status}
    </span>
  );
};

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-[14px] text-slate-600 mt-4">Loading settings...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading settings</strong>
    </div>
    <p className="text-[14px] text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== INFO BOX ===== */
const InfoBox = ({ children, type = "info" }) => {
  const config = {
    info: { bg: "bg-[#eff6ff]", border: "border-[#dbeafe]", text: "text-[#1e40af]" },
    warning: { bg: "bg-amber-50", border: "border-[#fde68a]", text: "text-amber-700" },
    success: { bg: "bg-green-50", border: "border-[#a7f3d0]", text: "text-green-700" },
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
          <h1 className="text-[28px] font-semibold text-slate-900 leading-tight mb-2">
            Registration Settings 🎟️
          </h1>
          <p className="text-[14px] text-slate-600 leading-relaxed">
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
            <h3 className="text-[16px] font-semibold text-slate-900 mb-2">
              Registration Portal Status
            </h3>
            <p className="text-[14px] text-slate-600">
              Portal is currently{" "}
              <span
                className={`font-semibold ${
                  portalOpen ? "text-green-600" : "text-red-600"
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
          <h3 className="text-[18px] font-semibold text-slate-900">Ticket Types</h3>
          <Button size="sm" icon={Plus}>
            Add Ticket Type
          </Button>
        </div>

        <div className="space-y-3">
          {ticketTypes.map((t) => (
            <div
              key={t.id}
              className="bg-slate-50 border border-[#e2e8f0] rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h4 className="text-[14px] font-semibold text-slate-900 mb-1">
                    {t.name}
                  </h4>
                  <div className="flex items-center gap-4 text-[13px] text-slate-600">
                    <span>
                      Limit:{" "}
                      <strong className="text-slate-700">
                        {t.limit ?? "No Limit"}
                      </strong>
                    </span>
                    <span>
                      Sold: <strong className="text-slate-700">{t.sold}</strong>
                    </span>
                    {typeof t.limit === "number" && (
                      <span>
                        Available:{" "}
                        <strong
                          className={
                            t.limit - t.sold < 10
                              ? "text-amber-600"
                              : "text-green-600"
                          }
                        >
                          {t.limit - t.sold}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[16px] font-bold text-blue-600">
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
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (t.sold / t.limit) * 100 > 90
                          ? "bg-amber-600"
                          : "bg-green-600"
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