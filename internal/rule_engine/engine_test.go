package rules

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func mustParse(t *testing.T, s string) time.Time {
	tm, err := time.Parse(time.RFC3339, s)
	require.NoError(t, err)
	return tm
}

/* ------------------------------------------------------------------------- */
/* 1. CooldownRule.Validate                                                  */
/* ------------------------------------------------------------------------- */

func TestCooldownRule(t *testing.T) {
	rule := &CooldownRule{id: "cd", enabled: true, days: 30, checkType: "vision"}

	// Existing check 31 days ago → OK
	oldCheck := mustParse(t, "2025-05-01T12:00:00Z")
	now      := mustParse(t, "2025-06-01T12:00:00Z")
	sched := Schedule{Checks: []MedicalCheck{
		{UserID: "u1", CheckType: "vision", StartTime: oldCheck},
	}}

	err := rule.Validate(
		MedicalCheck{UserID: "u1", CheckType: "vision", StartTime: now},
		sched, User{})
	require.NoError(t, err)

	// Same scenario but only 10 days gap → expect error
	sched.Checks[0].StartTime = mustParse(t, "2025-05-22T12:00:00Z")
	err = rule.Validate(
		MedicalCheck{UserID: "u1", CheckType: "vision", StartTime: now},
		sched, User{})
	require.Error(t, err)
}

/* ------------------------------------------------------------------------- */
/* 2. RecurringCheckRule.ShouldTrigger + Execute                             */
/* ------------------------------------------------------------------------- */

func TestRecurringCheckRule(t *testing.T) {
    rule := &RecurringCheckRule{
        id:               "rc",
        enabled:          true,
        frequencyMonths:  6,
        notifyDaysBefore: 7,
        checkType:        "hearing",
        lastRun:          make(map[string]time.Time),
    }
    user := User{ID: "u42"}
    now  := mustParse(t, "2025-01-01T00:00:00Z")

    require.True(t, rule.ShouldTrigger(now, user), "first run should trigger")

    // Simulate a run
    require.NoError(t, rule.Execute(now, user, func(MedicalCheck) error { return nil },
        func(Notification) error { return nil }))

    // 3 months later – should NOT trigger
    later := now.AddDate(0, 3, 0)
    require.False(t, rule.ShouldTrigger(later, user))

    // 7 months later – should trigger again
    later = now.AddDate(0, 7, 0)
    require.True(t, rule.ShouldTrigger(later, user))
}
/* ------------------------------------------------------------------------- */
/* 3. Factory: JSON -> RawRule -> BuildRule                                  */
/* ------------------------------------------------------------------------- */

func TestFactory(t *testing.T) {
	raw := `[{
		"id":"cool1",
		"type":"cooldown",
		"enabled":true,
		"params":{"days":15,"checkType":"blood"}
	}]`
	var rr []RawRule
	require.NoError(t, json.Unmarshal([]byte(raw), &rr))

	r, err := BuildRule(rr[0])
	require.NoError(t, err)
	require.IsType(t, &CooldownRule{}, r)
}

/* ------------------------------------------------------------------------- */
/* 4. Engine integration                                                     */
/* ------------------------------------------------------------------------- */

func TestEngineEndToEnd(t *testing.T) {
	// One cooldown + one recurring
	cd := &CooldownRule{id: "cd", enabled: true, days: 10, checkType: "vision"}
	rc := &RecurringCheckRule{
		id:              "rc",
		enabled:         true,
		frequencyMonths: 1,
		checkType:       "vision",
		lastRun:         make(map[string]time.Time),
	}

	engine := NewEngine([]Rule{cd, rc})

	// User + initial schedule
	user := User{ID: "u1"}
	sched := Schedule{}

	// propose first check – should pass
	proposed := MedicalCheck{UserID: "u1", CheckType: "vision",
		StartTime: mustParse(t, "2025-01-01T09:00:00Z")}
	require.Empty(t, engine.ValidateCheck(proposed, sched, user))

	// add it to schedule
	sched.Checks = append(sched.Checks, proposed)

	// propose another 3 days later – should fail cooldown
	bad := proposed
	bad.StartTime = mustParse(t, "2025-01-04T09:00:00Z")
	violations := engine.ValidateCheck(bad, sched, user)
	require.Len(t, violations, 1)

	// run scheduler a month later: should create a new check
	now := mustParse(t, "2025-02-01T00:00:00Z")
	var generated []MedicalCheck
	var notified []Notification

	engine.RunScheduled(now, []User{user},
		func(mc MedicalCheck) error { generated = append(generated, mc); return nil },
		func(n Notification) error { notified = append(notified, n); return nil })

	require.Len(t, generated, 1)
	require.Len(t, notified, 1)
	require.Equal(t, "vision", generated[0].CheckType)
}
/* ------------------------------------------------------------------------- */
/* 5. ActionRule basic behaviour                                             */
/* ------------------------------------------------------------------------- */
type stubNotifier func(string, string) error

func (f stubNotifier) Send(u, m string) error { return f(u, m) }

// variables the stub will capture (must be package-level)
var gotUser, gotMsg string

func TestActionRule_Notify(t *testing.T) {
	// 1. register stub notifier
	RegisterNotifier(stubNotifier(func(u, m string) error {
		gotUser, gotMsg = u, m
		return nil
	}))
	defer RegisterNotifier(nil) // clean up for other tests

	// 2. build the Action rule
	raw := RawRule{
		ID:      "demo",
		Type:    "action",
		Enabled: true,
		When:    "user.role == 'driver' && check['checkType'] == 'vision'",		
        Actions: []RawAction{{
			Type:   "notify",
			Params: map[string]any{"message": "Time for your eye test"},
		}},
	}
	rule, err := BuildRule(raw)
	require.NoError(t, err)
	ar := rule.(*ActionRule)

	// 3a. condition FALSE – notifier should NOT be called
	check1 := MedicalCheck{CheckType: "vision"}
	user1  := User{ID: "u1", Role: "admin"}

	require.NoError(t, ar.Validate(check1, Schedule{}, user1))
	require.Equal(t, "", gotUser)

	// 3b. condition TRUE – notifier should be called
	check2 := MedicalCheck{CheckType: "vision"}
	user2  := User{ID: "u2", Role: "driver"}

	require.NoError(t, ar.Validate(check2, Schedule{}, user2))
	require.Equal(t, "u2", gotUser)
	require.Equal(t, "Time for your eye test", gotMsg)
}
