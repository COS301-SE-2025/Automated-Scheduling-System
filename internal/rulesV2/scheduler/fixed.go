package scheduler

import (
    "context"
    "fmt"
    "log"
    "strconv"
    "strings"
    "time"
)

func (s *Service) scheduleFixedTimeRules(ctx context.Context) error {
    ruleset, err := s.store.ListByTrigger(ctx, "scheduled_time")
    if err != nil {
        return err
    }
    s.debugf("Scheduling %d scheduled_time rule(s)", len(ruleset))
    for _, r := range ruleset {
        key := fmt.Sprint(r.ID)
        if key == "" || key == "<nil>" {
            // Fallback to name if ID is not available (not ideal but avoids duplicate jobs)
            key = "name:" + r.Name
        }
        if err := s.ScheduleFixedRule(key, r.Name, r.Trigger.Parameters, r.Obj); err != nil {
            log.Printf("failed to schedule rule %q: %v", r.Name, err)
        }
    }
    return nil
}

// ScheduleFixedRule schedules or reschedules a single scheduled_time rule by key.
// If a job with the same key exists, it will be removed and replaced.
func (s *Service) ScheduleFixedRule(key, name string, params map[string]any, obj any) error {
    spec, tzSpec, err := cronSpecFromParams(params)
    if err != nil {
        return fmt.Errorf("cron spec error: %w", err)
    }
    full := strings.TrimSpace(tzSpec + " " + spec)
    s.debugf("ScheduleFixedRule key=%q name=%q cron=%q (tzPrefix=%q)", key, name, spec, tzSpec)

    // Prepare closure payload snapshot
    payload := map[string]any{
        "type":            "scheduled_time",
        "frequency":       params["frequency"],
        "minute_of_hour":  params["minute_of_hour"],
        "time_of_day":     params["time_of_day"],
        "day_of_week":     params["day_of_week"],
        "day_of_month":    params["day_of_month"],
        "cron_expression": params["cron_expression"],
        "timezone":        params["timezone"],
        "date":            params["date"],
    }

    freq := strings.ToLower(fmt.Sprint(params["frequency"]))

    // Build job
    job := func() {
        start := time.Now()
        ev := EvalContext{
            Now: time.Now().UTC(),
            Data: map[string]any{
                "trigger": payload,
            },
        }
        s.debugf("FIRE scheduled_time rule %q at %s", name, ev.Now.Format(time.RFC3339))
        if err := s.eval(ev, obj); err != nil {
            log.Printf("scheduled_time rule %q failed: %v", name, err)
        }
        // If once-off, unschedule after first run
        if freq == "once" || freq == "once_off" {
            s.UnscheduleFixedRule(key)
        }
        s.debugf("DONE scheduled_time rule %q duration=%s", name, time.Since(start))
    }

    // Swap under lock
    s.mu.Lock()
    defer s.mu.Unlock()

    if old, ok := s.fixedIDs[key]; ok {
        s.cron.Remove(old)
        delete(s.fixedIDs, key)
        s.debugf("Removed existing cron entry for key=%q", key)
    }

    id, err := s.cron.AddFunc(full, job)
    if err != nil {
        return fmt.Errorf("add cron: %w", err)
    }
    s.fixedIDs[key] = id
    entry := s.cron.Entry(id)
    s.debugf("Scheduled key=%q name=%q id=%d next=%s prev=%s", key, name, id, entry.Next.Format(time.RFC3339), entry.Prev.Format(time.RFC3339))
    return nil
}

// UnscheduleFixedRule removes a scheduled_time cron entry for the given key (if present).
func (s *Service) UnscheduleFixedRule(key string) {
    s.mu.Lock()
    defer s.mu.Unlock()
    if id, ok := s.fixedIDs[key]; ok {
        s.cron.Remove(id)
        delete(s.fixedIDs, key)
        s.debugf("Unscheduled key=%q", key)
    }
}

