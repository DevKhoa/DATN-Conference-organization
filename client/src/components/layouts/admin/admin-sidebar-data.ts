import { LayoutDashboard, AwardIcon, BookDashed } from "lucide-react";

import type { LucideIcon } from "lucide-react";

export interface NavLink {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  children?: NavLink[];
}

export interface NavGroup {
  title: string;
  items: NavLink[];
}

export interface AdminSidebarData {
  navGroups: NavGroup[];
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

export const adminSidebarData: AdminSidebarData = {
  navGroups: [
    {
      title: "General",
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: LayoutDashboard,
          isActive: true,
        },
      ],
    },
    {
      title: "Awards",
      items: [
        {
          title: "Award Templates",
          url: "/admin/awards/templates",
          icon: BookDashed,
        },
        {
          title: "Conference Awards",
          url: "/admin/awards",
          icon: AwardIcon,
        },
      ],
    },
  ],
  user: {
    name: "Admin User",
    email: "admin@example.com",
    avatar: "A",
  },
};
