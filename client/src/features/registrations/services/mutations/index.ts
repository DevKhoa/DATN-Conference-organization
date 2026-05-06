import { useMutation } from "@tanstack/react-query";
import { request } from "@/lib/axios";
import type {
  ICreateRegistrationPayload,
  ICreateRegistrationResponse,
} from "./types";
import useAuth from "@/features/auth/hooks/useAuth";

export const useCreateRegistrationMutation = () => {
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      returnUrl,
    }: ICreateRegistrationPayload): Promise<ICreateRegistrationResponse> => {
      if (!session?.user.user_metadata["user_id"]) {
        throw new Error("User not authenticated");
      }

      const data = await request.post<ICreateRegistrationResponse>(
        "/registrations",
        {
          user_id: session.user.user_metadata["user_id"],
          ticket_id: ticketId,
          provider: "PAYOS",
          returnUrl,
        },
      );

      if (!data.checkout_url) {
        throw new Error("Failed to create registration.");
      }

      return data;
    },
  });
};
