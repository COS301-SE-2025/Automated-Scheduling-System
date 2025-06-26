package main

import (
	"Automated-Scheduling-Project/internal/database"
	"log"
)

func main() {
	// Get database instance
	var dbService = database.New()

	// Get GORM DB instance
	var DB = dbService.Gorm()

	// Drop all tables
	tables, err := DB.Migrator().GetTables()
	if err != nil {
		log.Fatalf("failed to get tables: %v", err)
	}

	// Convert tables from []string to []interface{}
	var tableInterfaces []interface{}
	for _, table := range tables {
		tableInterfaces = append(tableInterfaces, table)
	}

	if err := DB.Migrator().DropTable(tableInterfaces...); err != nil {
		log.Fatalf("failed to drop all tables: %v", err)
	}

	log.Println("All tables have been dropped.")
}
