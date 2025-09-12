package rulesv2

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// DBTrigger is a single implementation that covers all trigger kinds.
// Kind is one of: job_position, competency_type, competency, event_definition,
// scheduled_event, roles, link_job_to_competency, competency_prerequisite.
type DBTrigger struct {
	DB   *gorm.DB
	Kind string
}

// NewTrigger constructs a generic trigger for a given kind.
func NewTrigger(db *gorm.DB, kind string) *DBTrigger {
	return &DBTrigger{DB: db, Kind: kind}
}

// Fire emits an EvalContext with a normalized trigger payload.
// It always includes: type and operation (if provided).
// For scheduled_event it also includes updateField (if provided).
// For roles it also includes updateKind (if provided).
func (t *DBTrigger) Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error {
	op, _ := params["operation"].(string)
	updateField, _ := params["update_field"].(string) // scheduled_event only
	updateKind, _ := params["update_kind"].(string)   // roles only

	payload := map[string]any{
		"type":      t.Kind,
		"operation": op,
	}

	// Add kind-specific extras
	switch t.Kind {
	case "scheduled_event":
		if updateField != "" {
			payload["updateField"] = updateField
		}
	case "roles":
		if updateKind != "" {
			payload["updateKind"] = updateKind
		}
	}

	evalCtx := EvalContext{
		Now: time.Now(),
		Data: map[string]any{
			"trigger": payload,
		},
	}
	return emit(evalCtx)
}
