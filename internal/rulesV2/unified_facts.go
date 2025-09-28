package rulesv2

import "strings"

// UnifiedFacts provides minimal derived event.* helpers and generic passthrough for <top>.*
// e.g. "employee.EmployeeStatus" resolves under Data["employee"] if present.
type UnifiedFacts struct{}

func (UnifiedFacts) Resolve(evCtx EvalContext, path string) (any, bool, error) {
    // event.* helpers from trigger payload
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
            if v, ok2 := trig["update_kind"]; ok2 { // snake_case fallback
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

    // Generic passthrough: <top>.<field>...
    seg := getPathSegments(path)
    if len(seg) < 2 {
        return nil, false, nil
    }
    topKey := seg[0]
    top, ok := fetchTop(evCtx, topKey)
    if !ok {
        // Try case-insensitive top key match
        for k := range evCtx.Data {
            if strings.EqualFold(k, topKey) {
                top = evCtx.Data[k]
                ok = true
                break
            }
        }
    }
    if !ok {
        return nil, false, nil
    }
    v, ok := resolveFromMapOrStruct(top, seg[1:])
    return v, ok, nil
}