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
