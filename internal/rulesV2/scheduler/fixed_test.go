//go:build unit

package scheduler

import (
    "testing"

    "github.com/stretchr/testify/assert"
)

func TestTZPrefixFromUTCOffset(t *testing.T) {
    p, err := tzPrefixFromUTCOffset("UTC")
    assert.NoError(t, err)
    assert.Equal(t, "", p)

    p, err = tzPrefixFromUTCOffset("UTC+0")
    assert.NoError(t, err)
    assert.Equal(t, "", p)

    p, err = tzPrefixFromUTCOffset("UTC+2")
    assert.NoError(t, err)
    assert.Equal(t, "CRON_TZ=Etc/GMT-2", p) // sign inversion

    p, err = tzPrefixFromUTCOffset("UTC-5")
    assert.NoError(t, err)
    assert.Equal(t, "CRON_TZ=Etc/GMT+5", p)

    _, err = tzPrefixFromUTCOffset("PST")
    assert.Error(t, err)

    _, err = tzPrefixFromUTCOffset("UTC+25")
    assert.Error(t, err)
}

func TestCronSpecFromParams_Hourly(t *testing.T) {
    spec, tz, err := cronSpecFromParams(map[string]any{
        "frequency":      "hourly",
        "minute_of_hour": "15",
        "timezone":       "UTC+2",
    })
    assert.NoError(t, err)
    assert.Equal(t, "15 * * * *", spec)
    assert.Equal(t, "CRON_TZ=Etc/GMT-2", tz)
}

func TestCronSpecFromParams_Daily(t *testing.T) {
    spec, tz, err := cronSpecFromParams(map[string]any{
        "frequency":  "daily",
        "time_of_day": "14:30",
    })
    assert.NoError(t, err)
    assert.Equal(t, "30 14 * * *", spec)
    assert.Equal(t, "", tz)
}

func TestCronSpecFromParams_Weekly(t *testing.T) {
    spec, tz, err := cronSpecFromParams(map[string]any{
        "frequency":   "weekly",
        "time_of_day": "09:05",
        "day_of_week": 3, // Wednesday
    })
    assert.NoError(t, err)
    assert.Equal(t, "5 9 * * WED", spec)
    assert.Equal(t, "", tz)
}

func TestCronSpecFromParams_Monthly(t *testing.T) {
    spec, tz, err := cronSpecFromParams(map[string]any{
        "frequency":    "monthly",
        "time_of_day":  "23:59",
        "day_of_month": "31",
    })
    assert.NoError(t, err)
    assert.Equal(t, "59 23 31 * *", spec)
    assert.Equal(t, "", tz)
}

func TestCronSpecFromParams_Once(t *testing.T) {
    spec, tz, err := cronSpecFromParams(map[string]any{
        "frequency":  "once",
        "time_of_day": "00:00",
        "date":        "2025-09-19",
    })
    assert.NoError(t, err)
    // 19 September 2025 -> month=9, dom=19
    assert.Equal(t, "0 0 19 9 *", spec)
    assert.Equal(t, "", tz)
}

func TestCronSpecFromParams_Cron(t *testing.T) {
    spec, tz, err := cronSpecFromParams(map[string]any{
        "frequency":       "cron",
        "cron_expression": "*/5 * * * *",
        "timezone":        "UTC-3",
    })
    assert.NoError(t, err)
    assert.Equal(t, "*/5 * * * *", spec)
    assert.Equal(t, "CRON_TZ=Etc/GMT+3", tz)
}

func TestCronSpecFromParams_Errors(t *testing.T) {
    _, _, err := cronSpecFromParams(map[string]any{
        "frequency":      "hourly",
        "minute_of_hour": 99,
    })
    assert.Error(t, err)

    _, _, err = cronSpecFromParams(map[string]any{
        "frequency":   "weekly",
        "time_of_day": "07:00",
        "day_of_week": 0,
    })
    assert.Error(t, err)

    _, _, err = cronSpecFromParams(map[string]any{
        "frequency":    "monthly",
        "time_of_day":  "07:00",
        "day_of_month": 0,
    })
    assert.Error(t, err)

    _, _, err = cronSpecFromParams(map[string]any{
        "frequency": "cron",
    })
    assert.Error(t, err)

    _, _, err = cronSpecFromParams(map[string]any{
        "frequency":  "once",
        "time_of_day": "25:00",
        "date":        "2025-09-19",
    })
    assert.Error(t, err)

    _, _, err = cronSpecFromParams(map[string]any{
        "frequency":  "once",
        "time_of_day": "00:00",
        "date":        "not-a-date",
    })
    assert.Error(t, err)

    _, _, err = cronSpecFromParams(map[string]any{
        "frequency": "unknown",
    })
    assert.Error(t, err)
}