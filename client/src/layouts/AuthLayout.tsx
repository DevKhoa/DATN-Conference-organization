import { Helmet, HelmetProvider } from "react-helmet-async";

import { Meta } from "@/types";

interface AuthLayoutProps {
  children: React.ReactNode;
  meta: Meta;
}

export const AuthLayout = ({ children, meta }: AuthLayoutProps) => {
  return (
    <HelmetProvider>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{meta.title}</title>
      </Helmet>
      <div>
        <main>{children}</main>
      </div>
    </HelmetProvider>
  );
};
