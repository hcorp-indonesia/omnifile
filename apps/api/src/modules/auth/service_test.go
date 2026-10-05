package auth

import (
	"testing"
	"unicode"
)

func TestGenerateLoginOTP(t *testing.T) {
	for range 100 {
		code, err := generateLoginOTP()
		if err != nil {
			t.Fatalf("generateLoginOTP() error = %v", err)
		}
		if len(code) != 6 {
			t.Fatalf("generateLoginOTP() length = %d, want 6", len(code))
		}
		for _, character := range code {
			if !unicode.IsDigit(character) {
				t.Fatalf("generateLoginOTP() returned non-numeric code %q", code)
			}
		}
	}
}

func TestLoginOTPDigest(t *testing.T) {
	t.Setenv("OTP_SECRET", "test-otp-secret")

	first, err := loginOTPDigest("user@example.com", "123456")
	if err != nil {
		t.Fatalf("loginOTPDigest() error = %v", err)
	}
	second, err := loginOTPDigest("user@example.com", "123456")
	if err != nil {
		t.Fatalf("loginOTPDigest() error = %v", err)
	}
	different, err := loginOTPDigest("user@example.com", "654321")
	if err != nil {
		t.Fatalf("loginOTPDigest() error = %v", err)
	}

	if first != second {
		t.Fatal("loginOTPDigest() must be deterministic")
	}
	if first == different {
		t.Fatal("loginOTPDigest() must differ for different codes")
	}
}

func TestDisplayNameFromEmail(t *testing.T) {
	if got := displayNameFromEmail("john_doe@example.com"); got != "John Doe" {
		t.Fatalf("displayNameFromEmail() = %q, want %q", got, "John Doe")
	}
}

func TestNormalizeEmail(t *testing.T) {
	got, err := normalizeEmail("  USER@Example.COM ")
	if err != nil {
		t.Fatalf("normalizeEmail() error = %v", err)
	}
	if got != "user@example.com" {
		t.Fatalf("normalizeEmail() = %q, want %q", got, "user@example.com")
	}

	if _, err := normalizeEmail("invalid-email"); err == nil {
		t.Fatal("normalizeEmail() expected invalid email error")
	}
}
