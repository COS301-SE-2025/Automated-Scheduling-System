package email

import (
	"os"

	gomail "gopkg.in/mail.v2"
)

func SendEmail(to, subject, body string) error {
	fromAddress := os.Getenv("MAIL_FROM")
	mailPassword := os.Getenv("MAIL_PASSWORD")

	dialer := gomail.NewDialer(
		"smtp.gmail.com",
		587,
		fromAddress,
		mailPassword,
	)

	// Use the helper function to send the email
	return SendEmailWithDialer(dialer, to, subject, body, fromAddress, mailPassword)
}

func SendEmailWithDialer(dialer interface {
	DialAndSend(...*gomail.Message) error
}, to, subject, body, fromAddress, mailPassword string) error {
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
