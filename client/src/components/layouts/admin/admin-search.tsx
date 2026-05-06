import { Search } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AdminCommandMenu } from "./admin-command-menu";

type AdminSearchProps = {
  className?: string;
  placeholder?: string;
};

export const AdminSearch = React.forwardRef<
  HTMLButtonElement,
  AdminSearchProps
>(({ className = "", placeholder = "Search..." }, ref) => {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        ref={ref}
        variant="outline"
        className={cn(
          "bg-muted/25 group text-muted-foreground hover:bg-accent relative h-9 w-full flex-1 justify-start rounded-md text-sm font-normal shadow-none sm:w-40 sm:pe-12 md:flex-none lg:w-52",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Search
          aria-hidden="true"
          className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4"
        />
        <span className="ms-6 hidden text-xs sm:inline-flex">
          {placeholder}
        </span>
        <kbd className="bg-muted group-hover:bg-accent pointer-events-none absolute end-[0.3rem] top-1/2 -translate-y-1/2 hidden h-6 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <AdminCommandMenu open={open} setOpen={setOpen} />
    </>
  );
});

AdminSearch.displayName = "AdminSearch";
