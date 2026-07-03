import { useMutation } from "@tanstack/react-query";
import type { 
  ILoginPayload, 
  ISignupPayload, 
  IForgotPasswordPayload, 
  IResetPasswordPayload,
  IChangePasswordPayload
} from "./types";
import { supabase } from "@/lib/supabase";
import { request as axios } from "@/lib/axios";

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

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: async ({ email }: IForgotPasswordPayload) => {
      const response = await axios.post("/users/forgot-password", {
        email,
        origin: window.location.origin
      });

      return response.data;
    },
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: async ({ password, token_hash }: IResetPasswordPayload) => {
      // 1. Verify the token hash to log the user in
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery'
      });
      
      if (verifyError) {
        throw verifyError;
      }

      // 2. Now the session is active, update the password
      const response = await supabase.auth.updateUser({ password });

      return response;
    },
  });
};

export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: async ({ oldPassword, newPassword, email }: IChangePasswordPayload) => {
      let userEmail = email;

      if (!userEmail) {
        const { data: { session } } = await supabase.auth.getSession();
        userEmail = session?.user?.email;
      }

      if (!userEmail) {
        throw new Error("User not found or email not available");
      }

      // Verify old password
      const signInResponse = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: oldPassword,
      });

      if (signInResponse.error) {
        throw new Error("Incorrect old password");
      }

      // Update with new password
      const response = await supabase.auth.updateUser({ password: newPassword });

      return response;
    },
  });
};
