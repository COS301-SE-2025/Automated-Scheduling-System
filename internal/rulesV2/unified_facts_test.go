//go:build unit

package rulesv2

import (
    "testing"

    "github.com/stretchr/testify/require"
)

func TestUnifiedFacts_EventHelpers(t *testing.T) {
    uf := UnifiedFacts{}
    ev := EvalContext{
        Data: map[string]any{
            "trigger": map[string]any{
                "type":        "roles",
                "operation":   "update",
                "update_kind": "permissions",
                "action":      "apply",
            },
        },
    }

    v, handled, err := uf.Resolve(ev, "event.Operation")
    require.NoError(t, err)
    require.True(t, handled)
    require.Equal(t, "update", v)

    v, handled, err = uf.Resolve(ev, "event.UpdateKind")
    require.NoError(t, err)
    require.True(t, handled)
    require.Equal(t, "permissions", v)

    v, handled, err = uf.Resolve(ev, "event.Action")
    require.NoError(t, err)
    require.True(t, handled)
    require.Equal(t, "apply", v)
}

func TestUnifiedFacts_Passthrough_MapResolution(t *testing.T) {
    uf := UnifiedFacts{}
    ev := EvalContext{
        Data: map[string]any{
            "employee": map[string]any{
                "EmployeeStatus": "Active",
                "EmployeeNumber": "E-123",
            },
        },
    }

    // Basic passthrough
    v, handled, err := uf.Resolve(ev, "employee.EmployeeStatus")
    require.NoError(t, err)
    require.True(t, handled)
    require.Equal(t, "Active", v)

    v, handled, err = uf.Resolve(ev, "employee.EmployeeNumber")
    require.NoError(t, err)
    require.True(t, handled)
    require.Equal(t, "E-123", v)
}

func TestUnifiedFacts_CaseInsensitiveTopKey(t *testing.T) {
    uf := UnifiedFacts{}
    ev := EvalContext{
        Data: map[string]any{
            "scheduledEvent": map[string]any{
                "Title": "Safety Training",
            },
        },
    }

    // Top-level key uses scheduledEvent, path uses scheduledEvent (exact)
    v, handled, err := uf.Resolve(ev, "scheduledEvent.Title")
    require.NoError(t, err)
    require.True(t, handled)
    require.Equal(t, "Safety Training", v)

    // Top-level key lookup is case-insensitive
    v, handled, err = uf.Resolve(ev, "ScheduledEvent.Title")
    require.NoError(t, err)
    require.True(t, handled)
    require.Equal(t, "Safety Training", v)
}

func TestUnifiedFacts_UnknownTop_ReturnsFalse(t *testing.T) {
    uf := UnifiedFacts{}
    ev := EvalContext{
        Data: map[string]any{
            "employee": map[string]any{"EmployeeStatus": "Active"},
        },
    }

    v, handled, err := uf.Resolve(ev, "competency.Name")
    require.NoError(t, err)
    require.False(t, handled)
    require.Nil(t, v)
}