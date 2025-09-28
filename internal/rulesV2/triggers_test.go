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

func newTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	return db
}

func TestDBTrigger_Fire_BasicKinds(t *testing.T) {
	db := newTestDB(t)
	type tc struct {
		kind   string
		params map[string]any
		expect map[string]any
	}
	cases := []tc{
		{kind: "job_position", params: map[string]any{"operation": "create"}, expect: map[string]any{"type": "job_position", "operation": "create"}},
		{kind: "competency_type", params: map[string]any{"operation": "update"}, expect: map[string]any{"type": "competency_type", "operation": "update"}},
		{kind: "competency", params: map[string]any{"operation": "deactivate"}, expect: map[string]any{"type": "competency", "operation": "deactivate"}},
		{kind: "event_definition", params: map[string]any{"operation": "update"}, expect: map[string]any{"type": "event_definition", "operation": "update"}},
		{kind: "link_job_to_competency", params: map[string]any{"operation": "add"}, expect: map[string]any{"type": "link_job_to_competency", "operation": "add"}},
		{kind: "competency_prerequisite", params: map[string]any{"operation": "remove"}, expect: map[string]any{"type": "competency_prerequisite", "operation": "remove"}},
	}
	for _, c := range cases {
		tr := NewTrigger(db, c.kind)
		var got EvalContext
		err := tr.Fire(context.Background(), c.params, func(ev EvalContext) error { got = ev; return nil })
		require.NoError(t, err)
		require.False(t, got.Now.IsZero())
		trg, ok := got.Data["trigger"].(map[string]any)
		require.True(t, ok, "trigger payload should be a map")
		for k, v := range c.expect {
			require.Equal(t, v, trg[k])
		}
	}
}

func TestDBTrigger_Fire_ScheduledEvent_And_Roles(t *testing.T) {
	db := newTestDB(t)

	// scheduled_event with update_field -> updateField
	{
		tr := NewTrigger(db, "scheduled_event")
		var got EvalContext
		params := map[string]any{"operation": "update", "update_field": "StatusName"}
		require.NoError(t, tr.Fire(context.Background(), params, func(ev EvalContext) error { got = ev; return nil }))
		trg, ok := got.Data["trigger"].(map[string]any)
		require.True(t, ok)
		require.Equal(t, "scheduled_event", trg["type"])
		require.Equal(t, "update", trg["operation"])
		require.Equal(t, "StatusName", trg["updateField"])
	}

	// scheduled_event without update_field -> updateField omitted
	{
		tr := NewTrigger(db, "scheduled_event")
		var got EvalContext
		params := map[string]any{"operation": "create"}
		require.NoError(t, tr.Fire(context.Background(), params, func(ev EvalContext) error { got = ev; return nil }))
		trg, ok := got.Data["trigger"].(map[string]any)
		require.True(t, ok)
		require.Equal(t, "scheduled_event", trg["type"])
		require.Equal(t, "create", trg["operation"])
		_, has := trg["updateField"]
		require.False(t, has, "updateField should be omitted when not provided")
	}

	// roles with update_kind -> updateKind
	{
		tr := NewTrigger(db, "roles")
		var got EvalContext
		params := map[string]any{"operation": "update", "update_kind": "permissions"}
		require.NoError(t, tr.Fire(context.Background(), params, func(ev EvalContext) error { got = ev; return nil }))
		trg, ok := got.Data["trigger"].(map[string]any)
		require.True(t, ok)
		require.Equal(t, "roles", trg["type"])
		require.Equal(t, "update", trg["operation"])
		require.Equal(t, "permissions", trg["updateKind"])
	}

	// roles without update_kind -> updateKind omitted
	{
		tr := NewTrigger(db, "roles")
		var got EvalContext
		params := map[string]any{"operation": "create"}
		require.NoError(t, tr.Fire(context.Background(), params, func(ev EvalContext) error { got = ev; return nil }))
		trg, ok := got.Data["trigger"].(map[string]any)
		require.True(t, ok)
		require.Equal(t, "roles", trg["type"])
		require.Equal(t, "create", trg["operation"])
		_, has := trg["updateKind"]
		require.False(t, has, "updateKind should be omitted when not provided")
	}
}

func TestTrigger_EmitTimeIsRecent(t *testing.T) {
	db := newTestDB(t)
	tr := NewTrigger(db, "scheduled_event")
	var got EvalContext
	err := tr.Fire(context.Background(), map[string]any{"operation": "create"}, func(ev EvalContext) error {
		got = ev
		return nil
	})
	require.NoError(t, err)
	require.False(t, got.Now.IsZero())
	require.WithinDuration(t, time.Now(), got.Now, time.Second*2)
}
