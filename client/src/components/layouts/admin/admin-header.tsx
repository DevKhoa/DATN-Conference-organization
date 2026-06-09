import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { AdminSearch } from "./admin-search";

export const AdminHeader = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 min-w-0 items-center gap-3 px-4">
        <div className="flex shrink-0 items-center gap-3">
          <SidebarTrigger variant="outline" className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
        </div>

        <div className="flex min-w-0 flex-1 justify-end items-center gap-3">
          <AdminSearch
            className="w-full max-w-52 sm:max-w-60"
            placeholder="Search..."
          />
        </div>
      </div>
    </header>
  );
};
