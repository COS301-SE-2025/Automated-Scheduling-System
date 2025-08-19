package rulesv2

import (
	"reflect"
	"strings"
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
	// Map event.* helper facts from trigger payload
	if strings.EqualFold(path, "event.Operation") {
		if trig, ok := evCtx.Data["trigger"].(map[string]any); ok {
			if v, ok2 := trig["operation"]; ok2 {
				return v, true, nil
			}
		}
		return nil, true, nil
	}
	if strings.EqualFold(path, "event.UpdateKind") {
		if trig, ok := evCtx.Data["trigger"].(map[string]any); ok {
			if v, ok2 := trig["updateKind"]; ok2 {
				return v, true, nil
			}
			// also accept snake_case just in case
			if v, ok2 := trig["update_kind"]; ok2 {
				return v, true, nil
			}
		}
		return nil, true, nil
	}
	if strings.EqualFold(path, "event.Action") {
		if trig, ok := evCtx.Data["trigger"].(map[string]any); ok {
			if v, ok2 := trig["action"]; ok2 {
				return v, true, nil
			}
		}
		return nil, true, nil
	}

	// scheduledEvent.* (fallbacks to eventSchedule.* or event.* if provided)
	if strings.HasPrefix(path, "scheduledEvent.") {
		if v, ok, err := resolveUnder(evCtx, "scheduledEvent", path); ok || err != nil {
			return v, ok, err
		}
		if v, ok, err := resolveUnder(evCtx, "eventSchedule", path); ok || err != nil {
			return v, ok, err
		}
		if v, ok, err := resolveUnder(evCtx, "event", path); ok || err != nil {
			return v, ok, err
		}
		return nil, false, nil
	}

	// eventDef.* (fallback to eventDefinition.*)
	if strings.HasPrefix(path, "eventDef.") {
		if v, ok, err := resolveUnder(evCtx, "eventDef", path); ok || err != nil {
			return v, ok, err
		}
		if v, ok, err := resolveUnder(evCtx, "eventDefinition", path); ok || err != nil {
			return v, ok, err
		}
		return nil, false, nil
	}

	// eventSchedule.* (legacy prefix support)
	if strings.HasPrefix(path, "eventSchedule.") {
		return resolveUnder(evCtx, "eventSchedule", path)
	}

	// eventDefinition.* (legacy prefix support)
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
