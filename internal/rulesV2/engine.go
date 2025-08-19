package rulesv2

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"text/template"
	"time"
)

/* -------------------------------- Engine --------------------------------- */

type Engine struct {
	R *Registry

	// Policy toggles (optional; adjust to taste)
	ContinueActionsOnError  bool // if true, runs all actions and aggregates errors
	StopOnFirstConditionErr bool // if true, aborts rule on first condition error
}

// ValidateRule checks that a Rulev2 is internally consistent and
// that all referenced trigger types, operators, and actions exist
// in the provided registry. It does not check the semantics of parameter maps.
func ValidateRule(r *Registry, rule Rulev2) error {
	if r == nil {
		return fmt.Errorf("nil registry")
	}
	if rule.Name == "" {
		return fmt.Errorf("rule must have a name")
	}
	if rule.Trigger.Type == "" {
		return fmt.Errorf("rule %q: trigger type is empty", rule.Name)
	}
	// if _, ok := r.Triggers[rule.Trigger.Type]; !ok {
	// Trigger not required to be present (maybe only stored), but we can warn.
	// Comment out if you want to allow unknown triggers until wired.
	// return fmt.Errorf("rule %q: unknown trigger %q", rule.Name, rule.Trigger.Type)
	// }

	for i, c := range rule.Conditions {
		if c.Operator == "" {
			return fmt.Errorf("rule %q: condition %d missing operator", rule.Name, i)
		}
		if _, ok := r.Operators[c.Operator]; !ok {
			return fmt.Errorf("rule %q: condition %d unknown operator %q", rule.Name, i, c.Operator)
		}
		// Fact string can be left unchecked: unknown facts just resolve false at runtime
	}

	for i, a := range rule.Actions {
		if a.Type == "" {
			return fmt.Errorf("rule %q: action %d missing type", rule.Name, i)
		}
		if _, ok := r.Actions[a.Type]; !ok {
			return fmt.Errorf("rule %q: action %d unknown action type %q", rule.Name, i, a.Type)
		}
	}

	return nil
}

// RunRule executes a single rule end-to-end via its TriggerHandler.
// For scheduled triggers this may evaluate the rule many times (one per emitted EvalContext).
func (e *Engine) RunRule(ctx context.Context, r Rulev2) error {
	if e.R == nil {
		return errors.New("engine: nil registry")
	}
	th, ok := e.R.Triggers[r.Trigger.Type]
	if !ok || th == nil {
		return fmt.Errorf("engine: unknown trigger type %q", r.Trigger.Type)
	}

	// Wrap the trigger's emit to evaluate conditions & actions for each context.
	var agg MultiError
	err := th.Fire(ctx, r.Trigger.Parameters, func(evCtx EvalContext) error {
		// Default Now if unset (helps tests & callers that don't fill it)
		if evCtx.Now.IsZero() {
			evCtx.Now = time.Now().UTC()
		}
		ok, err := e.evalConditions(evCtx, r.Conditions)
		if err != nil {
			if e.StopOnFirstConditionErr {
				return err
			}
			agg.Append(err)
			return nil // skip actions for this context
		}
		if !ok {
			return nil // conditions false → no actions
		}
		if err := e.execActions(evCtx, r.Actions); err != nil {
			agg.Append(err)
		}
		return nil
	})
	if err != nil {
		agg.Append(err)
	}
	return agg.Err()
}

/* --------------------------- Condition Evaluation ------------------------ */

func (e *Engine) evalConditions(evCtx EvalContext, conds []Condition) (bool, error) {
	for _, c := range conds {
		val, ok, err := e.resolveFact(evCtx, c)
		if err != nil {
			return false, fmt.Errorf("resolve fact %q: %w", c.Fact, err)
		}
		if !ok {
			// Unknown/missing fact → treat as false
			return false, nil
		}
		op, ok := e.R.Operators[c.Operator]
		if !ok || op == nil {
			return false, fmt.Errorf("unknown operator %q", c.Operator)
		}

		// Pass the "Value" by default. If you have operator-specific extras,
		// wire them here (e.g., forCompetency) by reading from c.Extras.
		rhs := c.Value

		pass, err := op(val, rhs)
		if err != nil {
			return false, fmt.Errorf("operator %q: %w", c.Operator, err)
		}
		if !pass {
			return false, nil
		}
	}
	return true, nil
}

func (e *Engine) EvaluateOnce(evCtx EvalContext, r Rulev2) error {
	if evCtx.Now.IsZero() {
		evCtx.Now = time.Now().UTC()
	}

	// Debug: show incoming trigger map, rule params, and match result
	matched := matchTriggerParams(evCtx, r.Trigger.Parameters)

	// Enforce trigger parameter guards (e.g., operation must match)
	if !matched {
		// parameters don't match the incoming event -> skip this rule
		return nil
	}

	ok, err := e.evalConditions(evCtx, r.Conditions)
	if err != nil || !ok {
		return err
	}

	return e.execActions(evCtx, r.Actions)
}

func (e *Engine) resolveFact(evCtx EvalContext, c Condition) (any, bool, error) {
	for _, fr := range e.R.Facts {
		v, handled, err := fr.Resolve(evCtx, c.Fact)
		if err != nil {
			return nil, handled, err
		}
		if handled {
			return v, true, nil
		}
	}
	return nil, false, nil
}

/* ------------------------------- Actions --------------------------------- */

