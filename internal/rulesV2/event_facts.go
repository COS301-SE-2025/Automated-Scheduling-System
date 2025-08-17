package rulesv2

import (
	"strings"
    "reflect"
)

// EventFacts bundles a few domains frequently used in your rules:
// - eventSchedule.*         (ID, StatusName, CurrentAttendees, MaximumAttendees, EventEndDate, ...)
// - eventDefinition.*       (grants_certificate_id, ...)
// - waitlist.HasAttendees   (bool) → look for "waitlistCount" or "waitlist" slice in context
// - task.*                  (Type, Status, CreatedAt, AgeInDays)
//
// Expected context shapes (examples):
//   "eventSchedule": map[string]any{
//       "ID": 123, "StatusName":"Full", "CurrentAttendees": 30, "MaximumAttendees": 30,
//       "EventEndDate": "2025-09-12T16:00:00Z",
//   }
//   "eventDefinition": map[string]any{
//       "grants_certificate_id": "COMP_X",
//   }
//   "waitlistCount": 5
//   // or "waitlist": []any{...}
//   "task": map[string]any{
//       "Type":"Training Suggestion", "Status":"Pending", "CreatedAt":"2025-06-20T09:00:00Z",
//   }
type EventFacts struct{}

func (EventFacts) Resolve(evCtx EvalContext, path string) (any, bool, error) {
	// eventSchedule.*
	if strings.HasPrefix(path, "eventSchedule.") {
		return resolveUnder(evCtx, "eventSchedule", path)
	}

	// eventDefinition.*
	if strings.HasPrefix(path, "eventDefinition.") {
		return resolveUnder(evCtx, "eventDefinition", path)
	}

	// waitlist.HasAttendees
	if strings.EqualFold(path, "waitlist.HasAttendees") {
		return waitlistHasAttendees(evCtx)
	}

	// task.*
	if strings.HasPrefix(path, "task.") {
		seg := getPathSegments(path)
		if len(seg) == 2 && strings.EqualFold(seg[1], "AgeInDays") {
			return taskAgeInDays(evCtx)
		}
		return resolveUnder(evCtx, "task", path)
	}

	return nil, false, nil
}

func resolveUnder(evCtx EvalContext, topKey string, fullPath string) (any, bool, error) {
	top, ok := fetchTop(evCtx, topKey)
	if !ok {
		return nil, false, nil
	}
	seg := getPathSegments(fullPath)
	v, ok := resolveFromMapOrStruct(top, seg[1:])
	return v, ok, nil
}

func waitlistHasAttendees(evCtx EvalContext) (any, bool, error) {
	// prefer explicit count if present
	if cnt, ok := evCtx.Data["waitlistCount"]; ok {
		if f, ok2 := asFloat(cnt); ok2 {
			return f > 0, true, nil
		}
	}
	// fallback to slice
	if wl, ok := evCtx.Data["waitlist"]; ok {
		rv := reflectValueLen(wl)
		if rv >= 0 {
			return rv > 0, true, nil
		}
	}
	return false, true, nil
}

func taskAgeInDays(evCtx EvalContext) (any, bool, error) {
	top, ok := fetchTop(evCtx, "task")
	if !ok {
		return nil, true, nil
	}
	v, ok := resolveFromMapOrStruct(top, []string{"CreatedAt"})
	if !ok {
		return nil, true, nil
	}
	tm, ok := asTime(v)
	if !ok {
		return nil, true, nil
	}
	days := int(evCtx.Now.Sub(tm).Hours() / 24)
	return days, true, nil
}

// reflectValueLen returns len for slices/arrays/maps, -1 otherwise
func reflectValueLen(v any) int {
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Slice, reflect.Array, reflect.Map, reflect.String:
		return rv.Len()
	default:
		return -1
	}
}
