package main

import (
	"log"
	"os"

	"Automated-Scheduling-Project/internal/sms"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	// Check if environment variables are set
	if os.Getenv("SENDMODE_USERNAME") == "" || os.Getenv("SENDMODE_PASSWORD") == "" {
		log.Println("Warning: SENDMODE_USERNAME and SENDMODE_PASSWORD environment variables should be set")
		log.Println("For testing without real credentials, the function will still show you the request URL")
	}

	// Test different phone number formats
	testFormats := []string{
		"27630614668", // International format without +
	}

	testMessage := "TEST SMS Format test"

	log.Println("🚀 Testing SMS functionality with different phone number formats...")
	log.Println("----------------------------------------")

	for i, testRecipient := range testFormats {
		log.Printf("\n📱 Test %d: %s", i+1, testRecipient)

		// Send SMS
		err := sms.SendSMS([]string{testRecipient}, testMessage)
		if err != nil {
			log.Printf("❌ Error sending SMS to %s: %v", testRecipient, err)
		} else {
			log.Printf("✅ SMS sent successfully to %s", testRecipient)
		}

		log.Println("----------------------------------------")
	}

	log.Println("✅ All SMS tests completed!")
}
