package rulesv2

import (
	"context"
	"time"
)

type TriggerHandler interface{
    Fire(ctx context.Context, params map[string]any, emit func(EvalContext)error) error
}

type FactResolver interface {
    Resolve(ctx EvalContext, path string)(any, bool, error)
}

type ActionHandler interface {
    Execute(ctx EvalContext, params map[string]any) error
}

type OperatorFunc func(lhs any, rhs any) (bool, error)

type EvalContext struct {
    Now     time.Time
    Data    map[string]any //merged data like employee, competency, evenschedule, etc
    // Can extend here if needed 
}

type Registry struct {
    Triggers map[string]TriggerHandler
    Facts []FactResolver
    Operator map[string]OperatorFunc
    Actions map[string]ActionHandler
}
