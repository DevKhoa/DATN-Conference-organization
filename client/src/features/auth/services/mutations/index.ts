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
      const emailLower = email.toLowerCase();

      // 1. Check if email already exists in profiles table
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", emailLower)
        .maybeSingle();

      if (existingUser) {
        return {
          data: { user: null, session: null },
          error: {
            message:
              "This email is already registered. Please log in or use a different email.",
            name: "AuthApiError",
            status: 400,
          },
        };
      }

      // 2. Proceed with signup
      const response = await supabase.auth.signUp({
        email: emailLower,
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
