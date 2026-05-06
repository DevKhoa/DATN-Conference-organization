import { ChevronDown, ChevronUp, Mail } from "lucide-react";
import { useState } from "react";

import type { ConferenceDetailChair } from "@/features/conferences/services/queries";

type ChairSectionProps = {
  chair: ConferenceDetailChair;
};

export const ChairSection = ({ chair }: ChairSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongDescription =
    !!chair.description && chair.description.length > 150;

  return (
    <div className="mb-8 flex flex-col gap-5 rounded-2xl border border-border bg-muted/40 p-5 transition-all hover:border-primary/30 hover:shadow-sm sm:flex-row">
      <div className="shrink-0">
        <div className="h-16 w-16 rounded-full border border-border bg-card p-1 shadow-sm">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-muted">
            {chair.avatar_url ? (
              <img
                src={chair.avatar_url}
                alt={chair.full_name || "Chair"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xl font-bold text-primary">
                {(chair.full_name || "U").charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grow">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            Session Chair
          </span>
        </div>

        <h4 className="text-lg font-bold text-foreground">{chair.full_name}</h4>

        {chair.email && (
          <div className="mt-1 flex w-fit items-center text-sm text-muted-foreground transition-colors hover:text-primary">
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            <a href={`mailto:${chair.email}`}>{chair.email}</a>
          </div>
        )}

        {chair.description && (
          <div className="relative mt-3 text-sm leading-relaxed text-foreground">
            <p
              className={!isExpanded && isLongDescription ? "line-clamp-2" : ""}
            >
              {chair.description}
            </p>
            {isLongDescription && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="mt-1 flex items-center text-xs font-medium text-primary hover:underline focus:outline-none"
              >
                {isExpanded ? "Show Less" : "Read Full Bio"}
                {isExpanded ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
