package rulesv2

import (
	"testing"

	"Automated-Scheduling-Project/internal/database/gen_models"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDBForActions() *gorm.DB {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})

	// Migrate the schema
	err := db.AutoMigrate(
		&gen_models.Employee{},
		&gen_models.CompetencyDefinition{},
		&gen_models.CustomJobMatrix{},
		&gen_models.Event{},
		&gen_models.DbRule{},
	)
	if err != nil {
		panic("failed to migrate database schema")
	}

	return db
}

func TestNotificationAction_Execute(t *testing.T) {
	db := setupTestDBForActions()
	action := &NotificationAction{DB: db}

	t.Run("ValidNotification", func(t *testing.T) {
		params := map[string]any{
			"recipient": "test@example.com",
			"subject":   "Test Subject",
			"message":   "Test Message",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.NoError(t, err)
	})

	t.Run("MissingRecipient", func(t *testing.T) {
		params := map[string]any{
			"subject": "Test Subject",
			"message": "Test Message",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "recipient")
	})

	t.Run("MissingSubject", func(t *testing.T) {
		params := map[string]any{
			"recipient": "test@example.com",
			"message":   "Test Message",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "subject")
	})

	t.Run("MissingMessage", func(t *testing.T) {
		params := map[string]any{
			"recipient": "test@example.com",
			"subject":   "Test Subject",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "message")
	})
}

func TestScheduleTrainingAction_Execute(t *testing.T) {
	db := setupTestDBForActions()
	action := &ScheduleTrainingAction{DB: db}

	t.Run("ValidTrainingSchedule", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP001",
			"eventType":      "safety_training",
			"scheduledDate":  "2025-09-01",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.NoError(t, err)

		// Verify event was created
		var event gen_models.Event
		result := db.Where("relevant_parties = ?", "EMP001").First(&event)
		assert.NoError(t, result.Error)
		assert.Equal(t, "safety_training", event.EventType)
	})

	t.Run("ValidTrainingScheduleWithoutDate", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP002",
			"eventType":      "compliance_training",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.NoError(t, err)

		// Verify event was created with default date
		var event gen_models.Event
		result := db.Where("relevant_parties = ?", "EMP002").First(&event)
		assert.NoError(t, result.Error)
		assert.Equal(t, "compliance_training", event.EventType)
	})

	t.Run("InvalidDateFormat", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP003",
			"eventType":      "training",
			"scheduledDate":  "invalid-date",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.NoError(t, err) // Should still work with default date

		var event gen_models.Event
		result := db.Where("relevant_parties = ?", "EMP003").First(&event)
		assert.NoError(t, result.Error)
	})

	t.Run("RFC3339DateFormat", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP004",
			"eventType":      "training",
			"scheduledDate":  "2025-09-01T10:00:00Z",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.NoError(t, err)

		var event gen_models.Event
		result := db.Where("relevant_parties = ?", "EMP004").First(&event)
		assert.NoError(t, result.Error)
	})

	t.Run("MissingEmployeeNumber", func(t *testing.T) {
		params := map[string]any{
			"eventType": "training",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "employeeNumber")
	})

	t.Run("MissingEventType", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP001",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "eventType")
	})
}

func TestCompetencyAssignmentAction_Execute(t *testing.T) {
	db := setupTestDBForActions()
	action := &CompetencyAssignmentAction{DB: db}

	t.Run("AssignCompetency", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP001",
			"competencyID":   int32(123),
			"action":         "assign",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.NoError(t, err)

		// Verify job matrix entry was created
		var jobMatrix gen_models.CustomJobMatrix
		result := db.Where("employee_number = ? AND competency_id = ?", "EMP001", 123).First(&jobMatrix)
		assert.NoError(t, result.Error)
		assert.Equal(t, "EMP001", jobMatrix.EmployeeNumber)
	})

	t.Run("AssignCompetencyWithFloatID", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP002",
			"competencyID":   float64(456), // Test float64 conversion
			"action":         "assign",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.NoError(t, err)

		var jobMatrix gen_models.CustomJobMatrix
		result := db.Where("employee_number = ? AND competency_id = ?", "EMP002", 456).First(&jobMatrix)
		assert.NoError(t, result.Error)
	})

	t.Run("RemoveCompetency", func(t *testing.T) {
		// First create a job matrix entry
		jobMatrix := gen_models.CustomJobMatrix{
			EmployeeNumber:     "EMP003",
			CompetencyID:       789,
			PositionMatrixCode: "POS001",
			RequirementStatus:  "required",
		}
		db.Create(&jobMatrix)

		params := map[string]any{
			"employeeNumber": "EMP003",
			"competencyID":   int32(789),
			"action":         "remove",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.NoError(t, err)

		// Verify job matrix entry was deleted
		var count int64
		db.Model(&gen_models.CustomJobMatrix{}).Where("employee_number = ? AND competency_id = ?", "EMP003", 789).Count(&count)
		assert.Equal(t, int64(0), count)
	})

	t.Run("InvalidAction", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP004",
			"competencyID":   int32(999),
			"action":         "invalid_action",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unknown competency assignment action")
	})

	t.Run("MissingEmployeeNumber", func(t *testing.T) {
		params := map[string]any{
			"competencyID": int32(123),
			"action":       "assign",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "employeeNumber")
	})

	t.Run("MissingAction", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP001",
			"competencyID":   int32(123),
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "action")
	})
}

func TestWebhookAction_Execute(t *testing.T) {
	action := &WebhookAction{}

	t.Run("MissingURL", func(t *testing.T) {
		params := map[string]any{
			"method": "POST",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "url")
	})

	// Note: We can't easily test successful webhook calls without setting up a test server
	// The webhook tests would need a more complex setup with httptest.Server
}

func TestAuditLogAction_Execute(t *testing.T) {
	db := setupTestDBForActions()
	action := &AuditLogAction{DB: db}

	t.Run("ValidAuditLog", func(t *testing.T) {
		params := map[string]any{
			"action":      "competency_check_failed",
			"employee_id": "EMP001",
			"details": map[string]any{
				"competency": "safety_training",
				"reason":     "expired",
			},
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.NoError(t, err)
		// Note: This assumes AuditLogAction creates some audit record in the database
		// The actual implementation may vary
	})

	t.Run("MissingAction", func(t *testing.T) {
		params := map[string]any{
			"employee_id": "EMP001",
		}

		ctx := EvalContext{}
		err := action.Execute(ctx, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "action")
	})
}
