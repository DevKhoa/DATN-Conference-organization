import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import React from "react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { NavGroup as NavGroupType } from "./admin-sidebar-data";

export const NavGroup = ({ title, items }: NavGroupType) => {
  const location = useLocation();

  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  const isSubRouteActive = (item: (typeof items)[number]) => {
    if (!item.children) return false;
    return item.children.some((sub) => location.pathname === sub.url);
  };

  const handleToggle = (key: string, item: (typeof items)[number]) => {
    if (isSubRouteActive(item)) return;
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.url;
          const hasChildren =
            Array.isArray(item.children) && item.children.length > 0;

          const isOpen = openDropdown === item.title || isSubRouteActive(item);

          return (
            <SidebarMenuItem key={item.title}>
              {hasChildren ? (
                <>
                  <SidebarMenuButton
                    type="button"
                    isActive={isActive}
                    onClick={() => handleToggle(item.title, item)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    <span
                      className={cn(
                        "ml-auto transition-transform",
                        isOpen ? "rotate-90" : "",
                      )}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </SidebarMenuButton>
                  {isOpen && (
                    <SidebarMenuSub>
                      {(item.children ?? []).map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = location.pathname === sub.url;
                        return (
                          <li key={sub.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                            >
                              <Link
                                to={sub.url}
                                className={cn("cursor-pointer")}
                              >
                                <SubIcon className="h-4 w-4" />
                                <span>{sub.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </li>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </>
              ) : (
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={item.url} className={cn("cursor-pointer")}>
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};
