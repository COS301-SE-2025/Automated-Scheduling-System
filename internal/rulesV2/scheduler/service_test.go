//go:build unit

package scheduler

import (
    "testing"

    "github.com/stretchr/testify/assert"
)

func TestService_ScheduleAndUnschedule(t *testing.T) {
    // Dummy eval that increments a counter
    calls := 0
    eval := func(ev EvalContext, rule any) error {
        calls++
        return nil
    }

    s := New(nil, nil, eval)
    // Do not start cron; we only test registration bookkeeping.

    params := map[string]any{
        "frequency":      "hourly",
        "minute_of_hour": 0,
    }

    // Schedule
    err := s.ScheduleFixedRule("rule-1", "test-hourly", params, nil)
    assert.NoError(t, err)
    if assert.Contains(t, s.fixedIDs, "rule-1") {
        firstID := s.fixedIDs["rule-1"]

        // Reschedule with a different minute; should replace the entry
        params["minute_of_hour"] = 15
        err = s.ScheduleFixedRule("rule-1", "test-hourly", params, nil)
        assert.NoError(t, err)
        if assert.Contains(t, s.fixedIDs, "rule-1") {
            secondID := s.fixedIDs["rule-1"]
            assert.NotEqual(t, firstID, secondID, "cron entry should be replaced on reschedule")
        }
    }

    // Unschedule
    s.UnscheduleFixedRule("rule-1")
    assert.NotContains(t, s.fixedIDs, "rule-1")
}