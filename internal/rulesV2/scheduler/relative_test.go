//go:build unit

package scheduler

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
)

// fakeStore lets us control the rules returned to tickRelative.
type fakeStore struct {
    rules []Rule
    err   error
}

func (f *fakeStore) ListByTrigger(ctx context.Context, triggerType string) ([]Rule, error) {
    return f.rules, f.err
}

func TestEvalRelativeScheduledEvent_UnknownField(t *testing.T) {
    s := New(nil, nil, func(EvalContext, any) error { return nil })
    err := s.evalRelativeScheduledEvent(context.Background(), time.Now().UTC(), time.Minute, time.Minute, "before", "not_a_field", Rule{})
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "unknown date_field")
}

func TestEvalRelativeEmployeeCompetency_UnknownField(t *testing.T) {
    s := New(nil, nil, func(EvalContext, any) error { return nil })
    err := s.evalRelativeEmployeeCompetency(context.Background(), time.Now().UTC(), time.Minute, time.Minute, "before", "not_a_field", Rule{})
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "unknown date_field")
}

func TestEvalRelativeEmployee_UnknownField(t *testing.T) {
    s := New(nil, nil, func(EvalContext, any) error { return nil })
    // Any non-termination date field should error
    err := s.evalRelativeEmployee(context.Background(), time.Now().UTC(), time.Minute, time.Minute, "after", "hire_date", Rule{})
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "unknown date_field")
}

func TestEvalRelativeEmploymentHistory_UnknownField(t *testing.T) {
    s := New(nil, nil, func(EvalContext, any) error { return nil })
    err := s.evalRelativeEmploymentHistory(context.Background(), time.Now().UTC(), time.Minute, time.Minute, "after", "finish_date", Rule{})
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "unknown date_field")
}

func TestTickRelative_MissingParams_NoPanic(t *testing.T) {
    s := New(nil, &fakeStore{
        rules: []Rule{
            // Missing several params -> should be skipped without panic
            {ID: "1", Name: "bad1", Trigger: TriggerSpec{Type: "relative_time", Parameters: map[string]any{
                "entity_type": "employee",
                // no date_field, offset_direction, etc.
            }}},
        },
    }, func(EvalContext, any) error { return nil })

    // Should not panic
    s.tickRelative(context.Background(), time.Now().UTC(), time.Minute)
}

func TestTickRelative_RoutesByEntity_UnknownField_NoPanic(t *testing.T) {
    now := time.Now().UTC()
    window := time.Minute

    tests := []struct {
        name   string
        params map[string]any
    }{
        {
            name: "scheduled_event invalid date_field",
            params: map[string]any{
                "entity_type":      "scheduled_event",
                "date_field":       "not_a_field",
                "offset_direction": "before",
                "offset_value":     5,
                "offset_unit":      "minutes",
            },
        },
        {
            name: "employee_competency invalid date_field",
            params: map[string]any{
                "entity_type":      "employee_competency",
                "date_field":       "not_a_field",
                "offset_direction": "before",
                "offset_value":     "10",
                "offset_unit":      "days",
            },
        },
        {
            name: "employee invalid date_field",
            params: map[string]any{
                "entity_type":      "employee",
                "date_field":       "hire_date",
                "offset_direction": "after",
                "offset_value":     1,
                "offset_unit":      "hours",
            },
        },
        {
            name: "employment_history invalid date_field",
            params: map[string]any{
                "entity_type":      "employment_history",
                "date_field":       "finish_date",
                "offset_direction": "after",
                "offset_value":     2,
                "offset_unit":      "weeks",
            },
        },
        {
            name: "unsupported entity",
            params: map[string]any{
                "entity_type":      "unknown_entity",
                "date_field":       "whatever",
                "offset_direction": "after",
                "offset_value":     1,
                "offset_unit":      "minutes",
            },
        },
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            calls := 0
            s := New(nil, &fakeStore{
                rules: []Rule{
                    {ID: "r", Name: "r", Trigger: TriggerSpec{
                        Type:       "relative_time",
                        Parameters: tc.params,
                    }},
                },
            }, func(EvalContext, any) error {
                calls++
                return nil
            })

            // Should not panic; since date_field invalid (or unsupported entity), eval should not be called.
            s.tickRelative(context.Background(), now, window)
            assert.Equal(t, 0, calls)
        })
    }
}