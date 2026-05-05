import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { TicketsKeys } from "../queries/keys";
import { ConferencesKeys } from "@/features/conferences/services/queries/keys";
import type {
  ICreateTicketPayload,
  IUpdateTicketPayload,
  IDeleteTicketPayload,
} from "./types";

export const useCreateTicketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ICreateTicketPayload) => {
      const { session_ids, ...ticketData } = payload;

      // Create the ticket
      const { data, error } = await supabase
        .from("ticket_configs")
        .insert(ticketData)
        .select("ticket_id")
        .single();

      if (error) throw error;

      const ticketId = data.ticket_id;

      // Link sessions to the ticket
      if (session_ids.length > 0) {
        const { error: tsError } = await supabase.from("ticket_session").insert(
          session_ids.map((sid) => ({
            ticket_id: ticketId,
            session_id: sid,
          })),
        );
        if (tsError) throw tsError;
      }

      return { ticket_id: ticketId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TicketsKeys.TicketsByConference],
      });
      queryClient.invalidateQueries({
        queryKey: [ConferencesKeys.ConferenceTickets],
      });
    },
  });
};

export const useUpdateTicketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: IUpdateTicketPayload) => {
      const { ticket_id, session_ids, ...ticketData } = payload;

      // Update the ticket
      const { error } = await supabase
        .from("ticket_configs")
        .update(ticketData)
        .eq("ticket_id", ticket_id);

      if (error) throw error;

      // Sync ticket_session: delete old, insert new
      await supabase.from("ticket_session").delete().eq("ticket_id", ticket_id);

      if (session_ids.length > 0) {
        const { error: tsError } = await supabase.from("ticket_session").insert(
          session_ids.map((sid) => ({
            ticket_id: ticket_id,
            session_id: sid,
          })),
        );
        if (tsError) throw tsError;
      }

      return { ticket_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TicketsKeys.TicketsByConference],
      });
      queryClient.invalidateQueries({
        queryKey: [ConferencesKeys.ConferenceTickets],
      });
    },
  });
};

export const useDeleteTicketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticket_id }: IDeleteTicketPayload) => {
      // Delete ticket_session links first
      await supabase.from("ticket_session").delete().eq("ticket_id", ticket_id);

      // Delete the ticket
      const { error } = await supabase
        .from("ticket_configs")
        .delete()
        .eq("ticket_id", ticket_id);

      if (error) throw error;

      return { ticket_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TicketsKeys.TicketsByConference],
      });
      queryClient.invalidateQueries({
        queryKey: [ConferencesKeys.ConferenceTickets],
      });
    },
  });
};
