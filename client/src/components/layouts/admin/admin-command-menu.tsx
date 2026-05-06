import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import * as React from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

import { adminSidebarData } from "./admin-sidebar-data";

type AdminCommandMenuProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const AdminCommandMenu = ({ open, setOpen }: AdminCommandMenuProps) => {
  const navigate = useNavigate();

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    [setOpen],
  );

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <ScrollArea type="hover" className="h-72 pe-1">
          <CommandEmpty>No results found.</CommandEmpty>
          {adminSidebarData.navGroups.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((navItem, i) => {
                if (navItem.url && !navItem.children) {
                  return (
                    <CommandItem
                      key={`${navItem.url}-${i}`}
                      value={navItem.title}
                      onSelect={() => {
                        runCommand(() => navigate({ to: navItem.url }));
                      }}
                    >
                      <div className="flex size-4 items-center justify-center">
                        <ArrowRight className="text-muted-foreground/80 size-2" />
                      </div>
                      {navItem.title}
                    </CommandItem>
                  );
                }

                return navItem.children?.map((subItem, childIdx) => (
                  <CommandItem
                    key={`${navItem.title}-${subItem.url}-${childIdx}`}
                    value={`${navItem.title}-${subItem.url}`}
                    onSelect={() => {
                      runCommand(() => navigate({ to: subItem.url }));
                    }}
                  >
                    <div className="flex size-4 items-center justify-center">
                      <ArrowRight className="text-muted-foreground/80 size-2" />
                    </div>
                    {navItem.title} <ChevronRight /> {subItem.title}
                  </CommandItem>
                ));
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  );
};
