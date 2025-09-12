package rulesv2

import (
	"context"
	"time"

	"gorm.io/gorm"
)

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

type LinkJobToCompetencyTrigger struct {
	DB *gorm.DB
}

type CompetencyPrerequisiteTrigger struct {
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

func (t *LinkJobToCompetencyTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string) // add|remove
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
