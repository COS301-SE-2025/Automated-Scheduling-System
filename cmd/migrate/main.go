package main

import (
	"Automated-Scheduling-Project/internal/database"
	"Automated-Scheduling-Project/internal/database/models"
	rules "Automated-Scheduling-Project/internal/rule_engine"
	"context"
	"log"

	"gorm.io/gorm/clause"
)

func main() {
	// Get database instance
	var dbService = database.New()

	// Get GORM DB instance
	var DB = dbService.Gorm()

	// Run migrations
	err := DB.AutoMigrate(&models.DBRule{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration successful")

	rulesToSeed := []rules.RawRule{
		{
			ID:        "vision-6mo",
			Type:      "recurringCheck",
			Enabled:   true,
			Frequency: &rules.Period{Months: 6},
			Params: map[string]any{
				"checkType":        "vision",
				"notifyDaysBefore": 14,
			},
		},
		{
			ID:      "driver-notify",
			Type:    "action",
			Enabled: true,
			When:    "user.role == 'driver' && check['checkType'] == 'vision'",
			Actions: []rules.RawAction{
				{
					Type:   "notify",
					Params: map[string]any{"message": "Driver vision check added"},
				},
			},
		},
	}
	ctx := context.Background()
	for _, rr := range rulesToSeed {
		row := models.DBRule{
			ID:      rr.ID,
			Enabled: rr.Enabled,
			Type:    rr.Type,
			Body:    models.RawRuleJSON(rr),
		}
		err := DB.WithContext(ctx).
			Clauses(clause.OnConflict{UpdateAll: true}).
			Create(&row).Error
		if err != nil {
			log.Fatalf("seed rule %s: %v", rr.ID, err)
		}
		log.Printf("Seeded rule %s", rr.ID)
	}

	log.Printf("Migration and seeding complete")
}
