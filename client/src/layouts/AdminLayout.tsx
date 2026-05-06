import { Helmet, HelmetProvider } from "react-helmet-async";

import { AdminHeader } from "@/components/layouts/admin/admin-header";
import { AdminSidebar } from "@/components/layouts/admin/admin-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { LayoutProvider } from "@/contexts/layout-provider";

import type { Meta } from "@/types";
import { cn } from "@/lib/utils";
import { getCookie } from "@/lib/cookies";

interface AdminLayoutProps {
  children?: React.ReactNode;
  meta: Meta;
}

export const AdminLayout = ({ children, meta }: AdminLayoutProps) => {
  const defaultOpen = getCookie("sidebar_state") !== "false";

  return (
    <HelmetProvider>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{meta.title}</title>
      </Helmet>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AdminSidebar />
          <SidebarInset
            className={cn(
              // Set content container, so we can use container queries
              "@container/content",

              // If layout is fixed, set the height
              // to 100svh to prevent overflow
              "has-data-[layout=fixed]:h-svh",

              // If layout is fixed and sidebar is inset,
              // set the height to 100svh - spacing (total margins) to prevent overflow
              "peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]",
            )}
          >
            <AdminHeader />
            {/* Main Content */}
            <main className="overflow-y-auto">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </HelmetProvider>
  );
};
