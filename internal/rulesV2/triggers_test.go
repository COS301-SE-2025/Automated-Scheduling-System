//go:build unit

package rulesv2

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// minimal DB setup for triggers (no schema needed as current triggers don't query DB)
func newTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	return db
}

func TestJobPositionTrigger_Fire(t *testing.T) {
	db := newTestDB(t)
	tr := &JobPositionTrigger{DB: db}

	var got EvalContext
	count := 0
	err := tr.Fire(context.Background(), map[string]any{"operation": "create"}, func(ev EvalContext) error {
		count++
		got = ev
		return nil
	})
	require.NoError(t, err)
	require.Equal(t, 1, count)
	require.False(t, got.Now.IsZero())
	trg, ok := got.Data["trigger"].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "job_position", trg["type"])
	require.Equal(t, "create", trg["operation"])
}

func TestCompetencyTypeTrigger_Fire(t *testing.T) {
	db := newTestDB(t)
	tr := &CompetencyTypeTrigger{DB: db}

	var got EvalContext
	err := tr.Fire(context.Background(), map[string]any{"operation": "update"}, func(ev EvalContext) error {
		got = ev
		return nil
	})
	require.NoError(t, err)
	trg := got.Data["trigger"].(map[string]any)
	require.Equal(t, "competency_type", trg["type"])
	require.Equal(t, "update", trg["operation"])
}

func TestCompetencyTrigger_Fire(t *testing.T) {
	db := newTestDB(t)
	tr := &CompetencyTrigger{DB: db}

	var got EvalContext
	err := tr.Fire(context.Background(), map[string]any{"operation": "deactivate"}, func(ev EvalContext) error {
		got = ev
		return nil
	})
	require.NoError(t, err)
	trg := got.Data["trigger"].(map[string]any)
	require.Equal(t, "competency", trg["type"])
	require.Equal(t, "deactivate", trg["operation"])
}

func TestEventDefinitionTrigger_Fire(t *testing.T) {
	db := newTestDB(t)
	tr := &EventDefinitionTrigger{DB: db}

	var got EvalContext
	err := tr.Fire(context.Background(), map[string]any{"operation": "update"}, func(ev EvalContext) error {
		got = ev
		return nil
	})
	require.NoError(t, err)
	trg := got.Data["trigger"].(map[string]any)
	require.Equal(t, "event_definition", trg["type"])
	require.Equal(t, "update", trg["operation"])
}

func TestScheduledEventTrigger_Fire(t *testing.T) {
	db := newTestDB(t)
	tr := &ScheduledEventTrigger{DB: db}

	var got EvalContext
	params := map[string]any{
		"operation":    "update",
		"update_field": "StatusName",
	}
	err := tr.Fire(context.Background(), params, func(ev EvalContext) error {
		got = ev
		return nil
	})
	require.NoError(t, err)
	trg := got.Data["trigger"].(map[string]any)
	require.Equal(t, "scheduled_event", trg["type"])
	require.Equal(t, "update", trg["operation"])
	require.Equal(t, "StatusName", trg["updateField"])
}

func TestRolesTrigger_Fire(t *testing.T) {
	db := newTestDB(t)
	tr := &RolesTrigger{DB: db}

	var got EvalContext
	params := map[string]any{
		"operation":   "update",
		"update_kind": "permissions",
	}
	err := tr.Fire(context.Background(), params, func(ev EvalContext) error {
		got = ev
		return nil
	})
	require.NoError(t, err)
	trg := got.Data["trigger"].(map[string]any)
	require.Equal(t, "roles", trg["type"])
	require.Equal(t, "update", trg["operation"])
	require.Equal(t, "permissions", trg["updateKind"])
}

func TestLinkJobToCompetencyTrigger_Fire(t *testing.T) {
	db := newTestDB(t)
	tr := &LinkJobToCompetencyTrigger{DB: db}

	var got EvalContext
	err := tr.Fire(context.Background(), map[string]any{"operation": "add"}, func(ev EvalContext) error {
		got = ev
		return nil
	})
	require.NoError(t, err)
	trg := got.Data["trigger"].(map[string]any)
	require.Equal(t, "link_job_to_competency", trg["type"])
	require.Equal(t, "add", trg["operation"])
}

func TestCompetencyPrerequisiteTrigger_Fire(t *testing.T) {
	db := newTestDB(t)
	tr := &CompetencyPrerequisiteTrigger{DB: db}

	var got EvalContext
	err := tr.Fire(context.Background(), map[string]any{"operation": "remove"}, func(ev EvalContext) error {
		got = ev
		return nil
	})
	require.NoError(t, err)
	trg := got.Data["trigger"].(map[string]any)
	require.Equal(t, "competency_prerequisite", trg["type"])
	require.Equal(t, "remove", trg["operation"])
}

func TestTrigger_EmitTimeIsUTCOrValid(t *testing.T) {
	// Sanity: Now is set; we don't enforce UTC here, but ensure it's within a sane range.
	db := newTestDB(t)
	tr := &ScheduledEventTrigger{DB: db}
	var got EvalContext
	err := tr.Fire(context.Background(), map[string]any{"operation": "create"}, func(ev EvalContext) error {
		got = ev
		return nil
	})
	require.NoError(t, err)
	require.False(t, got.Now.IsZero())
	require.WithinDuration(t, time.Now(), got.Now, time.Second*2)
}
