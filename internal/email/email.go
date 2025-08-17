package email

import (
	"fmt"
	"os"

	gomail "gopkg.in/mail.v2"
)

var (
	fromAddress  = os.Getenv("MAIL_FROM")
	mailPassword = os.Getenv("MAIL_PASSWORD")
)

func SendEmail(to, subject, body string) error {
	dialer := gomail.NewDialer(
		"smtp.gmail.com",
		587,
		fromAddress,
		mailPassword,
	)

	// Use the helper function to send the email
	return SendEmailWithDialer(dialer, to, subject, body)
}

func SendEmailWithDialer(dialer interface {
	DialAndSend(...*gomail.Message) error
}, to, subject, body string) error {
	message := gomail.NewMessage()

	// Set email headers
	message.SetHeader("From", fromAddress)
	message.SetHeader("To", to)
	message.SetHeader("Subject", subject)

	// Set email body
	message.SetBody("text/plain", body)

	// Send the email
	if err := dialer.DialAndSend(message); err != nil {
		fmt.Println("Error:", err)
		return err
	}

	// fmt.Println("Email sent successfully!")
	return nil
}
