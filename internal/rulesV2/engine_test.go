//go:build unit

package rulesv2

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"
)

// test action adapter to allow inline funcs as actions
type testActionFunc func(EvalContext, map[string]any) error

func (f testActionFunc) Execute(ctx EvalContext, p map[string]any) error { return f(ctx, p) }

/* -------------------------------------------------------------------------- */
/* Test helpers                                                               */
/* -------------------------------------------------------------------------- */

// A simple capturing action used in tests.
type capturingAction struct {
	Calls []map[string]any
	Err   error // optional error to simulate failures
}

func (a *capturingAction) Execute(ctx EvalContext, params map[string]any) error {
	// Make a shallow copy so later mutations don't affect stored params.
	cp := map[string]any{}
	for k, v := range params {
		cp[k] = v
	}
	a.Calls = append(a.Calls, cp)
	return a.Err
}

// In-memory store that returns preset rules per trigger.
type memStore struct {
	ByTrig map[string][]Rulev2
}

func (m memStore) ListByTrigger(_ context.Context, trigger string) ([]Rulev2, error) {
	return m.ByTrig[trigger], nil
}

// Build a minimal engine with defaults + facts and a place to plug actions.
func newTestEngine(actions map[string]ActionHandler) *Engine {
	reg := NewRegistryWithDefaults().
		UseFactResolver(UnifiedFacts{}) // unified passthrough + event helpers

	for k, v := range actions {
		reg.UseAction(k, v)
	}

	return &Engine{
		R: reg,
		// In tests we usually want to keep going to see all effects.
		ContinueActionsOnError:  true,
		StopOnFirstConditionErr: false,
	}
}

// fixedNow returns a deterministic time for repeatable tests.
func fixedNow() time.Time {
	// 2025-01-01T00:00:00Z
	return time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
}

/* -------------------------------------------------------------------------- */
/* Operators                                                                  */
/* -------------------------------------------------------------------------- */

func TestOperators_Basic(t *testing.T) {
	reg := NewRegistryWithDefaults()
	// equals
	if ok, _ := reg.Operators["equals"]("A", "A"); !ok {
		t.Fatal("equals should be true")
	}
	// numeric compare across types (float vs int)
	if ok, _ := reg.Operators["greaterThan"](float64(10), 9); !ok {
		t.Fatal("10 > 9 should be true")
	}
	// time comparisons
	t1 := time.Date(2025, 1, 2, 0, 0, 0, 0, time.UTC)
	t0 := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	if ok, _ := reg.Operators["lessThan"](t0, t1); !ok {
		t.Fatal("t0 < t1 should be true")
	}
	// contains (string)
	if ok, _ := reg.Operators["contains"]("hello world", "world"); !ok {
		t.Fatal("contains substring should be true")
	}
	// in (slice membership)
	if ok, _ := reg.Operators["in"]("B", []string{"A", "B", "C"}); !ok {
		t.Fatal(`"B" in ["A","B","C"] should be true`)
	}
}

/* -------------------------------------------------------------------------- */
/* Engine: conditions, templating, actions                                    */
/* -------------------------------------------------------------------------- */

func TestEngine_EvaluateOnce_TemplatedAction(t *testing.T) {
	// Capture action calls
	stub := &capturingAction{}
	eng := newTestEngine(map[string]ActionHandler{
		"STUB": stub,
	})

	rule := Rulev2{
		Name:    "Active employee notification",
		Trigger: TriggerSpec{Type: "ANY"}, // unused for EvaluateOnce
		Conditions: []Condition{
			{Fact: "employee.EmployeeStatus", Operator: "equals", Value: "Active"},
		},
		Actions: []ActionSpec{
			{
				Type: "STUB",
				Parameters: map[string]any{
					"msg": "Employee {{.employee.EmployeeNumber}} is active",
				},
			},
		},
	}

	ev := EvalContext{
		Now: fixedNow(),
		Data: map[string]any{
			"employee": map[string]any{
				"EmployeeStatus": "Active",
				"EmployeeNumber": "E-007",
			},
		},
	}

	if err := eng.EvaluateOnce(ev, rule); err != nil {
		t.Fatalf("EvaluateOnce error: %v", err)
	}
	if len(stub.Calls) != 1 {
		t.Fatalf("expected 1 action call, got %d", len(stub.Calls))
	}
	got := stub.Calls[0]["msg"]
	if got != "Employee E-007 is active" {
		t.Fatalf("templated msg mismatch: %v", got)
	}
}

