// src/auth/hooks/usePasswordStrength.js

export const usePasswordStrength = (password) => {
  let score = 0;

  if (!password) return { score: 0, label: "Very Weak" };

  // Scoring rules
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

  return {
    score,
    label: labels[score - 1] || "Very Weak"
  };
};
