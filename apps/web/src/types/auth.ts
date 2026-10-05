export interface User {
  id: string;
  name: string;
  email: string;
  provider: string;
}

export interface RequestLoginOTPPayload {
  email: string;
}

export interface VerifyLoginOTPPayload {
  email: string;
  code: string;
}

export interface RequestLoginOTPResult {
  email: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
}