func TestEngine_ActionErrorPolicy(t *testing.T) {
	// first action fails, second should still run with ContinueActionsOnError=true
	fail := &capturingAction{Err: errors.New("boom")}
	ok := &capturingAction{}
	eng := newTestEngine(map[string]ActionHandler{
		"FAIL": fail,
		"OK":   ok,
	})

	rule := Rulev2{
		Name:       "two actions",
		Trigger:    TriggerSpec{Type: "ANY"},
		Conditions: []Condition{}, // no conditions → always true
		Actions: []ActionSpec{
			{Type: "FAIL", Parameters: map[string]any{"x": 1}},
			{Type: "OK", Parameters: map[string]any{"y": 2}},
		},
	}

	if err := eng.EvaluateOnce(EvalContext{Now: fixedNow(), Data: map[string]any{}}, rule); err == nil {
		// EvaluateOnce returns aggregated error if any action failed; with one failure it should be non-nil
		t.Fatal("expected aggregated error from failing action")
	}
	if len(fail.Calls) != 1 || len(ok.Calls) != 1 {
		t.Fatalf("expected both actions to be invoked (got fail=%d ok=%d)", len(fail.Calls), len(ok.Calls))
	}
}

/* -------------------------------------------------------------------------- */
/* DispatchEvent: runs all rules for a trigger                                */
/* -------------------------------------------------------------------------- */

