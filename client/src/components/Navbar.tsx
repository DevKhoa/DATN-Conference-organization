import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Menu,
  X,
  GraduationCap,
  User,
  LogOut,
  Settings,
  Sparkles,
  Wrench,
  ChevronDown,
  Calendar,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import useAuth from "@/features/auth/hooks/useAuth";
import { formatRoleLabel, getHighestRole, Role } from "@/features/auth/types";
import { cn } from "@/lib/utils";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useLogoutMutation } from "@/features/auth/services/mutations";
import { toast } from "sonner";
import { useMyProfileQuery } from "@/features/users/services/queries";
import { isLinkActive, normalizePath } from "@/utils/url";

interface NavbarProps {
  className?: string;
}

const BASE_LINKS: {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}[] = [
    { name: "Home", href: "/" },
    { name: "Papers", href: "/papers" },
    { name: "Conferences", href: "/conferences" },
    { name: "Subscriptions", href: "/subscriptions" },
    { name: "News", href: "/news" },
    { name: "Proceedings", href: "/proceedings" },
  ];

const Navbar: React.FC<NavbarProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);
  const { session, roles, checkRoles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data: profile } = useMyProfileQuery();
  const highestRole = getHighestRole(roles);
  const canSeeAdminTools =
    highestRole === Role.ADMIN || highestRole === Role.SECRETARIAT;
  const canSeeChairInvitations = checkRoles([Role.CHAIR]);
  const logoutMutation = useLogoutMutation();

  const userData = useMemo(() => {
    if (!session) return null;

    return {
      name:
        profile?.full_name ||
        session.user.user_metadata?.full_name ||
        session.user.email?.split("@")[0] ||
        "User",
      email: session.user.email || "",
      avatar:
        profile?.avatar_url || session.user.user_metadata?.avatar_url || "",
      role: formatRoleLabel(getHighestRole(roles)),
    };
  }, [session?.user, roles, profile]);

  const handleLogout = () => {
    setIsProfileOpen(false);

    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Logged out successfully");
        navigate({ to: "/" });
      },
      onError: () => {
        toast.error("Failed to log out. Please try again.");
      },
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  let navLinks = [...BASE_LINKS];

  const currentPath = normalizePath(pathname);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleProfileClick = () => {
    setIsProfileOpen(false);
    navigate({ to: "/profile" });
  };

  const handleMySubscriptionsClick = () => {
    setIsProfileOpen(false);
    navigate({ to: "/subscriptions/me" });
  };

  const handleChairInvitationsClick = () => {
    setIsProfileOpen(false);
    setIsOpen(false);
    navigate({ to: "/chair-invitations" });
  };

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    setIsOpen(false);

    if (href === "/proceedings" && !session) {
      toast.info("Vui lòng tạo tài khoản hoặc đăng nhập để xem Proceedings!", {
        duration: 5000,
      });
      navigate({
        to: "/login",
        search: { redirect: "/proceedings" },
      });
      return;
    }

    navigate({ to: href });
  };

  const handleLogoClick = () => {
    navigate({ to: "/" });
  };

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            id="btn-navbar-logo"
            className="shrink-0 flex items-center gap-2 cursor-pointer"
            onClick={handleLogoClick}
          >
            <div className="bg-primary p-1.5 rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">
              Conf-Org
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navLinks.map((link) => {
              const isActive = isLinkActive(currentPath, link.href);

              return (
                <a
                  key={link.name}
                  id={`navbar-link-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 px-1 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.name}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-primary" />
                  )}
                </a>
              );
            })}

            {/* Admin Tools Dropdown (Thêm từ nhánh pushnoti) */}
            {canSeeAdminTools && (
              <div className="relative group py-5 -my-5">
                <button className="text-sm font-medium transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Wrench className="w-4 h-4" />
                  Admin Tools
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute top-full left-0 mt-0 w-56 bg-background rounded-xl shadow-lg ring-1 ring-border py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <a
                    href="/admin/dashboard"
                    onClick={(e) => handleLinkClick(e, "/admin/dashboard")}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Admin Dashboard
                  </a>
                  <a
                    href="/notifications/create"
                    onClick={(e) => handleLinkClick(e, "/notifications/create")}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Create Notification
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* CTA Buttons or User Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {session && <NotificationBell />}
            {session ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  id="btn-navbar-button-profile"
                  onClick={toggleProfile}
                  className="flex items-center gap-3 pl-4 border-l border-border focus:outline-none group"
                >
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-medium text-foreground leading-none group-hover:text-primary transition-colors">
                      {userData?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {userData?.role || "User"}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-border flex items-center justify-center text-primary font-bold shadow-sm group-hover:bg-primary/20 transition-colors overflow-hidden">
                    {userData?.avatar ? (
                      <img
                        src={userData.avatar}
                        alt={userData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(userData?.name)
                    )}
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-background rounded-xl shadow-lg ring-1 ring-border py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                    <div className="px-4 py-3 border-b border-border mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {userData?.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {userData?.email}
                      </p>
                    </div>
                    <button
                      id="btn-navbar-dropdown-subscriptions"
                      onClick={handleMySubscriptionsClick}
                      className="w-full flex items-center px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Sparkles className="w-4 h-4 mr-3" />
                      My Subscriptions
                    </button>
                    <button
                      id="btn-navbar-dropdown-profile"
                      onClick={handleProfileClick}
                      className="w-full flex items-center px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <User className="w-4 h-4 mr-3" />
                      Your Profile
                    </button>
                    <a
                      id="btn-navbar-dropdown-agenda"
                      href="/agenda/me"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsProfileOpen(false);
                        navigate({ to: "/agenda/me" });
                      }}
                      className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Calendar className="w-4 h-4 mr-3" />
                      My Agenda
                    </a>
                    {canSeeChairInvitations && (
                      <button
                        id="btn-navbar-dropdown-chair-invitations"
                        onClick={handleChairInvitationsClick}
                        className="w-full flex items-center px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Mail className="w-4 h-4 mr-3" />
                        Chair Invitations
                      </button>
                    )}
                    <a
                      id="btn-navbar-dropdown-settings"
                      href="#settings"
                      className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </a>
                    <div className="border-t border-border my-1"></div>
                    <button
                      id="btn-navbar-dropdown-logout"
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button
                  id="btn-navbar-button-signin"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: "/login" })}
                >
                  Sign In
                </Button>
                <Button
                  id="btn-navbar-button-register"
                  size="sm"
                  onClick={() => navigate({ to: "/register" })}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              id="btn-navbar-mobile-toggle"
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-background border-b border-border shadow-xl">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              const isActive = isLinkActive(currentPath, link.href);

              return (
                <a
                  key={link.name}
                  id={`navbar-mobile-link-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-base font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent hover:text-primary",
                  )}
                >
                  {link.icon && <link.icon className="w-5 h-5" />}
                  {link.name}
                </a>
              );
            })}

            {/* Phần Admin Tools bổ sung cho Mobile/Sidebar */}
            {canSeeAdminTools && (
              <div className="pt-2 pb-1">
                <div className="px-3 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin Tools
                </div>
                <div className="flex flex-col space-y-1">
                  <a
                    href="/admin/dashboard"
                    onClick={(e) => handleLinkClick(e, "/admin/dashboard")}
                    className="inline-flex px-3 py-2 ml-4 rounded-md text-base font-medium hover:bg-accent items-center gap-2 text-foreground hover:text-primary"
                  >
                    Admin Dashboard
                  </a>
                  <a
                    href="/notifications/create"
                    onClick={(e) => handleLinkClick(e, "/notifications/create")}
                    className="inline-flex px-3 py-2 ml-4 rounded-md text-base font-medium hover:bg-accent items-center gap-2 text-foreground hover:text-primary"
                  >
                    Create Notification
                  </a>
                </div>
              </div>
            )}
          </div>
          <div className="pt-4 pb-4 border-t border-border">
            <div className="px-5 space-y-3">
              {session ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-border">
                      {userData?.avatar ? (
                        <img
                          src={userData.avatar}
                          alt={userData.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(userData?.name)
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-foreground">
                        {userData?.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {userData?.role || "User"} • {userData?.email}
                      </p>
                    </div>
                  </div>
                  <button
                    id="btn-navbar-mobile-button-subscriptions"
                    onClick={() => {
                      toggleMenu();
                      handleMySubscriptionsClick();
                    }}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    My Subscriptions
                  </button>
                  <button
                    id="navbar-mobile-button-profile"
                    onClick={() => {
                      toggleMenu();
                      handleProfileClick();
                    }}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors shadow-sm"
                  >
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      toggleMenu();
                      navigate({ to: "/agenda/me" });
                    }}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors shadow-sm"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    My Agenda
                  </button>
                  {canSeeChairInvitations && (
                    <button
                      id="btn-navbar-mobile-button-chair-invitations"
                      onClick={handleChairInvitationsClick}
                      className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors shadow-sm"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Chair Invitations
                    </button>
                  )}
                  <button
                    id="btn-navbar-mobile-button-logout"
                    onClick={() => {
                      toggleMenu();
                      navigate({ to: "/agenda/me" });
                    }}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors shadow-sm"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    My Agenda
                  </button>
                  <button
                    id="btn-navbar-mobile-button-logout"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-destructive bg-background border border-border rounded-lg hover:bg-destructive/10 transition-colors shadow-sm"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </button>
                </div>
              ) : (
                <>
                  <Button
                    id="btn-navbar-mobile-button-signin"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => navigate({ to: "/login" })}
                  >
                    Sign In
                  </Button>
                  <Button
                    id="btn-navbar-mobile-button-register"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => navigate({ to: "/register" })}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
