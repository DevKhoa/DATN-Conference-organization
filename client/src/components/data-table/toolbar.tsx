import { Cross2Icon } from "@radix-ui/react-icons";
import { type Table } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks";
import { cn } from "@/lib/utils";

import { DataTableFacetedFilter } from "./faceted-filter";
import { DataTableViewOptions } from "./view-options";

export type FilterOption = {
  columnId: string;
  title: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
};

export type SearchKeyOption = {
  value: string;
  label: string;
};

type DataTableToolbarProps<TData> = {
  table: Table<TData>;
  searchPlaceholder?: string;
  searchKey?: string;
  searchKeys?: SearchKeyOption[];
  filters?: FilterOption[];
};

export const DataTableToolbar = <TData,>({
  table,
  searchPlaceholder = "Filter...",
  searchKey,
  searchKeys,
  filters = [],
}: DataTableToolbarProps<TData>) => {
  const isFiltered =
    table.getState().columnFilters.length > 0 || table.getState().globalFilter;

  // Determine the active search configuration
  const hasMultipleSearchKeys = useMemo(
    () => searchKeys && searchKeys.length > 0,
    [],
  );

  const effectiveSearchKey = useMemo(
    () => (hasMultipleSearchKeys ? searchKeys![0].value : searchKey),
    [hasMultipleSearchKeys, searchKey],
  );

  // Local state for search input and selected search key
  const [searchValue, setSearchValue] = useState<string>("");
  const [selectedSearchKey, setSelectedSearchKey] = useState<string>(
    effectiveSearchKey || "",
  );

  // Debounce the search value
  const debouncedSearchValue = useDebounce(searchValue, 500);

  // Sync initial value from table state
  useEffect(() => {
    if (effectiveSearchKey) {
      const currentValue =
        (table.getColumn(effectiveSearchKey)?.getFilterValue() as string) ?? "";
      setSearchValue(currentValue);
    } else {
      const currentValue = table.getState().globalFilter ?? "";
      setSearchValue(currentValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear previous column filter when changing search key
  useEffect(() => {
    if (hasMultipleSearchKeys) {
      // Clear all search key column filters except the selected one
      searchKeys?.forEach((key) => {
        if (key.value !== selectedSearchKey) {
          table.getColumn(key.value)?.setFilterValue(undefined);
        }
      });
    }
  }, [selectedSearchKey, hasMultipleSearchKeys, table]);

  // Update table filter when debounced value changes
  useEffect(() => {
    if (hasMultipleSearchKeys && selectedSearchKey) {
      table.getColumn(selectedSearchKey)?.setFilterValue(debouncedSearchValue);
    } else if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(debouncedSearchValue);
    } else {
      table.setGlobalFilter(debouncedSearchValue);
    }
  }, [
    debouncedSearchValue,
    searchKey,
    selectedSearchKey,
    hasMultipleSearchKeys,
    table,
  ]);

  return (
    <div className="flex items-center justify-between">
      <div
        className={cn(
          "flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2",
        )}
      >
        <div className="flex items-center gap-x-2">
          {hasMultipleSearchKeys && (
            <Select
              value={selectedSearchKey}
              onValueChange={(value) => {
                setSelectedSearchKey(value);
                setSearchValue("");
              }}
            >
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {searchKeys?.map((key) => (
                  <SelectItem key={key.value} value={key.value}>
                    {key.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(searchKey || searchKeys) && (
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
            />
          )}
        </div>
        <div className="flex gap-x-2">
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId);
            if (!column) return null;
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            );
          })}
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              table.setGlobalFilter("");
              setSearchValue("");
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ms-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
};
