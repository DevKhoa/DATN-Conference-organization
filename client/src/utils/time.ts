import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export const formatToLocal = (dateStr: string) => {
  const parsed = dayjs(
    dateStr,
    [
      "YYYY-MM-DDTHH:mm",
      "YYYY-MM-DDTHH:mm:ss",
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DD HH:mm",
      "DD/MM/YYYY hh:mmA",
      "DD/MM/YYYY hh:mm A",
      "DD/MM/YYYY HH:mm",
      "DD/MM/YYYY h:mmA",
      "DD/MM/YYYY h:mm A",
      "DD/MM/YYYY H:mm",
    ],
    true
  );

  // Return with the 'T' for bulletproof cross-browser parsing later
  return parsed.isValid() ? parsed.format() : dateStr;
};

export const formatPaperTime = (timeStr: string, sessionLocalStart: string) => {
  if (!timeStr) return null;
  const timeParsed = dayjs(
    timeStr,
    ["HH:mm", "hh:mmA", "hh:mm A", "HH:mm:ss"],
    true,
  );
  if (timeParsed.isValid() && sessionLocalStart) {
    const baseDate = dayjs(sessionLocalStart).format("YYYY-MM-DD");
    return dayjs(`${baseDate} ${timeParsed.format("HH:mm:ss")}`).format(
      "YYYY-MM-DD HH:mm:ss",
    );
  }
  return timeStr;
};
