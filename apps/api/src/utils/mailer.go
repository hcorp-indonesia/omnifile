package utils

import (
	"crypto/tls"
	"fmt"
	"net/mail"
	"net/smtp"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type SMTPMailer struct {
	host     string
	port     int
	username string
	password string
	from     string
	appURL   string
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
		appURL:   strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_URL")), "/"),
	}
}

func (m *SMTPMailer) SendPasswordReset(to, name, token string) error {
	if m.host == "" || m.username == "" || m.password == "" || m.from == "" || m.appURL == "" {
		return fmt.Errorf("smtp reset-password configuration is incomplete")
	}

	resetURL := m.appURL + "/reset-password?token=" + url.QueryEscape(token)
	subject := "Reset your Magic Converter password"
	body := fmt.Sprintf("Hello %s,\r\n\r\nUse the link below to reset your password. This link expires in 15 minutes and can only be used once.\r\n\r\n%s\r\n\r\nIf you did not request this, you can safely ignore this email.\r\n", name, resetURL)
	message := "From: " + m.from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n\r\n" + body

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
		return sendSMTPMessage(client, auth, m.from, to, []byte(message))
	}

	client, err := smtp.Dial(address)
	if err != nil {
		return err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); !ok {
		return fmt.Errorf("smtp server does not support STARTTLS")
	}
	if err := client.StartTLS(&tls.Config{ServerName: m.host, MinVersion: tls.VersionTLS12}); err != nil {
		return err
	}
	return sendSMTPMessage(client, auth, m.from, to, []byte(message))
}

func sendSMTPMessage(client *smtp.Client, auth smtp.Auth, from, to string, message []byte) error {
	if err := client.Auth(auth); err != nil {
		return err
	}
	envelope := from
	if addr, err := mail.ParseAddress(from); err == nil {
		envelope = addr.Address
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
