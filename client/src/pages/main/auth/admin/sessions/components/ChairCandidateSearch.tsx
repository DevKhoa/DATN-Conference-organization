import { CheckCircle, ChevronDown, ChevronUp, Loader2, UserCheck, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  DebouncedMultiKeySearch,
  MultiKeySearchOption,
} from "@/components/DebouncedMultiKeySearch";
import {
  ChairCandidateSearchKey,
  useSearchChairCandidatesBySessionQuery,
} from "@/features/users/services/queries";
import type { ChairCandidate } from "@/features/users/services/queries/types";

type ChairCandidateSearchProps = {
  sessionTempId: string;
  selectedChairId?: number;
  selectedChairName?: string;
  onSelectChair: (candidate: ChairCandidate) => void;
  onClearChair: () => void;
};

const SEARCH_KEYS: MultiKeySearchOption[] = [
  { value: "full_name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "organization", label: "Org" },
];

export const ChairCandidateSearch = ({
  sessionTempId,
  selectedChairId,
  selectedChairName,
  onSelectChair,
  onClearChair,
}: ChairCandidateSearchProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchPayload, setSearchPayload] = useState<{
    searchKey: ChairCandidateSearchKey;
    searchValue: string;
  }>({
    searchKey: "full_name",
    searchValue: "",
  });
  const [expandedHintUserId, setExpandedHintUserId] = useState<number | null>(
    null,
  );

  const handleDebouncedChange = useCallback(
    ({
      searchKey,
      searchValue,
    }: {
      searchKey: string;
      searchValue: string;
    }) => {
      setSearchPayload((prev) => {
        const nextKey = searchKey as ChairCandidateSearchKey;
        if (prev.searchKey === nextKey && prev.searchValue === searchValue) {
          return prev;
        }

        return {
          searchKey: nextKey,
          searchValue,
        };
      });
    },
    [],
  );

  const { data: candidates = [], isLoading } =
    useSearchChairCandidatesBySessionQuery({
      searchKey: searchPayload.searchKey,
      searchTerm: searchPayload.searchValue,
      limit: 12,
      sessionId: Number(sessionTempId),
      enabled: isDropdownOpen,
    });

  const hasTypedValue = searchInputValue.trim().length > 0;

  const uniqueCandidates = useMemo(() => {
    const seen = new Set<number>();

    return candidates.filter((candidate) => {
      if (seen.has(candidate.user_id)) return false;
      seen.add(candidate.user_id);
      return true;
    });
  }, [candidates]);

  return (
    <div className="relative max-w-md">
      <label
        htmlFor={`input-search-chair-${sessionTempId}`}
        className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
      >
        Select Chair
      </label>

      <div className="relative group">
        <DebouncedMultiKeySearch
          id={`input-search-chair-${sessionTempId}`}
          value={searchInputValue}
          onValueChange={(newValue) => {
            setSearchInputValue(newValue);

            if (newValue === "") {
              onClearChair();
            }
          }}
          searchKeys={SEARCH_KEYS}
          defaultSearchKey="full_name"
          placeholder="Search chair..."
          debounceMs={500}
          inputClassName="pl-9 pr-3 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
          selectClassName="h-10"
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsDropdownOpen(false), 200);
          }}
          onDebouncedChange={handleDebouncedChange}
        />

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 text-sm text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </div>
            ) : uniqueCandidates.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">
                No chairs found
              </div>
            ) : (
              uniqueCandidates.map((candidate) => {
                const hasDescription =
                  !!candidate.description &&
                  candidate.description.trim().length > 0;
                const isHintExpanded =
                  expandedHintUserId === candidate.user_id;

                return (
                  <div
                    key={candidate.user_id}
                    id={`dropdown-chair-${sessionTempId}-${candidate.user_id}`}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <div
                      className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center group transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectChair(candidate);
                        setSearchInputValue("");
                        setIsDropdownOpen(false);
                        setExpandedHintUserId(null);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">
                          {candidate.full_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {candidate.organization || candidate.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasDescription && (
                          <button
                            className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedHintUserId((current) =>
                                current === candidate.user_id
                                  ? null
                                  : candidate.user_id,
                              );
                            }}
                          >
                            {isHintExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                            Hint
                          </button>
                        )}
                        {selectedChairId === candidate.user_id && (
                          <CheckCircle className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                    </div>

                    {isHintExpanded && hasDescription && (
                      <div className="px-3 pb-3">
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Bio / Description
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                            {candidate.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedChairId && !hasTypedValue && selectedChairName && (
        <div className="mt-3 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium animate-in fade-in transition-all">
          <UserCheck className="w-4 h-4" />
          {selectedChairName}
          <button
            id={`btn-clear-selected-chair-${sessionTempId}`}
            className="ml-1 text-indigo-400 hover:text-indigo-600"
            onClick={onClearChair}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
