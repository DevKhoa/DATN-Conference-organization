export const normalizePath = (path: string) => {
  if (!path) return "/";
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
};

export const isLinkActive = (currentPath: string, href: string) => {
  const normalizedHref = normalizePath(href);

  if (normalizedHref === "/") {
    return currentPath === "/";
  }

  return (
    currentPath === normalizedHref ||
    currentPath.startsWith(`${normalizedHref}/`)
  );
};
