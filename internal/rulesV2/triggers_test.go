package rulesv2

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDatabase() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to create test database: " + err.Error())
	}

	// Create all required tables
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS employee (
			employeenumber TEXT PRIMARY KEY,
			name TEXT,
			department TEXT,
			employeestatus TEXT DEFAULT 'Active'
		);
		
		CREATE TABLE IF NOT EXISTS competency_definitions (
			competency_id INTEGER PRIMARY KEY,
			competency_name TEXT,
			description TEXT,
			competency_type_name TEXT,
			source TEXT,
			expiry_period_months INTEGER,
			is_active BOOLEAN,
			creation_date DATETIME
		);
		
		CREATE TABLE IF NOT EXISTS custom_job_matrix (
			custom_matrix_id INTEGER PRIMARY KEY,
			employee_number TEXT,
			competency_id INTEGER
		);
		
		CREATE TABLE IF NOT EXISTS custom_job_matrices (
			custom_matrix_id INTEGER PRIMARY KEY,
			employee_number TEXT,
			competency_id INTEGER
		);
		
		CREATE TABLE IF NOT EXISTS events (
			id INTEGER PRIMARY KEY,
			title TEXT,
			start_time DATETIME,
			end_time DATETIME,
			relevant_parties TEXT
		);
	`).Error
	if err != nil {
		panic("Failed to create tables: " + err.Error())
	}

	// Insert test data
	db.Exec(`
		INSERT INTO employee (employeenumber, name, department, employeestatus) VALUES 
		('EMP001', 'John Doe', 'Engineering', 'Active'),
		('EMP002', 'Jane Smith', 'HR', 'Active');
		
		INSERT INTO competency_definitions (competency_id, competency_name, description, competency_type_name, source, expiry_period_months, is_active, creation_date) VALUES 
		(1, 'Safety Training', 'Basic safety training', 'Training', 'Internal', 12, true, datetime('2024-01-01')),
		(2, 'Compliance Training', 'Compliance certification', 'Certification', 'External', 24, true, datetime('2024-01-01'));
		
		INSERT INTO custom_job_matrix (custom_matrix_id, employee_number, competency_id) VALUES 
		(1, 'EMP001', 1),
		(2, 'EMP001', 2);
		
		INSERT INTO custom_job_matrices (custom_matrix_id, employee_number, competency_id) VALUES 
		(1, 'EMP001', 1),
		(2, 'EMP001', 2);
	`)

	return db
}

func TestJobMatrixTrigger_Fire(t *testing.T) {
	db := setupTestDatabase()
	trigger := &JobMatrixTrigger{DB: db}

	t.Run("ValidJobMatrixUpdate", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP001",
			"competencyID":   int32(1),
			"action":         "created",
		}

		ctx := context.Background()
		fired := false
		emit := func(evalCtx EvalContext) error {
			fired = true
			return nil
		}

		err := trigger.Fire(ctx, params, emit)
		assert.NoError(t, err)
		assert.True(t, fired)
	})

	t.Run("MissingEmployeeNumber", func(t *testing.T) {
		params := map[string]any{
			"competencyID": int32(1),
			"action":       "created",
		}

		ctx := context.Background()
		emit := func(evalCtx EvalContext) error {
			return nil
		}

		err := trigger.Fire(ctx, params, emit)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "employeeNumber")
	})

	t.Run("MissingCompetencyID", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP001",
			"action":         "created",
		}

		ctx := context.Background()
		emit := func(evalCtx EvalContext) error {
			return nil
		}

		err := trigger.Fire(ctx, params, emit)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "competencyID")
	})

	t.Run("NonExistentEmployee", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "NONEXISTENT",
			"competencyID":   int32(1),
			"action":         "created",
		}

		ctx := context.Background()
		emit := func(evalCtx EvalContext) error {
			return nil
		}

		err := trigger.Fire(ctx, params, emit)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "employee not found")
	})

	t.Run("NonExistentCompetency", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP001",
			"competencyID":   int32(999),
			"action":         "created",
		}

		ctx := context.Background()
		emit := func(evalCtx EvalContext) error {
			return nil
		}

		err := trigger.Fire(ctx, params, emit)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "competency not found")
	})

	t.Run("CompetencyIDAsFloat", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP001",
			"competencyID":   float64(1), // Test float64 conversion
			"action":         "created",
		}

		ctx := context.Background()
		fired := false
		emit := func(evalCtx EvalContext) error {
			fired = true
			return nil
		}

		err := trigger.Fire(ctx, params, emit)
		assert.NoError(t, err)
		assert.True(t, fired)
	})
}

func TestNewHireTrigger_Fire(t *testing.T) {
	db := setupTestDatabase()
	trigger := &NewHireTrigger{DB: db}

	t.Run("ValidNewHire", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "EMP001",
		}

		ctx := context.Background()
		fired := false
		emit := func(evalCtx EvalContext) error {
			fired = true
			return nil
		}

		err := trigger.Fire(ctx, params, emit)
		assert.NoError(t, err)
		assert.True(t, fired)
	})

	t.Run("MissingEmployeeNumber", func(t *testing.T) {
		params := map[string]any{}

		ctx := context.Background()
		emit := func(evalCtx EvalContext) error {
			return nil
		}

		err := trigger.Fire(ctx, params, emit)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "employeeNumber")
	})

	t.Run("NonExistentEmployee", func(t *testing.T) {
		params := map[string]any{
			"employeeNumber": "NONEXISTENT",
		}

		ctx := context.Background()
		emit := func(evalCtx EvalContext) error {
			return nil
		}

		err := trigger.Fire(ctx, params, emit)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "employee not found")
	})
}

func TestScheduledCompetencyCheckTrigger_Fire(t *testing.T) {
	db := setupTestDatabase()
	trigger := &ScheduledCompetencyCheckTrigger{DB: db}

	t.Run("ValidScheduledCheck", func(t *testing.T) {
		ctx := context.Background()
		fired := false
		emit := func(evalCtx EvalContext) error {
			fired = true
			return nil
		}

		err := trigger.Fire(ctx, map[string]any{}, emit)
		assert.NoError(t, err)
		assert.True(t, fired)
	})

	t.Run("ScheduledCheckWithParams", func(t *testing.T) {
		// Scheduled checks should work even with unexpected parameters
		ctx := context.Background()
		fired := false
		emit := func(evalCtx EvalContext) error {
			fired = true
			return nil
		}

		err := trigger.Fire(ctx, map[string]any{"some_param": "some_value"}, emit)
		assert.NoError(t, err)
		assert.True(t, fired)
	})
}
