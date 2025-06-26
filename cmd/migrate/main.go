package main

import (
	"Automated-Scheduling-Project/internal/database"
	"Automated-Scheduling-Project/internal/database/models"
	"log"

	"gorm.io/gorm"
)

func main() {
	// Get database instance
	var dbService database.Service = database.New()

	// Get GORM DB instance
	var DB *gorm.DB = dbService.Gorm()

	// Run migrations
	err := DB.AutoMigrate(&models.DBRule{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration successful")
}
