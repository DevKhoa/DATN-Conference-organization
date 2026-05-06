import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DebouncedMultiKeySearch,
  type MultiKeySearchOption,
} from "@/components/DebouncedMultiKeySearch";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useAwardTemplatesQuery,
  useConferenceAwardsQuery,
} from "@/features/awards/services/queries";
import {
  useConferencesCountQuery,
  usePaginatedConferencesQuery,
  type ConferencesFilterParams,
} from "@/features/conferences/services/queries";
import {
  useCreateConferenceAwardMutation,
  useDeleteConferenceAwardMutation,
  useUpdateConferenceAwardMutation,
} from "@/features/awards/services/mutations";
import type { AwardWithSessions } from "@/features/awards/types";
import { useSessionsByConferenceQuery } from "@/features/sessions/services/queries";
import type { Conference } from "@/features/conferences/types";
import { ConferenceAwardsTable } from "./components/conference-awards-table";
import { ConferenceAwardDialog } from "./components/conference-award-dialog";
import { DeleteConferenceAwardDialog } from "./components/delete-conference-award-dialog";

const CONFERENCE_SEARCH_KEYS: MultiKeySearchOption[] = [
  { value: "conf_name", label: "Name" },
  { value: "location", label: "Location" },
  { value: "start_date", label: "Start Date" },
];
const CONFERENCE_SEARCH_PAGE_SIZE = 20;

