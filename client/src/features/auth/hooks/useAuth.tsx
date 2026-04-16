import { useContext, useDebugValue } from "react";
import { AuthContext } from "../contexts/auth.context";

const useAuth = () => {
  const context = useContext(AuthContext);
  useDebugValue(context, (auth) =>
    auth?.session ? `authenticated ${auth.roles}` : "unauthenticated",
  );
  return context;
};

export default useAuth;
