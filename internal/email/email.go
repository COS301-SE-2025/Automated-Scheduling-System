package email

import (
	"fmt"
	"os"

	gomail "gopkg.in/mail.v2"
)

func SendEmail(to, subject, body string) error {
	// Read environment variables when function is called, not at package init
	fromAddress := os.Getenv("MAIL_FROM")
	mailPassword := os.Getenv("MAIL_PASSWORD")

	// Debug logging
	fmt.Printf("DEBUG: fromAddress='%s', mailPassword='%s'\n", fromAddress, mailPassword)

	if fromAddress == "" || mailPassword == "" {
		return fmt.Errorf("email configuration missing: MAIL_FROM=%s, MAIL_PASSWORD is empty=%t",
			fromAddress, mailPassword == "")
	}

	dialer := gomail.NewDialer(
		"smtp.gmail.com",
		587,
		fromAddress,
		mailPassword,
	)

	// Use the helper function to send the email
	return SendEmailWithDialer(dialer, to, subject, body, fromAddress)
}

func SendEmailWithDialer(dialer interface {
	DialAndSend(...*gomail.Message) error
}, to, subject, body, fromAddress string) error {
	message := gomail.NewMessage()

	// Set email headers
	message.SetHeader("From", fromAddress)
	message.SetHeader("To", to)
	message.SetHeader("Subject", subject)

	// Set email body
	message.SetBody("text/plain", body)

	// Send the email
	if err := dialer.DialAndSend(message); err != nil {
		return err
	}

	return nil
}
