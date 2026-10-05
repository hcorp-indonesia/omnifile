package utils

import (
	"strings"
	"testing"
	"time"
)

func TestBuildLoginOTPMessage(t *testing.T) {
	message, err := buildLoginOTPMessage(
		"Magic Converter <noreply@example.com>",
		"user@example.com",
		"123456",
		10*time.Minute,
	)
	if err != nil {
		t.Fatalf("buildLoginOTPMessage() error = %v", err)
	}

	content := string(message)
	for _, expected := range []string{
		"Content-Type: multipart/alternative",
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Type: text/html; charset=UTF-8",
		"123456",
		"expires in 10 minutes",
		"Security reminder",
	} {
		if !strings.Contains(content, expected) {
			t.Fatalf("message does not contain %q", expected)
		}
	}
}

func TestBuildLoginOTPMessageRejectsHeaderInjection(t *testing.T) {
	_, err := buildLoginOTPMessage(
		"Magic Converter <noreply@example.com>",
		"user@example.com\r\nBcc: attacker@example.com",
		"123456",
		10*time.Minute,
	)
	if err == nil {
		t.Fatal("buildLoginOTPMessage() expected header validation error")
	}
}
