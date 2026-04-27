import { Helmet, HelmetProvider } from "react-helmet-async";

import { Meta } from "@/types";
import Navbar from "@/components/Navbar";

interface DefaultLayoutProps {
  children: React.ReactNode;
  meta: Meta;
}

export const DefaultLayout = ({ children, meta }: DefaultLayoutProps) => {
  return (
    <HelmetProvider>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{meta.title}</title>
      </Helmet>
      <div>
        <Navbar />
        <main>{children}</main>
      </div>
    </HelmetProvider>
  );
};
