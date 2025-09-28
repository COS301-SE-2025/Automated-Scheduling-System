package rulesv2

import (
	"context"
	"fmt"
	"log"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"Automated-Scheduling-Project/internal/database/models"
)

// TestRelativeDateEvents demonstrates and tests the relative date functionality
func TestRelativeDateEvents(t *testing.T) {
	fmt.Println("Testing Relative Date Events with Scheduler...")

	// Test 1: Direct execution
	testDirectExecution(t)

	// Test 2: Show how scheduler would work
	testSchedulerExecution(t)
}

func testDirectExecution(t *testing.T) {
	fmt.Println("\n=== TEST 1: Direct Rule Execution ===")

	// Setup in-memory database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
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
	service := NewRuleBackEndService(db)

	// Create a rule with relative date
	rule := Rulev2{
		Name: "Test Relative Date Rule",
		Trigger: TriggerSpec{
			Type:       "manual",         // For direct testing
			Parameters: map[string]any{}, // Manual trigger for testing
		},
		Conditions: []Condition{}, // No conditions for simplicity
		Actions: []ActionSpec{
			{
				Type: "create_event",
				Parameters: map[string]any{
					"title":         "Test Relative Event",
					"customEventID": "1",
					"startTime":     "in 2 days", // This is the relative date!
					// endTime omitted - should auto-calculate from event definition
				},
			},
		},
	}

	// Create the rule in the database
	ruleID, err := service.Store.CreateRule(context.Background(), rule)
	if err != nil {
		log.Fatal("Failed to create rule:", err)
	}
	fmt.Printf("Created rule with ID: %s\n", ruleID)

	// Execute the rule manually using the engine directly
	fmt.Println("Executing rule manually...")
	evalCtx := EvalContext{
		Now:  time.Now(),
		Data: map[string]any{},
	}

	err = service.Engine.EvaluateOnce(evalCtx, rule)
	if err != nil {
		log.Fatal("Failed to execute rule:", err)
	}
	fmt.Println("Rule executed successfully!")

	// Check if event was created
	var schedules []models.CustomEventSchedule
	db.Find(&schedules)

	if len(schedules) == 0 {
		fmt.Println("❌ No events were created")
	} else {
		for _, schedule := range schedules {
			fmt.Printf("✅ Event created: ID=%d, Start=%s, End=%s\n",
				schedule.CustomEventID,
				schedule.EventStartDate.Format("2006-01-02 15:04"),
				schedule.EventEndDate.Format("2006-01-02 15:04"))

			// Verify the date is approximately 2 days from now
			expectedStart := time.Now().Add(2 * 24 * time.Hour)
			actualStart := schedule.EventStartDate
			diff := actualStart.Sub(expectedStart)

			if diff < time.Hour && diff > -time.Hour { // Within 1 hour tolerance
				fmt.Printf("✅ Date calculation correct: %s (expected around %s)\n",
					actualStart.Format("2006-01-02 15:04"),
					expectedStart.Format("2006-01-02 15:04"))
			} else {
				fmt.Printf("❌ Date calculation incorrect: got %s, expected around %s\n",
					actualStart.Format("2006-01-02 15:04"),
					expectedStart.Format("2006-01-02 15:04"))
			}

			// Verify automatic duration calculation
			actualDuration := schedule.EventEndDate.Sub(schedule.EventStartDate)
			expectedDuration := 2 * time.Hour // From event definition StandardDuration
			if actualDuration == expectedDuration {
				fmt.Printf("✅ Duration calculation correct: %v (2 hours from event definition)\n", actualDuration)
			} else {
				fmt.Printf("❌ Duration calculation incorrect: got %v, expected %v\n", actualDuration, expectedDuration)
			}
		}
	}
}

func testSchedulerExecution(t *testing.T) {
	fmt.Println("\n=== TEST 2: Scheduler-based Rule Execution ===")

	// This would test actual time-based triggering
	// For now, let's show how it would work
	fmt.Println("Setting up scheduler test...")

	// Setup database same as before
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

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

	// Create event definition
	eventDef := models.CustomEventDefinition{
		CustomEventID:       2,
		EventName:           "Scheduled Meeting",
		ActivityDescription: "Time-triggered meeting",
		StandardDuration:    "1 hour",
		Facilitator:         "System",
		CreatedBy:           "scheduler",
		CreationDate:        time.Now(),
	}
	db.Create(&eventDef)

	service := NewRuleBackEndService(db)

	// Create a rule that should trigger in 10 seconds for testing
	rule := Rulev2{
		Name: "Scheduler Test Rule",
		Trigger: TriggerSpec{
			Type: "relative_time",
			Parameters: map[string]any{
				"when": "tomorrow", // Trigger tomorrow
			},
		},
		Conditions: []Condition{},
		Actions: []ActionSpec{
			{
				Type: "create_event",
				Parameters: map[string]any{
					"title":         "Scheduled Test Event",
					"customEventID": "2",
					"startTime":     "in 3 days", // Event starts 3 days from trigger
					// endTime omitted - should auto-calculate from event definition
				},
			},
		},
	}

	ruleID, err := service.Store.CreateRule(context.Background(), rule)
	if err != nil {
		log.Fatal("Failed to create scheduled rule:", err)
	}
	fmt.Printf("Created scheduled rule with ID: %s\n", ruleID)

	fmt.Println("\nNote: To fully test this with actual time triggering, you would need to:")
	fmt.Println("1. Start the scheduler service")
	fmt.Println("2. Register the rule with the scheduler")
	fmt.Println("3. Wait for the trigger time (tomorrow)")
	fmt.Println("4. Verify the event was created automatically")
	fmt.Println("")
	fmt.Println("The scheduler would:")
	fmt.Println("- Parse 'tomorrow' to get the trigger time")
	fmt.Println("- Set up a cron job or timer for that exact time")
	fmt.Println("- Execute the rule when the time arrives")
	fmt.Println("- The rule would then create an event with startTime 'in 3 days'")
	fmt.Println("  (relative to when the rule executes, not when it was created)")
}