func TestDispatchEvent_RunsAllRules(t *testing.T) {
	stub := &capturingAction{}
	eng := newTestEngine(map[string]ActionHandler{"STUB": stub})

	// Two rules with same trigger
	r1 := Rulev2{
		Name:    "rule1",
		Trigger: TriggerSpec{Type: "EVENT_STATUS_CHANGED"},
		Actions: []ActionSpec{{Type: "STUB", Parameters: map[string]any{"id": "r1"}}},
	}
	r2 := Rulev2{
		Name:       "rule2",
		Trigger:    TriggerSpec{Type: "EVENT_STATUS_CHANGED"},
		Conditions: []Condition{{Fact: "eventSchedule.StatusName", Operator: "equals", Value: "Completed"}},
		Actions:    []ActionSpec{{Type: "STUB", Parameters: map[string]any{"id": "r2"}}},
	}

	store := memStore{
		ByTrig: map[string][]Rulev2{
			"EVENT_STATUS_CHANGED": {r1, r2},
		},
	}

	data := map[string]any{
		"eventSchedule": map[string]any{"StatusName": "Completed"},
	}
	if err := DispatchEvent(context.Background(), eng, store, "EVENT_STATUS_CHANGED", data); err != nil {
		t.Fatalf("DispatchEvent error: %v", err)
	}
	if len(stub.Calls) != 2 {
		t.Fatalf("expected 2 action invocations, got %d", len(stub.Calls))
	}

	// Validate param echo to ensure the right rule fired
	ids := []any{stub.Calls[0]["id"], stub.Calls[1]["id"]}
	if !reflect.DeepEqual(ids, []any{"r1", "r2"}) && !reflect.DeepEqual(ids, []any{"r2", "r1"}) {
		t.Fatalf("unexpected call ids: %v", ids)
	}
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

func TestValidateRule(t *testing.T) {
	reg := NewRegistryWithDefaults().
		UseAction("STUB", &capturingAction{})

	// Good
	ok := Rulev2{
		Name:       "valid",
		Trigger:    TriggerSpec{Type: "SOME_TRIG"},
		Conditions: []Condition{{Fact: ".employee.EmployeeStatus", Operator: "equals", Value: "Active"}},

		Actions: []ActionSpec{{Type: "STUB"}},
	}
	if err := ValidateRule(reg, ok); err != nil {
		t.Fatalf("expected rule to validate, got %v", err)
	}

	// Bad operator
	badOp := ok
	badOp.Conditions[0].Operator = "unknownOp"
	if err := ValidateRule(reg, badOp); err == nil {
		t.Fatal("expected error for unknown operator")
	}

	// Bad action
	badAct := ok
	badAct.Actions[0].Type = "NOPE"
	if err := ValidateRule(reg, badAct); err == nil {
		t.Fatal("expected error for unknown action")
	}
}

/* -------------------------------------------------------------------------- */
/* Conditions evaluate false on missing facts                                 */
/* -------------------------------------------------------------------------- */

func TestConditions_MissingFactIsFalse(t *testing.T) {
	eng := newTestEngine(map[string]ActionHandler{
		"STUB": &capturingAction{},
	})
	rule := Rulev2{
		Name:    "missing fact",
		Trigger: TriggerSpec{Type: "ANY"},
		Conditions: []Condition{
			{Fact: "employee.DoesNotExist", Operator: "isNotNull"},
		},
		Actions: []ActionSpec{{Type: "STUB"}},
	}
	// No employee in Data → condition false → no actions
	if err := eng.EvaluateOnce(EvalContext{Now: fixedNow(), Data: map[string]any{}}, rule); err != nil {
		t.Fatalf("EvaluateOnce returned error: %v", err)
	}
	// Verify no action calls
	ca := eng.R.Actions["STUB"].(*capturingAction)
	if len(ca.Calls) != 0 {
		t.Fatalf("expected 0 calls, got %d", len(ca.Calls))
	}
}

/* -------------------------------------------------------------------------- */
/* Template rendering nested structures                                       */
/* -------------------------------------------------------------------------- */

func TestTemplateRendering_Nested(t *testing.T) {
	stub := &capturingAction{}
	eng := newTestEngine(map[string]ActionHandler{"STUB": stub})

	rule := Rulev2{
		Name:    "nested params",
		Trigger: TriggerSpec{Type: "ANY"},
		Actions: []ActionSpec{
			{
				Type: "STUB",
				Parameters: map[string]any{
					"outer": map[string]any{
						"msg": "Mgr {{.employee.ManagerEmployeeNumber}}",
						"arr": []any{"{{.employee.EmployeeNumber}}", 42},
					},
				},
			},
		},
	}

	ev := EvalContext{
		Now: fixedNow(),
		Data: map[string]any{
			"employee": map[string]any{
				"EmployeeNumber":        "E-123",
				"ManagerEmployeeNumber": "M-9",
			},
		},
	}
	if err := eng.EvaluateOnce(ev, rule); err != nil {
		t.Fatalf("EvaluateOnce error: %v", err)
	}
	call := stub.Calls[0]
	outer, _ := call["outer"].(map[string]any)
	if outer["msg"] != "Mgr M-9" {
		t.Fatalf("bad nested msg: %v", outer["msg"])
	}
	arr, _ := outer["arr"].([]any)
	if arr[0] != "E-123" || arr[1].(int) != 42 {
		t.Fatalf("bad nested arr: %#v", arr)
	}
}

/* -------------------------------------------------------------------------- */
/* Engine.RunRule trigger path (small smoke test)                             */
/* -------------------------------------------------------------------------- */

// A tiny trigger that emits two contexts then returns.
type tinyTrigger struct {
	Emits []EvalContext
}

func (t tinyTrigger) Fire(_ context.Context, _ map[string]any, emit func(EvalContext) error) error {
	for _, e := range t.Emits {
		if err := emit(e); err != nil {
			return err
		}
	}
	return nil
}

func TestEngine_RunRule_WithTrigger(t *testing.T) {
	stub := &capturingAction{}
	reg := NewRegistryWithDefaults().
		UseFactResolver(UnifiedFacts{}). // changed
		UseAction("STUB", stub).
		UseTrigger("TINY", tinyTrigger{
			Emits: []EvalContext{
				{Now: fixedNow(), Data: map[string]any{"employee": map[string]any{"EmployeeStatus": "Active"}}},
				{Now: fixedNow(), Data: map[string]any{"employee": map[string]any{"EmployeeStatus": "Inactive"}}},
			},
		})
	eng := &Engine{R: reg, ContinueActionsOnError: true}

	rule := Rulev2{
		Name:    "only active fires",
		Trigger: TriggerSpec{Type: "TINY"},
		Conditions: []Condition{
			{Fact: "employee.EmployeeStatus", Operator: "equals", Value: "Active"},
		},
		Actions: []ActionSpec{{Type: "STUB", Parameters: map[string]any{"ok": true}}},
	}

	if err := eng.RunRule(context.Background(), rule); err != nil {
		t.Fatalf("RunRule error: %v", err)
	}
	if len(stub.Calls) != 1 {
		t.Fatalf("expected 1 action call for the active context, got %d", len(stub.Calls))
	}
	if ok := stub.Calls[0]["ok"]; ok != true {
		t.Fatalf("expected ok=true param, got %v", ok)
	}
}

/* -------------------------------------------------------------------------- */
/* Utility coverage checks                                                    */
/* -------------------------------------------------------------------------- */

func TestAsTime_And_AsFloat(t *testing.T) {
	now := fixedNow()
	// asTime: RFC3339
	if tm, ok := asTime(now.Format(time.RFC3339)); !ok || !tm.Equal(now) {
		t.Fatalf("asTime RFC3339 failed: %v %v", tm, ok)
	}
	// asTime: date-only
	if tm, ok := asTime("2025-08-15"); !ok || tm.Year() != 2025 || tm.Month() != 8 || tm.Day() != 15 {
		t.Fatalf("asTime date-only failed: %v %v", tm, ok)
	}
	// asFloat
	if f, ok := asFloat("12.5"); !ok || f != 12.5 {
		t.Fatalf("asFloat string failed: %v %v", f, ok)
	}
	if _, ok := asFloat(struct{}{}); ok {
		t.Fatal("asFloat should be false for unsupported type")
	}
}

/* -------------------------------------------------------------------------- */
/* End                                                                        */
/* -------------------------------------------------------------------------- */
