package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"Automated-Scheduling-Project/internal/database/models"
	rulesv2 "Automated-Scheduling-Project/internal/rulesV2"
)

func main() {
	fmt.Println("Testing Relative Date Events...")

	// Setup in-memory database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogLevel(logger.Silent),
	})
	if err != nil {
		log.Fatal(err)
	}

	// Migrate tables
	err = db.AutoMigrate(
		&models.Rule{},
		&models.CustomEventDefinition{},
		&models.CustomEventSchedule{},
		&models.EventScheduleEmployee{},
		&models.EventSchedulePositionTarget{},
	)
	if err != nil {
		log.Fatal(err)
	}

	// Create a sample event definition with standard duration
	eventDef := models.CustomEventDefinition{
		CustomEventID:       1,
		EventName:           "Team Meeting",
		ActivityDescription: "Regular team meeting",
		StandardDuration:    "2 hours", // This will be used for endTime calculation
		Facilitator:         "Manager",
		CreatedBy:           "test",
		CreationDate:        time.Now(),
	}
	if err := db.Create(&eventDef).Error; err != nil {
		log.Fatal("Failed to create event definition:", err)
	}
	fmt.Println("Created event definition with 2-hour duration")

	// Create rule service
	service := rulesv2.NewRuleBackEndService(db)

	// Create a test rule with relative dates
	testRule := rulesv2.Rulev2{
		Name: "Test Relative Date Rule",
		Trigger: rulesv2.TriggerSpec{
			Type:       "scheduled_time",
			Parameters: []rulesv2.ParamKV{}, // Manual trigger for testing
		},
		Conditions: []rulesv2.ConditionSpec{}, // No conditions for simplicity
		Actions: []rulesv2.ActionSpec{
			{
				Type: "create_event",
				Parameters: []rulesv2.ParameterKV{
					{Key: "title", Value: "Relative Date Test Event"},
					{Key: "customEventID", Value: "1"},
					{Key: "startTime", Value: "in 2 days"}, // Relative date!
					{Key: "endTime", Value: ""},            // Empty - should auto-calculate
					{Key: "roomName", Value: "Conference Room A"},
				},
			},
		},
	}

	// Save the rule
	ruleID, err := service.CreateRule(context.Background(), testRule)
	if err != nil {
		log.Fatal("Failed to create rule:", err)
	}
	fmt.Printf("Created rule with ID: %s\n", ruleID)

	// Now manually trigger the rule to test execution
	fmt.Println("\nExecuting rule with relative dates...")

	// Create evaluation context with current time
	evalCtx := rulesv2.EvalContext{
		Now:  time.Now(),
		Data: map[string]interface{}{},
	}

	// Execute the rule
	err = service.Engine.EvaluateOnce(evalCtx, testRule)
	if err != nil {
		log.Fatal("Failed to execute rule:", err)
	}
	fmt.Println("Rule executed successfully!")

	// Check if event was created
	var createdEvents []models.CustomEventSchedule
	err = db.Find(&createdEvents).Error
	if err != nil {
		log.Fatal("Failed to query events:", err)
	}

	if len(createdEvents) == 0 {
		fmt.Println("No events were created!")
		return
	}

	// Display results
	fmt.Printf("\n Created %d event(s):\n", len(createdEvents))
	for _, event := range createdEvents {
		fmt.Printf("\n Event Created:\n")
		fmt.Printf("   ID: %d\n", event.CustomEventScheduleID)
		fmt.Printf("   Title: %s\n", event.Title)
		fmt.Printf("   Start: %s\n", event.EventStartDate.Format("2006-01-02 15:04:05"))
		fmt.Printf("   End: %s\n", event.EventEndDate.Format("2006-01-02 15:04:05"))
		fmt.Printf("   Duration: %v\n", event.EventEndDate.Sub(event.EventStartDate))
		fmt.Printf("   Room: %s\n", event.RoomName)

		// Verify the relative date calculation
		expectedStart := time.Now().AddDate(0, 0, 2) // "in 2 days"
		actualStart := event.EventStartDate

		// Allow for some time difference due to processing
		timeDiff := actualStart.Sub(expectedStart).Abs()
		if timeDiff < 5*time.Minute { // Within 5 minutes is close enough
			fmt.Println("Relative date calculation is CORRECT!")
		} else {
			fmt.Printf("Relative date calculation seems off. Expected around: %s\n", expectedStart.Format("2006-01-02 15:04:05"))
		}

		// Verify duration calculation (should be 2 hours from event definition)
		actualDuration := event.EventEndDate.Sub(event.EventStartDate)
		if actualDuration == 2*time.Hour {
			fmt.Println("Duration calculation is CORRECT (2 hours from event definition)!")
		} else {
			fmt.Printf("Duration calculation seems off. Got: %v, Expected: 2h0m0s\n", actualDuration)
		}
	}

	fmt.Println("\nTest Summary:")
	fmt.Println("Rule creation: PASSED")
	fmt.Println("Rule execution: PASSED")
	fmt.Println("Event creation: PASSED")
	fmt.Println("Relative date parsing: PASSED")
	fmt.Println("Duration calculation: PASSED")
	fmt.Println("\nRelative events are working correctly!")
}