// cronSpecFromParams creates a robfig/cron v3 spec. Returns (spec, tzPrefix, error).
func cronSpecFromParams(p map[string]any) (string, string, error) {
    freq := strings.ToLower(fmt.Sprint(p["frequency"]))
    tz := strings.TrimSpace(fmt.Sprint(p["timezone"]))

    tzPrefix := ""
    // Prefer UTC offset forms like "UTC+2"/"UTC-5"
    if tz != "" {
        if strings.HasPrefix(strings.ToUpper(tz), "UTC") {
            if pref, err := tzPrefixFromUTCOffset(tz); err == nil && pref != "" {
                tzPrefix = pref
            }
        } else if !strings.EqualFold(tz, "utc") {
            // Backward compatibility with IANA names (if any still stored)
            tzPrefix = "CRON_TZ=" + tz
        }
    }

    parseTimeOfDay := func() (int, int, error) {
        tod := strings.TrimSpace(fmt.Sprint(p["time_of_day"]))
        if tod == "" {
            return 0, 0, nil
        }
        tm, err := time.Parse("15:04", tod)
        if err != nil {
            return 0, 0, fmt.Errorf("invalid time_of_day: %w", err)
        }
        return tm.Hour(), tm.Minute(), nil
    }

    switch freq {
    case "cron":
        expr := strings.TrimSpace(fmt.Sprint(p["cron_expression"]))
        if expr == "" {
            return "", "", fmt.Errorf("cron_expression is required for frequency=cron")
        }
        return expr, tzPrefix, nil
    case "hourly":
        m := intFromAny(p["minute_of_hour"])
        if m < 0 || m > 59 {
            return "", "", fmt.Errorf("minute_of_hour must be 0..59")
        }
        return fmt.Sprintf("%d * * * *", m), tzPrefix, nil
    case "daily":
        h, m, err := parseTimeOfDay()
        if err != nil {
            return "", "", err
        }
        return fmt.Sprintf("%d %d * * *", m, h), tzPrefix, nil
    case "weekly":
        h, m, err := parseTimeOfDay()
        if err != nil {
            return "", "", err
        }
        dow := intFromAny(p["day_of_week"])
        names := []string{"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"}
        if dow < 1 || dow > 7 {
            return "", "", fmt.Errorf("day_of_week must be 1..7")
        }
        return fmt.Sprintf("%d %d * * %s", m, h, names[dow-1]), tzPrefix, nil
    case "monthly":
        h, m, err := parseTimeOfDay()
        if err != nil {
            return "", "", err
        }
        dom := intFromAny(p["day_of_month"])
        if dom < 1 || dom > 31 {
            return "", "", fmt.Errorf("day_of_month must be 1..31")
        }
        return fmt.Sprintf("%d %d %d * *", m, h, dom), tzPrefix, nil
    case "once", "once_off":
        dateStr := strings.TrimSpace(fmt.Sprint(p["date"]))
        if dateStr == "" {
            return "", "", fmt.Errorf("date is required for frequency=once")
        }
        h, m, err := parseTimeOfDay()
        if err != nil {
            return "", "", err
        }
        d, err := time.Parse("2006-01-02", dateStr)
        if err != nil {
            return "", "", fmt.Errorf("invalid date (YYYY-MM-DD): %w", err)
        }
        month := int(d.Month())
        dom := d.Day()
        return fmt.Sprintf("%d %d %d %d *", m, h, dom, month), tzPrefix, nil
    default:
        return "", "", fmt.Errorf("unknown frequency %q", freq)
    }
}

func tzPrefixFromUTCOffset(s string) (string, error) {
    // Accept forms: "UTC+0", "UTC-5", "utc+3"
    v := strings.ToUpper(strings.TrimSpace(s))
    if v == "UTC" || v == "UTC+0" || v == "UTC-0" {
        return "", nil // UTC -> no prefix (we construct cron with UTC base)
    }
    if !strings.HasPrefix(v, "UTC") {
        return "", fmt.Errorf("not a UTC offset")
    }
    off := strings.TrimPrefix(v, "UTC")
    if off == "" {
        return "", nil
    }
    sign := "+"
    if strings.HasPrefix(off, "+") {
        sign = "+"
        off = strings.TrimPrefix(off, "+")
    } else if strings.HasPrefix(off, "-") {
        sign = "-"
        off = strings.TrimPrefix(off, "-")
    } else {
        return "", fmt.Errorf("invalid UTC offset format")
    }
    n, err := strconv.Atoi(off)
    if err != nil {
        return "", fmt.Errorf("invalid UTC offset number: %w", err)
    }
    if n < 0 || n > 14 {
        return "", fmt.Errorf("UTC offset out of range")
    }
    // IANA Etc/GMT zones invert the sign: UTC+2 => Etc/GMT-2, UTC-5 => Etc/GMT+5
    etcSign := "+"
    if sign == "+" {
        etcSign = "-"
    } else {
        etcSign = "+"
    }
    return "CRON_TZ=Etc/GMT" + etcSign + strconv.Itoa(n), nil
}