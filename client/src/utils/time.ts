import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export const formatToLocal = (dateStr: string) => {
  const parsed = dayjs(
    dateStr,
    [
      "YYYY-MM-DDTHH:mm",
      "DD/MM/YYYY hh:mmA",
      "DD/MM/YYYY hh:mm A",
      "DD/MM/YYYY HH:mm",
    ],
    true,
  );
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : dateStr;
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
