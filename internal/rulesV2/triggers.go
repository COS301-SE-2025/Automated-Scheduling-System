package rulesv2

import (
	"context"
	"fmt"
	"time"

	"Automated-Scheduling-Project/internal/database/gen_models"

	"gorm.io/gorm"
)

// JobMatrixTrigger handles job matrix update events
type JobMatrixTrigger struct {
	DB *gorm.DB
}

func (t *JobMatrixTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	employeeNumber, ok := params["employeeNumber"].(string)
	if !ok {
		return fmt.Errorf("employeeNumber is required")
	}

	competencyID, ok := params["competencyID"].(int32)
	if !ok {
		// Try to convert from float64 (JSON unmarshaling)
		if f, ok := params["competencyID"].(float64); ok {
			competencyID = int32(f)
		} else {
			return fmt.Errorf("competencyID is required")
		}
	}

	action, _ := params["action"].(string)

	// Get employee data
	var employee gen_models.Employee
	if err := t.DB.Where("employeenumber = ?", employeeNumber).First(&employee).Error; err != nil {
		return fmt.Errorf("employee not found: %w", err)
	}

	// Get competency data
	var competency gen_models.CompetencyDefinition
	if err := t.DB.Where("competency_id = ?", competencyID).First(&competency).Error; err != nil {
		return fmt.Errorf("competency not found: %w", err)
	}

	// Get job matrix entry
	var jobMatrix gen_models.CustomJobMatrix
	if err := t.DB.Where("employee_number = ? AND competency_id = ?",
		employeeNumber, competencyID).First(&jobMatrix).Error; err != nil {
		// If not found, create minimal data for evaluation
		jobMatrix = gen_models.CustomJobMatrix{
			EmployeeNumber:     employeeNumber,
			CompetencyID:       competencyID,
			RequirementStatus:  "Unknown",
			PositionMatrixCode: "DEFAULT",
		}
	}

	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"employee":   employee,
			"competency": competency,
			"jobMatrix":  jobMatrix,
			"event":      nil,
			"trigger": map[string]any{
				"action":         action,
				"employeeNumber": employeeNumber,
				"competencyID":   competencyID,
			},
		},
	}

	return emit(evalCtx)
}

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
