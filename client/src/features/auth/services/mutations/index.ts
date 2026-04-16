import { useMutation } from "@tanstack/react-query";
import type { ILoginPayload, ISignupPayload } from "./types";
import { supabase } from "@/lib/supabase";

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: async ({ email, password }: ILoginPayload) => {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return response;
    },
  });
};

export const useSignupMutation = () => {
  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      organization,
    }: ISignupPayload) => {
      const response = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
            organization: organization ?? "",
          },
          emailRedirectTo: `${window.location.origin}/register-confirm`,
        },
      });

      return response;
    },
  });
};

export const useLogoutMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await supabase.auth.signOut();

      return response;
    },
  });
};
