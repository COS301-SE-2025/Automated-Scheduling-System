package rulesv2

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"
)

// getPathSegments splits "employee.EmployeeStatus" → ["employee","EmployeeStatus"]
func getPathSegments(path string) []string {
	return strings.Split(path, ".")
}

// fetchTop pulls a top-level object (map or struct) from EvalContext.Data.
func fetchTop(evCtx EvalContext, top string) (any, bool) {
	v, ok := evCtx.Data[top]
	return v, ok
}

// resolveFromMapOrStruct walks nested fields across map[string]any and/or struct fields (case-insensitive).
func resolveFromMapOrStruct(root any, segments []string) (any, bool) {
	cur := root
	for _, seg := range segments {
		switch v := cur.(type) {
		case map[string]any:
			nv, ok := v[seg]
			if !ok {
				found := false
				for k := range v {
					if strings.EqualFold(k, seg) {
						nv = v[k]
						found = true
						break
					}
				}
				if !found {
					return nil, false
				}
			}
			cur = nv

		default:
			rv := reflect.ValueOf(cur)
			if rv.Kind() == reflect.Pointer {
				if rv.IsNil() {
					return nil, false
				}
				rv = rv.Elem()
			}
			if rv.Kind() != reflect.Struct {
				return nil, false
			}
			var field reflect.Value
			field = rv.FieldByName(seg)
			if !field.IsValid() {
				for i := 0; i < rv.NumField(); i++ {
					if strings.EqualFold(rv.Type().Field(i).Name, seg) {
						field = rv.Field(i)
						break
					}
				}
			}
			if !field.IsValid() {
				return nil, false
			}

			if field.Kind() == reflect.Pointer && !field.IsNil() {
				field = field.Elem()
			}
			cur = field.Interface()
		}
	}

	rv := reflect.ValueOf(cur)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() {
		cur = rv.Elem().Interface()
	}
	return cur, true
}

func parseBracketArg(s string) (string, bool) {
	i := strings.IndexByte(s, '[')
	j := strings.LastIndexByte(s, ']')
	if i < 0 || j < 0 || j <= i+1 {
		return "", false
	}
	return s[i+1 : j], true
}

// asTime tries common shapes
func asTime(v any) (time.Time, bool) {
	switch t := v.(type) {
	case time.Time:
		return t, true
	case string:
		tt, err := time.Parse(time.RFC3339, t)
		if err == nil {
			return tt, true
		}
		// try date-only
		if dd, err := time.Parse("2006-01-02", t); err == nil {
			return dd, true
		}
	case float64:
		// JSON numbers often unmarshal to float64
		sec := int64(t)
		return time.Unix(sec, 0).UTC(), true
	case int64:
		return time.Unix(t, 0).UTC(), true
	case int:
		return time.Unix(int64(t), 0).UTC(), true
	}
	return time.Time{}, false
}

// asFloat for numeric comparisons
func asFloat(v any) (float64, bool) {
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() {
		return asFloat(rv.Elem().Interface())
	}

	switch t := v.(type) {
	case float64:
		return t, true
	case float32:
		return float64(t), true
	case int, int8, int16, int32, int64:
		return float64(reflect.ValueOf(t).Int()), true
	case uint, uint8, uint16, uint32, uint64:
		return float64(reflect.ValueOf(t).Uint()), true
	case string:
		if f, err := strconv.ParseFloat(t, 64); err == nil {
			return f, true
		}
	}
	return 0, false
}

// error helper for resolvers
func factErr(fact, msg string) error {
	return fmt.Errorf("fact %q: %s", fact, msg)
}
