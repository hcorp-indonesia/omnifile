export interface User {
  id: string;
  name: string;
  email: string;
  provider: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface GoogleAuthPayload {
  email: string;
  name: string;
  remember_me: boolean;
}
