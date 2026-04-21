import React from "react";
import { Filter, SortAsc, ChevronDown } from "lucide-react";

export type FilterStatus = "all" | "pending" | "approved" | "denied" | "done";
export type SortOption = "newest" | "oldest" | "most-upvoted";

interface QuestionFiltersProps {
  currentFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalCount: number;
  isModerator: boolean;
  isAuthor: boolean;
}

export const QuestionFilters: React.FC<QuestionFiltersProps> = ({
  currentFilter,
  onFilterChange,
  currentSort,
  onSortChange,
  totalCount,
  isModerator,
  isAuthor
}) => {
  const allFilterOptions: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Answered", value: "done" },
    { label: "Denied", value: "denied" },
  ];

  // If user is a Paper Author (and not a Moderator), hide Pending and Denied filters
  const filterOptions = (isAuthor && !isModerator)
    ? allFilterOptions.filter(opt => !["pending", "denied"].includes(opt.value))
    : allFilterOptions;

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: "Most Upvoted", value: "most-upvoted" },
    { label: "Newest", value: "newest" },
    { label: "Oldest", value: "oldest" },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 mb-2 border-b border-border/50">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">
          <Filter className="w-3.5 h-3.5 mr-1.5" />
          Filter:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${currentFilter === opt.value
                  ? "bg-primary border-primary text-primary-foreground shadow-sm scale-105"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:border-primary/30 hover:text-foreground"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto">
        <div className="flex items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <SortAsc className="w-3.5 h-3.5 mr-1.5" />
          Sort by:
        </div>
        <div className="relative group">
          <select
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="appearance-none bg-muted/30 border border-border rounded-lg pl-3 pr-9 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:border-primary/30"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
};
