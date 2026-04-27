import { useEffect, useMemo, useState } from "react";

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

export type MultiKeySearchOption = {
  value: string;
  label: string;
};

type DebouncedMultiKeySearchProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  searchKeys: MultiKeySearchOption[];
  defaultSearchKey?: string;
  placeholder?: string;
  debounceMs?: number;
  onDebouncedChange?: (payload: {
    searchKey: string;
    searchValue: string;
  }) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
};

export const DebouncedMultiKeySearch = ({
  id,
  value,
  onValueChange,
  searchKeys,
  defaultSearchKey,
  placeholder = "Search...",
  debounceMs = 500,
  onDebouncedChange,
  onFocus,
  onBlur,
  className,
  selectClassName,
  inputClassName,
}: DebouncedMultiKeySearchProps) => {
  const normalizedKeys = useMemo(
    () => searchKeys.filter((key) => Boolean(key.value)),
    [searchKeys],
  );

  const hasMultipleSearchKeys = useMemo(
    () => normalizedKeys && normalizedKeys.length > 1,
    [normalizedKeys],
  );

  const fallbackKey = normalizedKeys[0]?.value || "";
  const [selectedSearchKey, setSelectedSearchKey] = useState(
    defaultSearchKey || fallbackKey,
  );
  const debouncedSearchValue = useDebounce(value, debounceMs);

  useEffect(() => {
    if (!defaultSearchKey && selectedSearchKey) return;
    if (!fallbackKey) return;

    setSelectedSearchKey(defaultSearchKey || fallbackKey);
  }, [defaultSearchKey, fallbackKey, selectedSearchKey]);

  useEffect(() => {
    if (!onDebouncedChange || !selectedSearchKey) return;

    onDebouncedChange({
      searchKey: selectedSearchKey,
      searchValue: debouncedSearchValue,
    });
  }, [debouncedSearchValue, onDebouncedChange, selectedSearchKey]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {hasMultipleSearchKeys && (
        <Select
          value={selectedSearchKey}
          onValueChange={(newKey) => setSelectedSearchKey(newKey)}
        >
          <SelectTrigger className={cn("h-10 w-30", selectClassName)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {normalizedKeys.map((key) => (
              <SelectItem key={key.value} value={key.value}>
                {key.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn("h-10", inputClassName)}
      />
    </div>
  );
};
