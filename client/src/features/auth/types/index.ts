export enum Role {
  ADMIN = "ADMIN", // role_id = 1
  SECRETARIAT = "SECRETARIAT", // role_id = 2
  AUTHOR = "AUTHOR", // role_id = 3
  REVIEWER = "REVIEWER", // role_id = 4
  ATTENDEE = "ATTENDEE", // role_id = 5
  CHAIR = "CHAIR", // role_id = 6
}

export const ROLE_PRIORITY: Role[] = [
  Role.ADMIN,
  Role.SECRETARIAT,
  Role.AUTHOR,
  Role.REVIEWER,
  Role.ATTENDEE,
  Role.CHAIR,
];

export const getHighestRole = (roles: Role[] = []) => {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }

  return null;
};

export const formatRoleLabel = (role?: Role | string | null) => {
  if (!role) return "User";

  const normalized = role.toString().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export enum TokenType {
  ACCESS = "accessToken",
  REFRESH = "refreshToken",
}
