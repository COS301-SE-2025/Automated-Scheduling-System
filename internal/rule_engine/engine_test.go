package rules

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
    "Automated-Scheduling-Project/internal/database/gen_models"
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
	rule := &CooldownRule{
		id: "cd", 
		enabled: true, 
		days: 30, 
		checkType: "vision",
		description: "Vision check cooldown of 30 days",
		target: "all",
	}

	// Test new interface methods
	require.Equal(t, "Vision check cooldown of 30 days", rule.Description())
	require.True(t, rule.TargetsUser(gen_models.User{ID: 1, Role: "driver"}))

	// Existing check 31 days ago → OK
	oldCheck := mustParse(t, "2025-05-01T12:00:00Z")
	now      := mustParse(t, "2025-06-01T12:00:00Z")
	sched := Schedule{Checks: []MedicalCheck{
		{UserID: 1, CheckType: "vision", StartTime: oldCheck},
	}}

	err := rule.Validate(
		MedicalCheck{UserID: 1, CheckType: "vision", StartTime: now},
		sched, gen_models.User{})
	require.NoError(t, err)

	// Same scenario but only 10 days gap → expect error
	sched.Checks[0].StartTime = mustParse(t, "2025-05-22T12:00:00Z")
	err = rule.Validate(
		MedicalCheck{UserID: 1, CheckType: "vision", StartTime: now},
		sched, gen_models.User{})
	require.Error(t, err)
}

/* ------------------------------------------------------------------------- */
/* 2. RecurringCheckRule.ShouldTrigger + Execute                             */
/* ------------------------------------------------------------------------- */

func TestRecurringCheckRule(t *testing.T) {
    rule := &RecurringCheckRule{
        id:               "rc",
        enabled:          true,
        description:      "Hearing check every 6 months",
        target:           "all",
        frequency:        Period{Months: 6},
        notifyDaysBefore: 7,
        checkType:        "hearing",
        lastRun:          make(map[int64]time.Time),
    }
    user := gen_models.User{ID: 42}
    now  := mustParse(t, "2025-01-01T00:00:00Z")

    // Test new interface methods
    require.Equal(t, "Hearing check every 6 months", rule.Description())
    require.True(t, rule.TargetsUser(user))

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
/* 3. Build Rule: JSON -> RawRule -> BuildRule                                  */
/* ------------------------------------------------------------------------- */

func TestBuildRule(t *testing.T) {
	raw := `[{
		"id":"cool1",
		"type":"cooldown",
		"enabled":true,
		"description":"Blood test cooldown",
		"target":"all",
		"params":{"days":15,"checkType":"blood"}
	}]`
	var rr []RawRule
	require.NoError(t, json.Unmarshal([]byte(raw), &rr))

	r, err := BuildRule(rr[0])
	require.NoError(t, err)
	require.IsType(t, &CooldownRule{}, r)
	
	// Test interface methods
	require.Equal(t, "Blood test cooldown", r.Description())
	require.True(t, r.TargetsUser(gen_models.User{ID: 1}))
}

/* ------------------------------------------------------------------------- */
/* 4. Engine integration                                                     */
/* ------------------------------------------------------------------------- */

func TestEngineEndToEnd(t *testing.T) {
	// One cooldown + one recurring
	cd := &CooldownRule{
		id: "cd", 
		enabled: true, 
		days: 10, 
		checkType: "vision",
		description: "Vision cooldown",
		target: "all",
	}
	rc := &RecurringCheckRule{
		id:              "rc",
		enabled:         true,
		description:     "Annual vision check",
		target:          "all",
		frequency:       Period{Years: 1},
		checkType:       "vision",
		lastRun:         make(map[int64]time.Time),
	}

	engine := NewEngine([]Rule{cd, rc})

	// User + initial schedule
	user := gen_models.User{ID: 1}
	sched := Schedule{}

	// propose first check – should pass
	proposed := MedicalCheck{UserID: 1, CheckType: "vision",
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

	engine.RunScheduled(now, []gen_models.User{user},
		func(mc MedicalCheck) error { generated = append(generated, mc); return nil },
		func(n Notification) error { notified = append(notified, n); return nil })

	require.Len(t, generated, 1)
	require.Len(t, notified, 1)
	require.Equal(t, "vision", generated[0].CheckType)
}
/* ------------------------------------------------------------------------- */
/* 5. ActionRule basic behaviour                                             */
/* ------------------------------------------------------------------------- */
type stubNotifier func(int64, string) error

func (f stubNotifier) Send(u int64, m string) error { return f(u, m) }

// variables the stub will capture (must be package-level)
var gotUser int64 
var gotMsg string

func TestActionRule_Notify(t *testing.T) {
	// 1. register stub notifier
	RegisterNotifier(stubNotifier(func(u int64, m string) error {
		gotUser = u
        gotMsg =  m
		return nil
	}))
	defer RegisterNotifier(nil) // clean up for other tests

	// 2. build the Action rule
	raw := RawRule{
		ID:          "demo",
		Type:        "action",
		Enabled:     true,
		Description: "Notify drivers about vision tests",
		Target:      "role",
		TargetValue: "driver",
		When:        "user.role == 'driver' && check['checkType'] == 'vision'",		
        Actions: []RawAction{{
			Type:   "notify",
			Params: map[string]any{"message": "Time for your eye test"},
		}},
	}
	rule, err := BuildRule(raw)
	require.NoError(t, err)
	ar := rule.(*ActionRule)

	// Test interface methods
	require.Equal(t, "Notify drivers about vision tests", ar.Description())
	require.True(t, ar.TargetsUser(gen_models.User{ID: 1, Role: "driver"}))
	require.False(t, ar.TargetsUser(gen_models.User{ID: 2, Role: "admin"}))

	// 3a. condition FALSE – notifier should NOT be called
	check1 := MedicalCheck{CheckType: "vision"}
	user1  := gen_models.User{ID: 1, Role: "admin"}

	require.NoError(t, ar.Validate(check1, Schedule{}, user1))
	require.Equal(t, int64(0), gotUser)

	// 3b. condition TRUE – notifier should be called
	check2 := MedicalCheck{CheckType: "vision"}
	user2  := gen_models.User{ID: 2, Role: "driver"}

	require.NoError(t, ar.Validate(check2, Schedule{}, user2))
	require.Equal(t, int64(2), gotUser)
	require.Equal(t, "Time for your eye test", gotMsg)
}
