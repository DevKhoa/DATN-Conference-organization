export const isSubscriptionUsable = (
  status: string | null | undefined,
  expiresAt: string | null | undefined,
) => {
  if (!expiresAt) return false;
  const notExpired = new Date(expiresAt).getTime() > Date.now();
  return notExpired && (status === "ACTIVE" || status === "CANCELED");
};
