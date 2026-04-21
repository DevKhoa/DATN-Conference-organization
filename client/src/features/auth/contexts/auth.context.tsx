import { createContext, useEffect, useState } from "react";

import type { PropsWithChildren } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Role } from "@/features/auth/types";

export type AuthState = {
  isLoading: boolean;
  session: Session | null;
  roles: Role[];
  checkRoles: (requiredRoles: Role[]) => boolean;
};

const AuthContext = createContext<AuthState>({
  isLoading: true,
  session: null,
  roles: [],
  checkRoles: () => false,
});

const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const checkRoles = (requiredRoles: Role[]) => {
    if (!requiredRoles.length) return true;
    const userRolesUpper = roles.map(r => r.toUpperCase());
    return requiredRoles.some((role) => userRolesUpper.includes(role.toUpperCase()));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setRoles(session?.user.user_metadata.roles || []);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setRoles(session?.user.user_metadata.roles || []);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  return (
    <AuthContext.Provider value={{ session, roles, isLoading, checkRoles }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
