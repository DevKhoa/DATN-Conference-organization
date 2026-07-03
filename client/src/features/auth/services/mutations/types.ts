// Login
export interface ILoginPayload {
  email: string;
  password: string;
}

// Signup
export interface ISignupPayload {
  email: string;
  password: string;
  fullName: string;
  organization?: string;
}

// Forgot Password
export interface IForgotPasswordPayload {
  email: string;
}

// Reset Password (after clicking link)
export interface IResetPasswordPayload {
  password: string;
  token_hash: string;
}

// Change Password (logged in)
export interface IChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  email?: string;
}
