package main

import (
	"Automated-Scheduling-Project/internal/database"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"gorm.io/gorm"
)

var dbService database.Service = database.New()
var DB *gorm.DB = dbService.Gorm()

func main() {
	// Get the current working directory
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current working directory: %v", err)
	}

	// Construct the path to the seeder.sql file
	sqlFilePath := filepath.Join(cwd, "cmd/seed/seeder.sql")

	// Read the SQL dump file
	sqlBytes, err := os.ReadFile(sqlFilePath)
	if err != nil {
		log.Fatalf("Failed to read SQL file: %v", err)
	}

	// Convert the file content to a string
	sqlContent := string(sqlBytes)

	// Execute the SQL commands
	if err := DB.Exec(sqlContent).Error; err != nil {
		log.Fatalf("Failed to execute seeders: %v", err)
	}

	fmt.Println("Database seeded successfully!")
}
