import React, { useId } from "react";
import { Clock } from "lucide-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export const SimpleDateTimePicker = ({
  value,
  onChange,
  placeholder,
  className,
  id,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
  id?: string;
}) => {
  const fallbackId = useId();
  const inputId = id ?? `date-${fallbackId}`;

  let isoValue = "";
  if (value) {
    const parsed = dayjs(
      value,
      [
        "DD/MM/YYYY hh:mmA",
        "DD/MM/YYYY hh:mm A",
        "DD/MM/YYYY HH:mm",
        "YYYY-MM-DDTHH:mm",
      ],
      true,
    );
    if (parsed.isValid()) {
      isoValue = parsed.format("YYYY-MM-DDTHH:mm");
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (!rawVal) {
      onChange("");
      return;
    }
    const d = dayjs(rawVal);
    if (d.isValid()) {
      onChange(d.format("DD/MM/YYYY hh:mm A"));
    } else {
      onChange(rawVal);
    }
  };

  return (
    <div className="relative group w-full">
      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
      <input
        id={inputId}
        type="datetime-local"
        className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-background border border-input text-foreground rounded-xl focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all ${className || ""}`}
        value={isoValue}
        onChange={handleChange}
        title={placeholder}
      />
    </div>
  );
};

export const SimpleTimePicker = ({
  value,
  onChange,
  placeholder,
  className,
  id,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
  id?: string;
}) => {
  const fallbackId = useId();
  const inputId = id ?? `time-${fallbackId}`;

  let timeValue = "";
  if (value) {
    const parsed = dayjs(
      value,
      ["hh:mmA", "hh:mm A", "HH:mm", "HH:mm:ss"],
      true,
    );
    if (parsed.isValid()) {
      timeValue = parsed.format("HH:mm");
    } else {
      const parsedWithDate = dayjs(
        value,
        [
          "DD/MM/YYYY hh:mmA",
          "DD/MM/YYYY hh:mm A",
          "DD/MM/YYYY HH:mm",
          "YYYY-MM-DDTHH:mm",
        ],
        true,
      );
      if (parsedWithDate.isValid()) {
        timeValue = parsedWithDate.format("HH:mm");
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (!rawVal) {
      onChange("");
      return;
    }
    onChange(rawVal);
  };

  return (
    <input
      id={inputId}
      type="time"
      placeholder={placeholder}
      className={`px-2 py-1 text-xs border border-input bg-background text-foreground rounded-md focus:ring-1 focus:ring-ring outline-none ${className || ""}`}
      value={timeValue}
      onChange={handleChange}
    />
  );
};