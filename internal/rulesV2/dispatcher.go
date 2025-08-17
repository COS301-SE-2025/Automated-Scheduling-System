package rulesv2

import (
	"context"
	"time"
)

type RuleStore interface {
    ListByTrigger(ctx context.Context, triggerType string) ([]Rulev2, error)
}

// Dispatch all rules for triggerType and runs them once
// Uses the provided context as data

func DisptachEvent(ctx context.Context, eng *Engine, store RuleStore, triggerType string, data map[string]any) error{
    rs, err := store.ListByTrigger(ctx, triggerType)
    if err != nil{
        return err
    }

    ev := EvalContext{Now: time.Now().UTC(), Data:data}

    var agg MultiError
    for _,r := range rs{
        if err := eng.EvaluateOnce(ev,r); err != nil{
            agg.Append(err)
        }
    }
    return agg.Err()
}
