import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const AdminAppTitle = () => {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="gap-0 py-0 hover:bg-transparent active:bg-transparent"
          asChild
        >
          <div>
            <Link
              to="/admin"
              onClick={() => setOpenMobile(false)}
              className="flex-1 text-start text-sm leading-tight"
            >
              <div className="min-w-0">
                <span className="truncate font-bold block">Admin</span>
                <span className="truncate text-xs text-muted-foreground block">
                  Management
                </span>
              </div>
            </Link>
            <ToggleSidebar className="md:hidden" />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const ToggleSidebar = ({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("aspect-square size-8 max-md:scale-125", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <X className="md:hidden" />
      <Menu className="max-md:hidden" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};
