package rulesv2

import (
	"context"
	"testing"
	"time"

	"Automated-Scheduling-Project/internal/database/gen_models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	// Migrate the schema
	db.AutoMigrate(
		&gen_models.Employee{},
		&gen_models.CompetencyDefinition{},
		&gen_models.CustomJobMatrix{},
		&gen_models.Event{},
		&gen_models.DbRule{},
	)
	if db == nil {
		panic("failed to migrate database")
	}

	return db
}

func TestRuleBackEndService_Basic(t *testing.T) {
	db := setupTestDB()

	// Create test data
	employee := gen_models.Employee{
		Employeenumber:   "EMP001",
		Firstname:        "John",
		Lastname:         "Doe",
		Useraccountemail: "john.doe@company.com",
		Employeestatus:   "Active",
	}
	db.Create(&employee)

	competency := gen_models.CompetencyDefinition{
		CompetencyID:   1,
		CompetencyName: "Basic Safety",
		Description:    "Basic safety training",
		Source:         "Internal",
		IsActive:       true,
		CreationDate:   time.Now(),
	}
	db.Create(&competency)

	// Create rules integration service
	service := NewRuleBackEndService(db)

	// Test job matrix update trigger
	ctx := context.Background()
	err := service.OnJobMatrixUpdate(ctx, "EMP001", 1, "created")
	if err != nil {
		t.Errorf("OnJobMatrixUpdate failed: %v", err)
	}

	// Test new hire trigger
	err = service.OnNewHire(ctx, "EMP001")
	if err != nil {
		t.Errorf("OnNewHire failed: %v", err)
	}

	// Test scheduled checks
	err = service.RunScheduledChecks(ctx)
	if err != nil {
		t.Errorf("RunScheduledChecks failed: %v", err)
	}
}

func TestDbRuleStore_CRUD(t *testing.T) {
	db := setupTestDB()
	store := &DbRuleStore{DB: db}

	// Test create rule
	ctx := context.Background()
	rule := Rulev2{
		Name: "Test Rule",
		Trigger: TriggerSpec{
			Type: "job_matrix_update",
		},
		Conditions: []Condition{
			{
				Fact:     "employee.Active",
				Operator: "isTrue",
			},
		},
		Actions: []ActionSpec{
			{
				Type: "notification",
				Parameters: map[string]any{
					"recipient": "manager@company.com",
					"subject":   "Test notification",
					"message":   "This is a test",
				},
			},
		},
	}

	ruleID := "test_rule_1"
	err := store.CreateRule(ctx, rule, ruleID)
	if err != nil {
		t.Errorf("CreateRule failed: %v", err)
	}

	// Test get rule
	retrievedRule, err := store.GetRuleByID(ctx, ruleID)
	if err != nil {
		t.Errorf("GetRuleByID failed: %v", err)
	}

	if retrievedRule.Name != rule.Name {
		t.Errorf("Retrieved rule name mismatch: got %s, want %s", retrievedRule.Name, rule.Name)
	}

	// Test list by trigger
	rules, err := store.ListByTrigger(ctx, "job_matrix_update")
	if err != nil {
		t.Errorf("ListByTrigger failed: %v", err)
	}

	if len(rules) != 1 {
		t.Errorf("Expected 1 rule, got %d", len(rules))
	}

	// Test delete rule
	err = store.DeleteRule(ctx, ruleID)
	if err != nil {
		t.Errorf("DeleteRule failed: %v", err)
	}

	// Verify deletion
	_, err = store.GetRuleByID(ctx, ruleID)
	if err == nil {
		t.Error("Expected error when getting deleted rule")
	}
}

func TestActionExecution(t *testing.T) {
	db := setupTestDB()

	// Test NotificationAction
	notifAction := &NotificationAction{DB: db}
	ctx := EvalContext{
		Now:  time.Now(),
		Data: map[string]any{},
	}

	params := map[string]any{
		"recipient": "test@example.com",
		"subject":   "Test Subject",
		"message":   "Test Message",
	}

	err := notifAction.Execute(ctx, params)
	if err != nil {
		t.Errorf("NotificationAction.Execute failed: %v", err)
	}

	// Test ScheduleTrainingAction
	trainingAction := &ScheduleTrainingAction{DB: db}

	employee := gen_models.Employee{
		Employeenumber:   "EMP001",
		Firstname:        "John",
		Lastname:         "Doe",
		Useraccountemail: "john.doe@company.com",
		Employeestatus:   "Active",
	}
	db.Create(&employee)

	params = map[string]any{
		"employeeNumber": "EMP001",
		"eventType":      "safety_training",
		"scheduledDate":  "2025-09-01",
	}

	err = trainingAction.Execute(ctx, params)
	if err != nil {
		t.Errorf("ScheduleTrainingAction.Execute failed: %v", err)
	}

	// Verify event was created
	var event gen_models.Event
	err = db.Where("relevant_parties = ? AND event_type = ?", "EMP001", "safety_training").First(&event).Error
	if err != nil {
		t.Errorf("Training event was not created: %v", err)
	}
}
