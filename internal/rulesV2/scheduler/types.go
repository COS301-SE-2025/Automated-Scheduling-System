package scheduler

import (
    "context"
    "time"
)

// TriggerSpec is the minimal trigger info the scheduler needs.
type TriggerSpec struct {
    Type       string         `json:"type"`
    Parameters map[string]any `json:"parameters,omitempty"`
}

// Rule is a lightweight view the scheduler uses. Obj carries the original rule.
type Rule struct {
    ID      any
    Name    string
    Trigger TriggerSpec
    Obj     any
}

// EvalContext is the data payload sent to the evaluator on fire.
type EvalContext struct {
    Now  time.Time
    Data map[string]any
}

// RuleStore lists rules by trigger type for scheduling.
type RuleStore interface {
    ListByTrigger(ctx context.Context, triggerType string) ([]Rule, error)
}

// EvaluateFunc is invoked when a rule fires.
type EvaluateFunc func(ev EvalContext, rule any) error