const AdminManageAwardsPage = () => {
  const [selectedConferenceId, setSelectedConferenceId] = useState<
    number | null
  >(null);
  const [isConferenceDropdownOpen, setIsConferenceDropdownOpen] =
    useState(false);
  const [conferenceSearchValue, setConferenceSearchValue] = useState("");
  const [conferenceSearchPayload, setConferenceSearchPayload] = useState<{
    searchKey: string;
    searchValue: string;
  }>({
    searchKey: "conf_name",
    searchValue: "",
  });
  const conferenceFilters: ConferencesFilterParams = useMemo(
    () => ({
      searchTerm:
        conferenceSearchPayload.searchKey === "conf_name"
          ? conferenceSearchPayload.searchValue || undefined
          : undefined,
      statusFilter: "ALL",
    }),
    [conferenceSearchPayload],
  );
  const { data: conferencesTotalCount = 0 } =
    useConferencesCountQuery(conferenceFilters);
  const { data: paginatedConferenceData } = usePaginatedConferencesQuery({
    page: 1,
    pageSize: CONFERENCE_SEARCH_PAGE_SIZE,
    totalCount: conferencesTotalCount,
    filters: conferenceFilters,
  });
  const conferences: Conference[] = useMemo(
    () =>
      (paginatedConferenceData?.data || []).map((conference) => ({
        conf_id: conference.conf_id,
        conf_name: conference.conf_name,
        start_date: conference.start_date || "",
        location: conference.location || "",
        format_type: conference.format_type,
      })),
    [paginatedConferenceData?.data],
  );

  const { data: templates = [] } = useAwardTemplatesQuery();
  const {
    data: conferenceAwards = [],
    isLoading: isLoadingConferenceAwards,
    isError: isConferenceAwardsError,
    error: conferenceAwardsError,
  } = useConferenceAwardsQuery(selectedConferenceId);
  const { data: sessions = [] } =
    useSessionsByConferenceQuery(selectedConferenceId);

  const createConferenceAwardMutation = useCreateConferenceAwardMutation();
  const updateConferenceAwardMutation = useUpdateConferenceAwardMutation();
  const deleteConferenceAwardMutation = useDeleteConferenceAwardMutation();

  const [conferenceDialogOpen, setConferenceDialogOpen] = useState(false);
  const [deleteConferenceDialogOpen, setDeleteConferenceDialogOpen] =
    useState(false);
  const [selectedAward, setSelectedAward] = useState<AwardWithSessions | null>(
    null,
  );

  const isConferenceSubmitting =
    createConferenceAwardMutation.isPending ||
    updateConferenceAwardMutation.isPending;

  const sortedConferenceAwards = useMemo(
    () =>
      [...conferenceAwards].sort(
        (a, b) =>
          new Date(b.open_time || b.created_at || 0).getTime() -
          new Date(a.open_time || a.created_at || 0).getTime(),
      ),
    [conferenceAwards],
  );
  const selectedConference = useMemo(
    () =>
      conferences.find(
        (conference) => conference.conf_id === selectedConferenceId,
      ) || null,
    [conferences, selectedConferenceId],
  );
  const filteredConferences = useMemo(() => {
    const { searchKey, searchValue } = conferenceSearchPayload;
    const keyword = searchValue.trim().toLowerCase();

    if (!keyword) return conferences;

    return conferences.filter((conference) => {
      const rawValue = conference[searchKey as keyof typeof conference] as
        | string
        | number
        | null
        | undefined;
      const text = rawValue == null ? "" : String(rawValue).toLowerCase();
      return text.includes(keyword);
    });
  }, [conferenceSearchPayload, conferences]);

  useEffect(() => {
    if (!selectedConferenceId && conferences.length > 0) {
      setSelectedConferenceId(conferences[0].conf_id);
    }
  }, [conferences, selectedConferenceId]);

  const handleCreateConferenceAward = () => {
    setSelectedAward(null);
    setConferenceDialogOpen(true);
  };

  const handleEditConferenceAward = (award: AwardWithSessions) => {
    setSelectedAward(award);
    setConferenceDialogOpen(true);
  };

  const handleDeleteConferenceAward = (award: AwardWithSessions) => {
    setSelectedAward(award);
    setDeleteConferenceDialogOpen(true);
  };

  const handleDeleteConferenceAwardConfirm = async (awardId: number) => {
    try {
      await deleteConferenceAwardMutation.mutateAsync({ awardId });
      toast.success("Conference award deleted.");
    } catch (deleteError: any) {
      toast.error(deleteError?.message || "Failed to delete conference award.");
    }
  };

  return (
    <AdminLayout
      meta={{
        title: "Awards Management",
      }}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Conference Awards</h2>
            <p className="text-sm text-muted-foreground">
              Define active awards for each conference and assign target
              sessions.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <DebouncedMultiKeySearch
                id="input-search-conference-awards"
                value={conferenceSearchValue}
                onValueChange={setConferenceSearchValue}
                searchKeys={CONFERENCE_SEARCH_KEYS}
                defaultSearchKey="conf_name"
                placeholder={
                  selectedConference?.conf_name || "Search conference..."
                }
                debounceMs={500}
                onDebouncedChange={({ searchKey, searchValue }) => {
                  setConferenceSearchPayload((prev) => {
                    if (
                      prev.searchKey === searchKey &&
                      prev.searchValue === searchValue
                    ) {
                      return prev;
                    }

                    return { searchKey, searchValue };
                  });
                }}
                onFocus={() => setIsConferenceDropdownOpen(true)}
                onBlur={() =>
                  setTimeout(() => setIsConferenceDropdownOpen(false), 120)
                }
                className="w-full"
              />

              {isConferenceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-background shadow-xl z-50">
                  {filteredConferences.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No conferences found.
                    </div>
                  ) : (
                    filteredConferences.map((conference) => (
                      <button
                        key={conference.conf_id}
                        type="button"
                        className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-muted/40"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setSelectedConferenceId(conference.conf_id);
                          setConferenceSearchValue("");
                          setIsConferenceDropdownOpen(false);
                        }}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {conference.conf_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {conference.location || "N/A"} •{" "}
                            {conference.start_date || "No start date"}
                          </p>
                        </div>
                        {selectedConferenceId === conference.conf_id && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleCreateConferenceAward}
              disabled={!selectedConferenceId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Define Award
            </Button>
          </div>
        </div>

        {isLoadingConferenceAwards ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading conference awards...
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isConferenceAwardsError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load conference awards:{" "}
            {conferenceAwardsError instanceof Error
              ? conferenceAwardsError.message
              : "Unknown error"}
          </div>
        ) : (
          <ConferenceAwardsTable
            awards={sortedConferenceAwards}
            onEdit={handleEditConferenceAward}
            onDelete={handleDeleteConferenceAward}
          />
        )}
      </div>

      <ConferenceAwardDialog
        open={conferenceDialogOpen}
        onOpenChange={setConferenceDialogOpen}
        award={selectedAward}
        conferences={conferences}
        sessions={sessions}
        templates={templates}
        selectedConferenceId={selectedConferenceId}
        isSubmitting={isConferenceSubmitting}
        onConferenceChange={(conferenceId) =>
          setSelectedConferenceId(conferenceId)
        }
        onCreate={createConferenceAwardMutation.mutateAsync}
        onUpdate={updateConferenceAwardMutation.mutateAsync}
      />

      <DeleteConferenceAwardDialog
        open={deleteConferenceDialogOpen}
        onOpenChange={setDeleteConferenceDialogOpen}
        award={selectedAward}
        onConfirm={handleDeleteConferenceAwardConfirm}
        isLoading={deleteConferenceAwardMutation.isPending}
      />
    </AdminLayout>
  );
};

export default AdminManageAwardsPage;
