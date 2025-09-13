package scheduler

import (
    "math"
    "strconv"
    "strings"
)

func intFromAny(v any) int {
    switch t := v.(type) {
    case int:
        return t
    case int32:
        return int(t)
    case int64:
        return int(t)
    case float64:
        return int(t)
    case float32:
        return int(t)
    case string:
        s := strings.TrimSpace(t)
        if s == "" {
            return 0
        }
        if n, err := strconv.Atoi(s); err == nil {
            return n
        }
        if f, err := strconv.ParseFloat(s, 64); err == nil {
            return int(f)
        }
        return 0
    default:
        return 0
    }
}

func toInt(v any) int {
    switch t := v.(type) {
    case int:
        return t
    case int32:
        return int(t)
    case int64:
        return int(t)
    case float64:
        return int(math.Round(t))
    case float32:
        return int(math.Round(float64(t)))
    case string:
        s := strings.TrimSpace(t)
        if s == "" {
            return 0
        }
        if n, err := strconv.Atoi(s); err == nil {
            return n
        }
        if f, err := strconv.ParseFloat(s, 64); err == nil {
            return int(math.Round(f))
        }
        return 0
    default:
        return 0
    }
}