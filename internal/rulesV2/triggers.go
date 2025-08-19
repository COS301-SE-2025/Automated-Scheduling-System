package rulesv2

import (
	"context"
	"fmt"
	"time"

	"Automated-Scheduling-Project/internal/database/gen_models"

	"gorm.io/gorm"
)

// ScheduledCompetencyCheckTrigger handles scheduled competency evaluations
type ScheduledCompetencyCheckTrigger struct {
	DB *gorm.DB
}

func (t *ScheduledCompetencyCheckTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	intervalDays, _ := params["intervalDays"].(int)
	if intervalDays == 0 {
		intervalDays = 1 // Default to daily checks
	}

	// Find employees with competencies expiring soon or events overdue
	var employees []gen_models.Employee
	if err := t.DB.Where("employeestatus = ?", "Active").Find(&employees).Error; err != nil {
		return fmt.Errorf("failed to get employees: %w", err)
	}

	// For scheduled checks, we'll evaluate against the first active employee
	// In a real implementation, this would iterate through all employees
	if len(employees) == 0 {
		return fmt.Errorf("no active employees found")
	}

	employee := employees[0]

	// Get competencies for this employee
	var competencies []gen_models.CompetencyDefinition
	if err := t.DB.Joins("JOIN custom_job_matrices ON custom_job_matrices.competency_id = competency_definitions.competency_id").
		Where("custom_job_matrices.employee_number = ?", employee.Employeenumber).
		Find(&competencies).Error; err != nil {
		return fmt.Errorf("failed to get competencies: %w", err)
	}

	// Get recent events for this employee
	var events []gen_models.Event
	if err := t.DB.Where("relevant_parties LIKE ? AND start_time <= ?",
		"%"+employee.Employeenumber+"%", time.Now().AddDate(0, 0, intervalDays)).
		Order("start_time DESC").
		Limit(10).
		Find(&events).Error; err != nil {
		return fmt.Errorf("failed to get events: %w", err)
	}

	// Use first competency and event for evaluation
	var competency *gen_models.CompetencyDefinition
	var event *gen_models.Event

	if len(competencies) > 0 {
		competency = &competencies[0]
	}
	if len(events) > 0 {
		event = &events[0]
	}

	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"employee":   employee,
			"competency": competency,
			"jobMatrix":  nil,
			"event":      event,
			"trigger": map[string]any{
				"intervalDays": intervalDays,
				"checkDate":    time.Now(),
			},
		},
	}

	return emit(evalCtx)
}

// NewHireTrigger handles new employee onboarding events
type NewHireTrigger struct {
	DB *gorm.DB
}

func (t *NewHireTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	employeeNumber, ok := params["employeeNumber"].(string)
	if !ok {
		return fmt.Errorf("employeeNumber is required")
	}

	// Get employee data
	var employee gen_models.Employee
	if err := t.DB.Where("employeenumber = ?", employeeNumber).First(&employee).Error; err != nil {
		return fmt.Errorf("employee not found: %w", err)
	}

	// Get basic competency (ID 1 - Basic Safety)
	var competency gen_models.CompetencyDefinition
	if err := t.DB.Where("competency_id = ?", 1).First(&competency).Error; err != nil {
		// If basic competency doesn't exist, create a minimal one
		competency = gen_models.CompetencyDefinition{
			CompetencyID:   1,
			CompetencyName: "Basic Safety",
		}
	}

	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"employee":   employee,
			"competency": competency,
			"jobMatrix":  nil,
			"event":      nil,
			"trigger": map[string]any{
				"employeeNumber": employeeNumber,
				"hireDate":       time.Now(), // Use current time as hire date
			},
		},
	}

	return emit(evalCtx)
}

// Declare trigger types used by the registry and Fire methods
type JobPositionTrigger struct {
	DB *gorm.DB
}

type CompetencyTypeTrigger struct {
	DB *gorm.DB
}

type CompetencyTrigger struct {
	DB *gorm.DB
}

type EventDefinitionTrigger struct {
	DB *gorm.DB
}

type ScheduledEventTrigger struct {
	DB *gorm.DB
}

type RolesTrigger struct {
	DB *gorm.DB
}

// JobPositionTrigger: now only operation
func (t *JobPositionTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string)
	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"trigger": map[string]any{
				"type":      "job_position",
				"operation": op,
			},
		},
	}
	return emit(evalCtx)
}

// CompetencyTypeTrigger: now only operation
func (t *CompetencyTypeTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string)
	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"trigger": map[string]any{
				"type":      "competency_type",
				"operation": op,
			},
		},
	}
	return emit(evalCtx)
}

// CompetencyTrigger: only create|update|deactivate|reactivate
func (t *CompetencyTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string)
	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"trigger": map[string]any{
				"type":      "competency",
				"operation": op,
			},
		},
	}
	return emit(evalCtx)
}

// EventDefinitionTrigger: only operation
func (t *EventDefinitionTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string)
	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"trigger": map[string]any{
				"type":      "event_definition",
				"operation": op,
			},
		},
	}
	return emit(evalCtx)
}

// ScheduledEventTrigger: operation + update_field
func (t *ScheduledEventTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string)
	updateField, _ := params["update_field"].(string)
	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"trigger": map[string]any{
				"type":        "scheduled_event",
				"operation":   op,
				"updateField": updateField,
			},
		},
	}
	return emit(evalCtx)
}

// RolesTrigger: operation + update_kind
func (t *RolesTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string)
	kind, _ := params["update_kind"].(string)
	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"trigger": map[string]any{
				"type":       "roles",
				"operation":  op,
				"updateKind": kind,
			},
		},
	}
	return emit(evalCtx)
}

// New: LinkJobToCompetencyTrigger
type LinkJobToCompetencyTrigger struct {
	DB *gorm.DB
}

func (t *LinkJobToCompetencyTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string) // add|deactivate|reactivate
	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"trigger": map[string]any{
				"type":      "link_job_to_competency",
				"operation": op,
			},
		},
	}
	return emit(evalCtx)
}

// New: CompetencyPrerequisiteTrigger
type CompetencyPrerequisiteTrigger struct {
	DB *gorm.DB
}

func (t *CompetencyPrerequisiteTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string) // add|remove
	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"trigger": map[string]any{
				"type":      "competency_prerequisite",
				"operation": op,
			},
		},
	}
	return emit(evalCtx)
}
