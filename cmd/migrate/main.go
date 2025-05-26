package main

import (
	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/database"
	"log"

	"gorm.io/gorm"
)

func main() {
	// Get database instance
	var dbService database.Service = database.New()

	// Get GORM DB instance
	var DB *gorm.DB = dbService.Gorm()

	// Run migrations
	err := DB.AutoMigrate(&auth.User{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration successful")
}
