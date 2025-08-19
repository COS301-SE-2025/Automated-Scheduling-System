package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	// Import these AFTER loading .env
	"Automated-Scheduling-Project/internal/email"
	rulesv2 "Automated-Scheduling-Project/internal/rulesV2"
)

func init() {
	// Load environment variables BEFORE any other packages are imported
	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}
}

func main() {
	// Debug: Print environment variables
	log.Printf("MAIL_FROM: %s", os.Getenv("MAIL_FROM"))
	log.Printf("MAIL_PASSWORD: %s", os.Getenv("MAIL_PASSWORD"))

	// Test direct email function
	log.Println("Testing direct email...")
	err := email.SendEmail("mullerdannhauser1@gmail.com", "Test Subject", "This is a test message from the rules engine!")
	if err != nil {
		log.Printf("Direct email failed: %v", err)
	} else {
		log.Println("Direct email sent successfully!")
	}

	// Test through NotificationAction
	log.Println("Testing notification action...")
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})

	action := &rulesv2.NotificationAction{DB: db}
	ctx := rulesv2.EvalContext{Data: map[string]any{}}

	params := map[string]any{
		"recipient": "mullerdannhauser1@gmail.com",
		"subject":   "Test Notification",
		"message":   "This is a test notification from the rules engine!",
		"type":      "email",
	}

	err = action.Execute(ctx, params)
	if err != nil {
		log.Printf("Notification action failed: %v", err)
	} else {
		log.Println("Notification action sent successfully!")
	}
}
