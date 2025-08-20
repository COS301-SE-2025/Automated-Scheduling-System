package main

import (
	// "context"
	"log"
	"time"

	"Automated-Scheduling-Project/internal/database"
	rules "Automated-Scheduling-Project/internal/rulesV2"
)

/*
	go run ./cmd/migrate_seed

	This seeds two rulesv2 examples:
	- EVENT_STATUS_CHANGED → logs when a schedule becomes Completed
	- DAILY_COMPETENCY_EXPIRY_CHECK → logs when a required competency expires in <= 7 days
*/

func main() {
	// 1) DB connection
	dbSvc := database.New()
	DB := dbSvc.Gorm()

	// 2) Migrate the rules table
	if err := rules.EnsureRulesTable(DB); err != nil {
		log.Fatalf("migrate rules table: %v", err)
	}
	log.Println("Rules table migration successful")

	// 3) Build a minimal registry
	reg := rules.NewRegistryWithDefaults().
		UseFactResolver(rules.EmployeeFacts{}).
		UseFactResolver(rules.CompetencyFacts{}).
		UseFactResolver(rules.EventFacts{})

	// Register a simple console action so we can see results without email/webhooks
	reg.UseAction("CONSOLE", consoleAction{})
	reg.UseAction("create_event", &rules.CreateEventAction{DB: DB})
	reg.UseAction("notification", &rules.NotificationAction{DB: DB})

	// 4) Create the store
	// store := rules.DBRuleStore{DB: DB}

	// // 5) Seed rules
	// ctx := context.Background()

	// // Rule A: When an event schedule hits "Completed" → log
	// ruleEventCompleted := rules.Rulev2{
	// 	Name:    "Event Completed → Console Log",
	// 	Trigger: rules.TriggerSpec{Type: "EVENT_STATUS_CHANGED"},
	// 	Conditions: []rules.Condition{
	// 		{Fact: "eventSchedule.StatusName", Operator: "equals", Value: "Completed"},
	// 	},
	// 	Actions: []rules.ActionSpec{
	// 		{
	// 			Type: "CONSOLE",
	// 			Parameters: map[string]any{
	// 				"msg": "Event {{.eventSchedule.ID}} completed by {{.employee.EmployeeNumber}}",
	// 			},
	// 		},
	// 	},
	// }

	// // Rule B: 7-day critical competency expiry (Active + required + ≤7 days)
	// ruleExpiry := rules.Rulev2{
	// 	Name:    "7-Day Critical Competency Expiry Alert (Console)",
	// 	Trigger: rules.TriggerSpec{Type: "DAILY_COMPETENCY_EXPIRY_CHECK", Parameters: map[string]any{"daysBefore": 7}},
	// 	Conditions: []rules.Condition{
	// 		{Fact: "employee.EmployeeStatus", Operator: "equals", Value: "Active"},
	// 		{Fact: "competency.IsRequiredForCurrentJob", Operator: "isTrue"},
	// 		{Fact: "competency.DaysUntilExpiry", Operator: "lessThanOrEqual", Value: 7},
	// 	},
	// 	Actions: []rules.ActionSpec{
	// 		{
	// 			Type: "CONSOLE",
	// 			Parameters: map[string]any{
	// 				"msg": "Competency {{.competency.ID}} expires in {{.competency.DaysUntilExpiry}} days (emp={{.employee.EmployeeNumber}})",
	// 			},
	// 		},
	// 	},
	// }

	// if _, err := store.Seed(ctx, reg, ruleEventCompleted, true); err != nil {
	// 	log.Fatalf("seed rule A: %v", err)
	// }
	// if _, err := store.Seed(ctx, reg, ruleExpiry, true); err != nil {
	// 	log.Fatalf("seed rule B: %v", err)
	// }

	log.Println("Rule seeding complete")
}

/* ----------------------------- Helpers ---------------------------------- */

// consoleAction is a stub ActionHandler that prints to the log.
// You can keep this for dev, and later add SEND_NOTIFICATION, WEBHOOK, etc.
type consoleAction struct{}

func (consoleAction) Execute(ctx rules.EvalContext, params map[string]any) error {
	// Rendered params are already provided by the engine (Go templates resolved).
	msg, _ := params["msg"].(string)
	log.Printf("[CONSOLE] now=%s msg=%q params=%v", ctx.Now.Format(time.RFC3339), msg, params)
	return nil
}
