import { createContext, useContext, useState } from "react";

import type { PropsWithChildren } from "react";

type Collapsible = "icon" | "offcanvas" | "none";
type Variant = "sidebar" | "floating" | "inset";

interface LayoutContextType {
  collapsible: Collapsible;
  setCollapsible: (collapsible: Collapsible) => void;
  variant: Variant;
  setVariant: (variant: Variant) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return context;
};

interface LayoutProviderProps extends PropsWithChildren {
  defaultCollapsible?: Collapsible;
  defaultVariant?: Variant;
}

export const LayoutProvider = ({
  children,
  defaultCollapsible = "icon",
  defaultVariant = "sidebar",
}: LayoutProviderProps) => {
  const [collapsible, setCollapsible] =
    useState<Collapsible>(defaultCollapsible);
  const [variant, setVariant] = useState<Variant>(defaultVariant);

  return (
    <LayoutContext.Provider
      value={{ collapsible, setCollapsible, variant, setVariant }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
