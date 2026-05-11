import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Loader2,
  Megaphone,
  Clock,
  CalendarClock,
} from "lucide-react";
import {
  useUserNotifications,
  type UserNotification,
} from "@/features/notifications/services/queries";
import {
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from "@/features/notifications/services/mutations";
import {
  decodeHtmlEntities,
  shouldHideNotification,
} from "@/features/notifications/utils/notificationContent";

const formatRelativeTime = (isoString?: string | null): string => {
  if (!isoString) return "Just now";
  const now = new Date();
  const past = new Date(isoString);
  if (Number.isNaN(past.getTime())) return "Just now";
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<UserNotification | null>(
    null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: notifications = [], isLoading: loading } =
    useUserNotifications();
  const markAsReadMutation = useMarkNotificationAsReadMutation();
  const markAllAsReadMutation = useMarkAllNotificationsAsReadMutation();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  // Close when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const markAsRead = async (notifId: number) => {
    await markAsReadMutation.mutateAsync(notifId);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    await markAllAsReadMutation.mutateAsync(unreadIds);
  };

  const handleItemClick = async (notif: UserNotification) => {
    setSelectedNotif(notif);
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
  };

  const getNotifTitle = (n: UserNotification) =>
    n.dynamic_title || n.notifications?.title || "Notification";
  const getNotifContent = (n: UserNotification) =>
    n.dynamic_content || n.notifications?.content || "";
  const renderNotificationHtml = (n: UserNotification) =>
    decodeHtmlEntities(getNotifContent(n));

  const visibleNotifications = notifications.filter((notification) => {
    const title = getNotifTitle(notification);
    const content = getNotifContent(notification);
    const type = notification.notifications?.type || null;

    return !shouldHideNotification({ title, content, type });
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className="relative p-2 rounded-full text-slate-500 hover:text-brand-700 hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {visibleNotifications.filter((n) => !n.is_read).length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse shadow-sm">
            {visibleNotifications.filter((n) => !n.is_read).length > 9
              ? "9+"
              : visibleNotifications.filter((n) => !n.is_read).length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[360px] bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-600" />
              <span className="font-semibold text-slate-900 text-sm">
                Notifications
              </span>
              {visibleNotifications.some(
                (notification) => !notification.is_read,
              ) && (
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {
                      visibleNotifications.filter(
                        (notification) => !notification.is_read,
                      ).length
                    }{" "}
                    new
                  </span>
                )}
            </div>
            <div className="flex items-center gap-1">
              {visibleNotifications.some(
                (notification) => !notification.is_read,
              ) && (
                  <button
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Bell className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  No notifications yet
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              visibleNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors group ${!n.is_read ? "bg-brand-50/40" : ""
                    }`}
                >
                  {/* Type Icon */}
                  <div
                    className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${!n.is_read
                        ? "bg-brand-100 text-brand-600"
                        : "bg-slate-100 text-slate-400"
                      }`}
                  >
                    {(n.notifications?.target_criteria as any)?.notification_type === "session_start" ? (
                      <CalendarClock className="w-4 h-4" />
                    ) : (
                      <Megaphone className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm leading-snug line-clamp-2 ${!n.is_read
                            ? "font-semibold text-slate-900"
                            : "font-medium text-slate-600"
                          }`}
                      >
                        {getNotifTitle(n)}
                      </p>
                      {!n.is_read && (
                        <span className="flex-shrink-0 w-2 h-2 mt-1 rounded-full bg-brand-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                      {decodeHtmlEntities(getNotifContent(n))
                        .replace(/<[^>]+>/g, "")
                        .substring(0, 80)}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="w-3 h-3 text-slate-300" />
                      <span className="text-[11px] text-slate-400">
                        {formatRelativeTime(n.notifications?.created_at)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotif &&
        createPortal(
          <div
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedNotif(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
                    {(selectedNotif.notifications?.target_criteria as any)?.notification_type === "session_start" ? (
                      <CalendarClock className="w-4 h-4 text-brand-600" />
                    ) : (
                      <Megaphone className="w-4 h-4 text-brand-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                      {selectedNotif.notifications?.type || "Notification"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatRelativeTime(
                        selectedNotif.notifications?.created_at,
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-5 overflow-y-auto max-h-[calc(80vh-80px)]">
                <h2 className="text-xl font-bold text-slate-900 mb-4 leading-snug">
                  {getNotifTitle(selectedNotif)}
                </h2>
                <div
                  className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderNotificationHtml(selectedNotif),
                  }}
                />

                {/* Attachments */}
                {selectedNotif.notifications?.attachments &&
                  Array.isArray(selectedNotif.notifications.attachments) &&
                  selectedNotif.notifications.attachments.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Attachments
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedNotif.notifications.attachments.map(
                          (att: any, idx: number) => (
                            <a
                              key={idx}
                              href={att.url || att}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-100 transition-colors"
                            >
                              {att.name || `File ${idx + 1}`}
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Check className="w-4 h-4 text-emerald-500" />
                  Marked as read · Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default NotificationBell;
