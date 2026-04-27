const HIDDEN_NOTIFICATION_PHRASES = [
  "rls",
  "row-level security",
  "permission denied",
  "policy violation",
  "forbidden",
  "auth error",
];

export const shouldHideNotification = ({
  title,
  content,
  type,
}: {
  title?: string | null;
  content?: string | null;
  type?: string | null;
}) => {
  const haystack =
    `${title ?? ""} ${content ?? ""} ${type ?? ""}`.toLowerCase();
  return HIDDEN_NOTIFICATION_PHRASES.some((phrase) =>
    haystack.includes(phrase),
  );
};

export const decodeHtmlEntities = (value: string) => {
  if (!value) return "";

  if (typeof document === "undefined") {
    return value;
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};
