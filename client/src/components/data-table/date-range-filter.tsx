import { startOfDay } from "date-fns";

import {
  DateRangePicker,
  type DateRange,
} from "@/components/ui/date-time-range-picker";

interface DateRangeFilterProps {
  fromDate?: Date;
  toDate?: Date;
  onFromDateChange: (date?: Date) => void;
  onToDateChange: (date?: Date) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}) => {
  const handleUpdate = (values: { range: DateRange }) => {
    const { from, to } = values.range;
    onFromDateChange(from ? startOfDay(from) : undefined);
    onToDateChange(to);
  };

  const initialFrom = fromDate || new Date();
  const initialTo = toDate || undefined;

  return (
    <DateRangePicker
      initialDateFrom={initialFrom}
      initialDateTo={initialTo}
      onUpdate={handleUpdate}
      align="center"
      className="h-8 text-xs"
      disableFuture
    />
  );
};
