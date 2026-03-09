import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, GraduationCap, User, LogOut, Settings, Sparkles } from 'lucide-react';
import Button from './ui/Button';

interface NavbarProps {
  onNavigateRegister: () => void;
  onNavigateLogin: () => void;
  onNavigateProfile?: () => void;
  onNavigateConferences?: () => void;
  onNavigateHome?: () => void;
  onNavigatePapers?: () => void;
  onNavigateAiAssistant?: () => void; // New Prop
  onNavigateAttendences?: () => void;
  onNavigateProceedings: () => void;
  onLogout: () => void;
  isLoggedIn?: boolean;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userRoleId?: number;
  userAvatar?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  onNavigateRegister,
  onNavigateLogin,
  onNavigateProfile,
  onNavigateConferences,
  onNavigateHome,
  onNavigatePapers,
  onNavigateAiAssistant,
  onNavigateAttendences,
  onNavigateProceedings,
  onLogout,
  isLoggedIn = false,
  userName = '',
  userEmail = '',
  userRole = '',
  userRoleId = 0,
  userAvatar = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Define Navigation Items
  const baseLinks = [
    { name: 'Home', href: '#' },
    { name: 'Papers', href: '#papers' },
    { name: 'Conferences', href: '#conferences' },
    { name: 'AI Assistant', href: '#ai-assistant', icon: Sparkles }, // Added AI Assistant
    { name: 'News', href: '#news' }
  ];

  const adminLinks = [
    { name: 'Users Management', href: '#users-management' },
    { name: 'Attendances', href: '#attendances' },
    { name: 'Proceedings', href: '#proceedings' }
  ];

  // Determine which links to show based on role_id
  let navLinks = [...baseLinks];

  // If role_id is 1 (Admin) or 2 (Secretary), show extra links
  if (isLoggedIn && (userRoleId === 1 || userRoleId === 2)) {
    navLinks = [...baseLinks, ...adminLinks];
  }

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleProfileClick = () => {
    setIsProfileOpen(false);
    if (onNavigateProfile) {
      onNavigateProfile();
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, linkName: string) => {
    if (linkName === 'Conferences') {
      e.preventDefault();
      setIsOpen(false);
      if (onNavigateConferences) {
        onNavigateConferences();
      }
    } else if (linkName === 'Home') {
      e.preventDefault();
      setIsOpen(false);
      if (onNavigateHome) {
        onNavigateHome();
      }
    } else if (linkName === 'Papers') {
      e.preventDefault();
      setIsOpen(false);
      if (onNavigatePapers) {
        onNavigatePapers();
      }
    } else if (linkName === 'AI Assistant') {
      e.preventDefault();
      setIsOpen(false);
      if (onNavigateAiAssistant) {
        onNavigateAiAssistant();
      }
    } else if (linkName === 'Attendances') {
      e.preventDefault();
      setIsOpen(false);
      if (onNavigateAttendences) {
        onNavigateAttendences();
      }
    } else if (linkName === 'Proceedings') {
      e.preventDefault();
      setIsOpen(false);
      if (onNavigateProceedings) {
        onNavigateProceedings();
      }
    }

  };

  const handleLogoClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.location.reload();
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={handleLogoClick}>
            <div className="bg-brand-700 p-1.5 rounded-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Conf-Org</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.name)}
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${link.name === 'AI Assistant' ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-600 hover:text-brand-700'
                  }`}
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.name}
              </a>
            ))}
          </div>

          {/* CTA Buttons or User Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleProfile}
                  className="flex items-center gap-3 pl-4 border-l border-slate-200 focus:outline-none group"
                >
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-medium text-slate-900 leading-none group-hover:text-brand-700 transition-colors">{userName}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{userRole || 'User'}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold shadow-sm group-hover:bg-brand-200 transition-colors overflow-hidden">
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(userName)
                    )}
                  </div>
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                    <div className="px-4 py-3 border-b border-slate-100 mb-1">
                      <p className="text-sm font-medium text-slate-900">{userName}</p>
                      <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                    </div>
                    <button
                      onClick={handleProfileClick}
                      className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-700 transition-colors"
                    >
                      <User className="w-4 h-4 mr-3" />
                      Your Profile
                    </button>
                    <a href="#settings" className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-700 transition-colors">
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </a>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={onNavigateLogin}>Sign In</Button>
                <Button variant="primary" size="sm" onClick={onNavigateRegister}>Get Started</Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-brand-700 hover:bg-slate-100 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 shadow-xl">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.name)}
                className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-slate-50 flex items-center gap-2 ${link.name === 'AI Assistant' ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-700 hover:text-brand-700'
                  }`}
              >
                {link.icon && <link.icon className="w-5 h-5" />}
                {link.name}
              </a>
            ))}
          </div>
          <div className="pt-4 pb-4 border-t border-slate-200">
            <div className="px-5 space-y-3">
              {isLoggedIn ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold overflow-hidden border border-brand-200">
                      {userAvatar ? (
                        <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(userName)
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-900">{userName}</p>
                      <p className="text-xs text-slate-500 capitalize truncate">{userRole || 'User'} • {userEmail}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      toggleMenu();
                      if (onNavigateProfile) onNavigateProfile();
                    }}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </button>
                </div>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onNavigateLogin}>Sign In</Button>
                  <Button variant="primary" size="sm" className="w-full justify-center" onClick={onNavigateRegister}>Get Started</Button>
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