package utils

import (
	"crypto/tls"
	"fmt"
	"html"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

const loginOTPBoundary = "magic-converter-login-otp"

type SMTPMailer struct {
	host     string
	port     int
	username string
	password string
	from     string
}

func NewSMTPMailer() *SMTPMailer {
	port, err := strconv.Atoi(os.Getenv("SMTP_PORT"))
	if err != nil || port == 0 {
		port = 587
	}

	return &SMTPMailer{
		host:     strings.TrimSpace(os.Getenv("SMTP_HOST")),
		port:     port,
		username: os.Getenv("SMTP_USERNAME"),
		password: os.Getenv("SMTP_PASSWORD"),
		from:     strings.TrimSpace(os.Getenv("SMTP_FROM")),
	}
}

func (m *SMTPMailer) SendLoginOTP(to, code string, validity time.Duration) error {
	if m.host == "" || m.username == "" || m.password == "" || m.from == "" {
		return fmt.Errorf("SMTP login configuration is incomplete")
	}

	message, err := buildLoginOTPMessage(m.from, to, code, validity)
	if err != nil {
		return err
	}

	address := fmt.Sprintf("%s:%d", m.host, m.port)
	auth := smtp.PlainAuth("", m.username, m.password, m.host)
	if m.port == 465 {
		connection, err := tls.Dial("tcp", address, &tls.Config{ServerName: m.host, MinVersion: tls.VersionTLS12})
		if err != nil {
			return err
		}
		client, err := smtp.NewClient(connection, m.host)
		if err != nil {
			_ = connection.Close()
			return err
		}
		defer client.Close()
		return sendSMTPMessage(client, auth, m.from, to, message)
	}

	client, err := smtp.Dial(address)
	if err != nil {
		return err
	}
	defer client.Close()
	if ok, _ := client.Extension("STARTTLS"); !ok {
		return fmt.Errorf("SMTP server does not support STARTTLS")
	}
	if err := client.StartTLS(&tls.Config{ServerName: m.host, MinVersion: tls.VersionTLS12}); err != nil {
		return err
	}
	return sendSMTPMessage(client, auth, m.from, to, message)
}

func buildLoginOTPMessage(from, to, code string, validity time.Duration) ([]byte, error) {
	if strings.ContainsAny(from+to, "\r\n") {
		return nil, fmt.Errorf("email headers contain invalid characters")
	}

	minutes := int(validity.Minutes())
	subject := "Your Magic Converter sign-in code"
	plainBody := fmt.Sprintf(
		"Sign in to Magic Converter\r\n\r\nYour one-time code is: %s\r\n\r\nThis code expires in %d minutes and can only be used once. Never share this code with anyone.\r\n\r\nIf you did not request this email, you can safely ignore it.\r\n",
		code,
		minutes,
	)
	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>%s</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:Arial,'Helvetica Neue',sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Use code %s to sign in. It expires in %d minutes.</div>
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f3ef;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:3px solid #111827;border-radius:20px;box-shadow:8px 8px 0 #111827;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background:#facc15;border-bottom:3px solid #111827;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width:42px;height:42px;background:#111827;color:#ffffff;border-radius:12px;text-align:center;font-size:22px;font-weight:800;">M</td>
                  <td style="padding-left:14px;font-size:20px;font-weight:800;letter-spacing:-0.3px;">Magic Converter</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 32px;">
              <div style="display:inline-block;padding:6px 12px;background:#d8b4fe;border:2px solid #111827;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Secure sign-in</div>
              <h1 style="margin:22px 0 10px;font-size:28px;line-height:1.2;letter-spacing:-0.6px;">Your sign-in code</h1>
              <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.7;">Enter this one-time code in Magic Converter to complete your sign-in.</p>
              <div style="margin:28px 0;padding:20px 16px;background:#f3e8ff;border:3px solid #111827;border-radius:16px;text-align:center;font-family:'Courier New',monospace;font-size:36px;line-height:1;font-weight:800;letter-spacing:10px;color:#111827;">%s</div>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;"><strong>This code expires in %d minutes</strong> and can only be used once.</p>
              <p style="margin:0;padding:14px 16px;background:#fef3c7;border-left:4px solid #f59e0b;font-size:13px;line-height:1.6;color:#78350f;"><strong>Security reminder:</strong> Magic Converter will never ask you to share this code.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:2px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6;">If you did not request this code, you can safely ignore this email. No account changes have been made.</td>
          </tr>
        </table>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:11px;">This is an automated security email from Magic Converter.</p>
      </td>
    </tr>
  </table>
</body>
</html>`, html.EscapeString(subject), html.EscapeString(code), minutes, html.EscapeString(code), minutes)

	message := "From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: multipart/alternative; boundary=\"" + loginOTPBoundary + "\"\r\n\r\n" +
		"--" + loginOTPBoundary + "\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"Content-Transfer-Encoding: 8bit\r\n\r\n" +
		plainBody + "\r\n" +
		"--" + loginOTPBoundary + "\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"Content-Transfer-Encoding: 8bit\r\n\r\n" +
		htmlBody + "\r\n" +
		"--" + loginOTPBoundary + "--\r\n"

	return []byte(message), nil
}

func sendSMTPMessage(client *smtp.Client, auth smtp.Auth, from, to string, message []byte) error {
	if err := client.Auth(auth); err != nil {
		return err
	}
	envelope := from
	if address, err := mail.ParseAddress(from); err == nil {
		envelope = address.Address
	}
	if err := client.Mail(envelope); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(message); err != nil {
		_ = writer.Close()
		return err
	}
	return writer.Close()
}
