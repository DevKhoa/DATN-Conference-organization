import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useLayout } from "@/contexts/layout-provider";
import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

import { AdminAppTitle } from "./admin-app-title";
import { adminSidebarData } from "./admin-sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import { useMyProfileQuery } from "@/features/users/services/queries";

export const AdminSidebar = () => {
  const { collapsible, variant } = useLayout();
  const { data: profile } = useMyProfileQuery();

  const userData = profile
    ? {
        name: profile.full_name || profile.email || "User",
        email: profile.email || "user@example.com",
        avatar: (profile.avatar_url || "U").charAt(0).toUpperCase(),
      }
    : adminSidebarData.user;

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AdminAppTitle />
      </SidebarHeader>
      <SidebarContent>
        {adminSidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Back to Website"
              className="mb-1 font-semibold text-primary hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Link to="/" className="flex items-center gap-3">
                <Home className="h-5 w-5" />
                <span>Back to Website</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

