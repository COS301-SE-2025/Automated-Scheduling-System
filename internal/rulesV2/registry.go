package rulesv2

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"time"
)

type TriggerHandler interface {
	Fire(ctx context.Context, params map[string]any, emit func(EvalContext) error) error
}

type FactResolver interface {
	Resolve(ctx EvalContext, path string) (any, bool, error)
}

type ActionHandler interface {
	Execute(ctx EvalContext, params map[string]any) error
}

type OperatorFunc func(lhs any, rhs any) (bool, error)

type EvalContext struct {
	Now  time.Time
	Data map[string]any //merged data like employee, competency, evenschedule, etc
	// Can extend here if needed
}

type Registry struct {
	Triggers  map[string]TriggerHandler
	Facts     []FactResolver
	Operators map[string]OperatorFunc
	Actions   map[string]ActionHandler
}

// NewRegistry returns an empty registry you can populate manually.
func NewRegistry() *Registry {
	return &Registry{
		Triggers:  map[string]TriggerHandler{},
		Facts:     []FactResolver{},
		Operators: map[string]OperatorFunc{},
		Actions:   map[string]ActionHandler{},
	}
}

// NewRegistryWithDefaults returns a registry with a useful default operator set.
func NewRegistryWithDefaults() *Registry {
	r := NewRegistry()
	r.RegisterDefaultOperators()
	return r
}

/* ------------------------------ Registration ---------------------------- */

func (r *Registry) UseTrigger(name string, h TriggerHandler) *Registry {
	r.Triggers[name] = h
	return r
}
func (r *Registry) UseAction(name string, h ActionHandler) *Registry {
	r.Actions[name] = h
	return r
}
func (r *Registry) UseFactResolver(resolver FactResolver) *Registry {
	r.Facts = append(r.Facts, resolver)
	return r
}
func (r *Registry) UseOperator(name string, op OperatorFunc) *Registry {
	r.Operators[name] = op
	return r
}

/* ------------------------------ Operators -------------------------------- */

// RegisterDefaultOperators wires a compact, safe set of operators.
// You can add more at runtime via UseOperator.
func (r *Registry) RegisterDefaultOperators() {
	r.UseOperator("equals", opEquals)
	r.UseOperator("notEquals", opNotEquals)
	r.UseOperator("isTrue", opIsTrue)
	r.UseOperator("isFalse", opIsFalse)
	r.UseOperator("isNull", opIsNull)
	r.UseOperator("isNotNull", opIsNotNull)
	r.UseOperator("greaterThan", opGreaterThan)
	r.UseOperator("greaterThanOrEqual", opGreaterThanOrEqual)
	r.UseOperator("lessThan", opLessThan)
	r.UseOperator("lessThanOrEqual", opLessThanOrEqual)
	r.UseOperator("contains", opContains) // strings & slices
	r.UseOperator("in", opIn)             // membership
}

/* ------------------------------ Op Helpers -------------------------------- */

func opEquals(lhs, rhs any) (bool, error) {
	// Special-case numbers and times for friendlier equality across JSON/unmarshal types.
	if cmp, ok := tryCompare(lhs, rhs); ok {
		return cmp == 0, nil
	}
	return reflect.DeepEqual(lhs, rhs), nil
}
func opNotEquals(lhs, rhs any) (bool, error) {
	b, err := opEquals(lhs, rhs)
	return !b, err
}
func opIsTrue(lhs, _ any) (bool, error) {
	b, ok := lhs.(bool)
	return ok && b, nil
}
func opIsFalse(lhs, _ any) (bool, error) {
	b, ok := lhs.(bool)
	return ok && !b, nil
}
func opIsNull(lhs, _ any) (bool, error)    { return lhs == nil, nil }
func opIsNotNull(lhs, _ any) (bool, error) { return lhs != nil, nil }

// helper: detect nil or typed-nil pointers
func isNilish(v any) bool {
	if v == nil {
		return true
	}
	rv := reflect.ValueOf(v)
	return rv.Kind() == reflect.Pointer && rv.IsNil()
}

