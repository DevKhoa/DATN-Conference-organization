import { skipToken, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AttendancesKeys } from "./keys";
import type { Attendance } from "../../types";

export const useAttendancesBySessionQuery = (sessionId: number | null) => {
  return useQuery({
    queryKey: [AttendancesKeys.AttendancesBySession, sessionId],
    queryFn: sessionId
      ? async () => {
          const { data, error } = await supabase
            .from("attendences")
            .select("*")
            .eq("session_id", sessionId);

          if (error) throw error;

          return (data || []) as Attendance[];
        }
      : skipToken,
    enabled: !!sessionId,
  });
};