func (e *Engine) execActions(evCtx EvalContext, acts []ActionSpec) error {
	var agg MultiError
	for _, a := range acts {
		ah, ok := e.R.Actions[a.Type]
		if !ok || ah == nil {
			agg.Append(fmt.Errorf("unknown action %q", a.Type))
			if !e.ContinueActionsOnError {
				break
			}
			continue
		}
		params, err := renderParams(evCtx, a.Parameters)
		if err != nil {
			agg.Append(fmt.Errorf("render params for action %q: %w", a.Type, err))
			if !e.ContinueActionsOnError {
				break
			}
			continue
		}
		if err := ah.Execute(evCtx, params); err != nil {
			agg.Append(fmt.Errorf("action %q failed: %w", a.Type, err))
			if !e.ContinueActionsOnError {
				break
			}
		}
	}
	return agg.Err()
}

/* --------------------------- Template Rendering -------------------------- */

// renderParams walks a map and renders any string values as Go templates against
// the EvalContext.Data (so {{employee.EmployeeNumber}} works). It also recurses
// into nested maps and slices.
func renderParams(evCtx EvalContext, in map[string]any) (map[string]any, error) {
	out := make(map[string]any, len(in))
	for k, v := range in {
		rv, err := renderAny(evCtx, v)
		if err != nil {
			return nil, err
		}
		out[k] = rv
	}
	return out, nil
}

func renderAny(evCtx EvalContext, v any) (any, error) {
	switch t := v.(type) {
	case string:
		return renderStringTemplate(t, evCtx.Data)
	case map[string]any:
		return renderParams(evCtx, t)
	case []any:
		out := make([]any, len(t))
		for i := range t {
			rv, err := renderAny(evCtx, t[i])
			if err != nil {
				return nil, err
			}
			out[i] = rv
		}
		return out, nil
	default:
		// Also support map[string]string, []string, etc. via reflection fallback:
		rv := reflect.ValueOf(v)
		switch rv.Kind() {
		case reflect.Map:
			// Convert to map[string]any and recurse
			it := rv.MapRange()
			tmp := map[string]any{}
			for it.Next() {
				k := fmt.Sprint(it.Key().Interface())
				val := it.Value().Interface()
				rv2, err := renderAny(evCtx, val)
				if err != nil {
					return nil, err
				}
				tmp[k] = rv2
			}
			return tmp, nil
		case reflect.Slice, reflect.Array:
			l := rv.Len()
			tmp := make([]any, l)
			for i := 0; i < l; i++ {
				rv2, err := renderAny(evCtx, rv.Index(i).Interface())
				if err != nil {
					return nil, err
				}
				tmp[i] = rv2
			}
			return tmp, nil
		default:
			return v, nil
		}
	}
}

func renderStringTemplate(tmpl string, data map[string]any) (string, error) {
	// Restricted, data-only templates—no custom funcs by default.
	// Add a FuncMap here if/when you need helpers (date formatting, math, etc).
	t, err := template.New("param").Option("missingkey=default").Parse(tmpl)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

/* ----------------------------- Error Helpers ----------------------------- */

// MultiError aggregates multiple errors into one, preserving order.
type MultiError struct {
	errs []error
}

func (m *MultiError) Append(err error) {
	if err == nil {
		return
	}
	m.errs = append(m.errs, err)
}

func (m *MultiError) Err() error {
	if len(m.errs) == 0 {
		return nil
	}
	if len(m.errs) == 1 {
		return m.errs[0]
	}
	// Join (Go 1.20+). If you want older Go, concatenate manually.
	return errors.Join(m.errs...)
}

func matchTriggerParams(evCtx EvalContext, params map[string]any) bool {
	if len(params) == 0 {
		return true
	}
	trig, _ := evCtx.Data["trigger"].(map[string]any)
	if trig == nil {
		return false
	}
	for k, v := range params {
		// Ignore optional/blank params sent by UI (e.g., update_kind: "")
		if isBlankParam(v) {
			continue
		}
		tv, ok := readTriggerValue(trig, k)
		if !ok {
			return false
		}
		if !paramEquals(tv, v) {
			return false
		}
	}
	return true
}

func isBlankParam(v any) bool {
	if v == nil {
		return true
	}
	if s, ok := v.(string); ok {
		return strings.TrimSpace(s) == ""
	}
	return false
}

// readTriggerValue tries exact, snake_case <-> camelCase variants
func readTriggerValue(trig map[string]any, key string) (any, bool) {
	// exact
	if v, ok := trig[key]; ok {
		return v, true
	}
	// snake_case -> camelCase
	cc := snakeToCamel(key)
	if v, ok := trig[cc]; ok {
		return v, true
	}
	// camelCase -> snake_case
	sc := camelToSnake(key)
	if v, ok := trig[sc]; ok {
		return v, true
	}
	return nil, false
}

func paramEquals(a, b any) bool {
	// normalize basic scalar comparisons
	as := fmt.Sprint(a)
	bs := fmt.Sprint(b)
	// case-insensitive for strings
	if _, ok := a.(string); ok {
		return strings.EqualFold(as, bs)
	}
	if _, ok := b.(string); ok {
		return strings.EqualFold(as, bs)
	}
	return as == bs
}

func snakeToCamel(s string) string {
	var out string
	upper := false
	for _, r := range s {
		if r == '_' {
			upper = true
			continue
		}
		if upper {
			out += strings.ToUpper(string(r))
			upper = false
		} else {
			out += string(r)
		}
	}
	return out
}

func camelToSnake(s string) string {
	var b strings.Builder
	for i, r := range s {
		if i > 0 && r >= 'A' && r <= 'Z' {
			b.WriteByte('_')
		}
		b.WriteByte(byte(strings.ToLower(string(r))[0]))
	}
	return b.String()
}