func opGreaterThan(lhs, rhs any) (bool, error) {
	if isNilish(lhs) || isNilish(rhs) {
		return false, nil
	}
	c, err := mustCompare(lhs, rhs)
	return c > 0, err
}
func opGreaterThanOrEqual(lhs, rhs any) (bool, error) {
	if isNilish(lhs) || isNilish(rhs) {
		return false, nil
	}
	c, err := mustCompare(lhs, rhs)
	return c >= 0, err
}
func opLessThan(lhs, rhs any) (bool, error) {
	if isNilish(lhs) || isNilish(rhs) {
		return false, nil
	}
	c, err := mustCompare(lhs, rhs)
	return c < 0, err
}
func opLessThanOrEqual(lhs, rhs any) (bool, error) {
	if isNilish(lhs) || isNilish(rhs) {
		return false, nil
	}
	c, err := mustCompare(lhs, rhs)
	return c <= 0, err
}

// contains: string substring OR element within slice/array.
func opContains(lhs, rhs any) (bool, error) {
	switch l := lhs.(type) {
	case string:
		rs, ok := rhs.(string)
		if !ok {
			return false, errors.New("contains: rhs must be string when lhs is string")
		}
		return strings.Contains(l, rs), nil
	default:
		// Check slice/array membership via equality
		rv := reflect.ValueOf(lhs)
		if rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array {
			for i := 0; i < rv.Len(); i++ {
				if reflect.DeepEqual(rv.Index(i).Interface(), rhs) {
					return true, nil
				}
			}
			return false, nil
		}
		return false, fmt.Errorf("contains: unsupported lhs kind %T", lhs)
	}
}

// in: LHS must be a scalar; RHS is slice/array → membership
func opIn(lhs, rhs any) (bool, error) {
	rv := reflect.ValueOf(rhs)
	if rv.Kind() != reflect.Slice && rv.Kind() != reflect.Array {
		return false, errors.New("in: rhs must be slice or array")
	}
	for i := 0; i < rv.Len(); i++ {
		if reflect.DeepEqual(lhs, rv.Index(i).Interface()) {
			return true, nil
		}
	}
	return false, nil
}

// mustCompare returns -1/0/+1 (lhs ? rhs) or error if incomparable.
func mustCompare(lhs, rhs any) (int, error) {
	if c, ok := tryCompare(lhs, rhs); ok {
		return c, nil
	}
	return 0, fmt.Errorf("cannot compare values of types %T and %T", lhs, rhs)
}

// tryCompare attempts to compare common types: time, numeric, string, bool.
// Returns (cmp, true) when comparable; otherwise (0, false).
func tryCompare(lhs, rhs any) (int, bool) {
	// time.Time
	if lt, ok := lhs.(time.Time); ok {
		switch rt := rhs.(type) {
		case time.Time:
			if lt.Before(rt) {
				return -1, true
			}
			if lt.After(rt) {
				return 1, true
			}
			return 0, true
		}
	}

	// numeric (coerce pointers and strings)
	if lf, lok := asFloat(lhs); lok {
		if rf, rok := asFloat(rhs); rok {
			switch {
			case lf < rf:
				return -1, true
			case lf > rf:
				return 1, true
			default:
				return 0, true
			}
		}
	}

	// strings
	if ls, ok := lhs.(string); ok {
		if rs, ok := rhs.(string); ok {
			switch {
			case ls < rs:
				return -1, true
			case ls > rs:
				return 1, true
			default:
				return 0, true
			}
		}
	}

	// bool: only equality meaningful
	if lb, ok := lhs.(bool); ok {
		if rb, ok := rhs.(bool); ok {
			if lb == rb {
				return 0, true
			}
			if !lb && rb {
				return -1, true
			}
			return 1, true
		}
	}
	return 0, false
}

func toFloat(v any) (float64, bool) {
	switch t := v.(type) {
	case int:
		return float64(t), true
	case int8:
		return float64(t), true
	case int16:
		return float64(t), true
	case int32:
		return float64(t), true
	case int64:
		return float64(t), true
	case uint:
		return float64(t), true
	case uint8:
		return float64(t), true
	case uint16:
		return float64(t), true
	case uint32:
		return float64(t), true
	case uint64:
		return float64(t), true
	case float32:
		return float64(t), true
	case float64:
		return t, true
	default:
		return 0, false
	}
}
