package scheduler

import (
    "context"
    "fmt"
    "log"
    "strings"
    "time"

    "Automated-Scheduling-Project/internal/database/models"
)

func (s *Service) runRelativePoller(ctx context.Context) {
    s.debugf("Relative poller started (interval=%s)", s.interval)
    t := time.NewTicker(s.interval)
    defer t.Stop()
    defer close(s.closed)

    for {
        select {
        case <-s.stop:
            s.debugf("Relative poller stopping")
            return
        case <-t.C:
            now := time.Now().UTC()
            s.debugf("Tick relative at now=%s window=%s", now.Format(time.RFC3339), s.interval)
            s.tickRelative(ctx, now, s.interval)
        }
    }
}

func (s *Service) tickRelative(ctx context.Context, now time.Time, window time.Duration) {
    ruleset, err := s.store.ListByTrigger(ctx, "relative_time")
    if err != nil {
        log.Printf("relative_time list error: %v", err)
        return
    }
    s.debugf("Evaluating %d relative_time rule(s)", len(ruleset))
    for _, r := range ruleset {
        params := r.Trigger.Parameters
        entityType, _ := params["entity_type"].(string)
        dateField, _ := params["date_field"].(string)
        offsetDir, _ := params["offset_direction"].(string) // "before"|"after"
        unit, _ := params["offset_unit"].(string)
        offVal := toInt(params["offset_value"])

        if entityType == "" || dateField == "" || offsetDir == "" || unit == "" {
            log.Printf("relative_time rule %q missing params", r.Name)
            continue
        }

        offset := toDuration(offVal, unit)
        s.debugf("Rule %q entity=%s field=%s dir=%s offset=%d %s", r.Name, entityType, dateField, offsetDir, offVal, unit)

        switch strings.ToLower(entityType) {
        case "scheduled_event":
            if err := s.evalRelativeScheduledEvent(ctx, now, window, offset, offsetDir, dateField, r); err != nil {
                log.Printf("relative_time scheduled_event error: %v", err)
            }
        case "employee_competency":
            if err := s.evalRelativeEmployeeCompetency(ctx, now, window, offset, offsetDir, dateField, r); err != nil {
                log.Printf("relative_time employee_competency error: %v", err)
            }
        case "employee":
            if err := s.evalRelativeEmployee(ctx, now, window, offset, offsetDir, dateField, r); err != nil {
                log.Printf("relative_time employee error: %v", err)
            }
        case "employment_history":
            if err := s.evalRelativeEmploymentHistory(ctx, now, window, offset, offsetDir, dateField, r); err != nil {
                log.Printf("relative_time employment_history error: %v", err)
            }
        default:
            log.Printf("relative_time rule %q unsupported entity_type=%s", r.Name, entityType)
        }
    }
}

func (s *Service) evalRelativeScheduledEvent(ctx context.Context, now time.Time, window time.Duration, offset time.Duration, dir string, dateField string, r Rule) error {
    col := ""
    switch strings.ToLower(dateField) {
    case "event_start_date", "eventstartdate":
        col = "event_start_date"
    case "event_end_date", "eventenddate":
        col = "event_end_date"
    default:
        return fmt.Errorf("unknown date_field %q", dateField)
    }

    start := now
    end := now.Add(window)
    switch strings.ToLower(dir) {
    case "before":
        start = now.Add(offset)
        end = start.Add(window)
    case "after":
        start = now.Add(-offset)
        end = start.Add(window)
    default:
        return fmt.Errorf("unknown offset_direction %q", dir)
    }

    s.debugf("Query scheduled_event where %s in [%s, %s)", col, start.Format(time.RFC3339), end.Format(time.RFC3339))

    var rows []models.CustomEventSchedule
    if err := s.db.WithContext(ctx).
        Where(col+" >= ? AND "+col+" < ?", start, end).
        Find(&rows).Error; err != nil {
        return err
    }

    s.debugf("Rule %q matched %d row(s)", r.Name, len(rows))

    for _, row := range rows {
        ev := EvalContext{
            Now: time.Now().UTC(),
            Data: map[string]any{
                "trigger": map[string]any{
                    "type":             "relative_time",
                    "entity_type":      "scheduled_event",
                    "date_field":       strings.ToLower(dateField),
                    "offset_direction": strings.ToLower(dir),
                    "offset_value":     r.Trigger.Parameters["offset_value"],
                    "offset_unit":      r.Trigger.Parameters["offset_unit"],
                },
                "scheduledEvent": row,
            },
        }
        s.debugf("FIRE relative_time rule %q schedule_id=%d at %s", r.Name, row.CustomEventScheduleID, ev.Now.Format(time.RFC3339))
        if err := s.eval(ev, r.Obj); err != nil {
            log.Printf("relative_time rule %q failed on schedule %d: %v", r.Name, row.CustomEventScheduleID, err)
        }
    }
    return nil
}

func (s *Service) evalRelativeEmployeeCompetency(ctx context.Context, now time.Time, window time.Duration, offset time.Duration, dir string, dateField string, r Rule) error {
    // Supported field(s): expiry_date (DATE)
    field := strings.ToLower(dateField)
    if field != "expiry_date" {
        return fmt.Errorf("unknown date_field %q for employee_competency", dateField)
    }

    start := now
    end := now.Add(window)
    switch strings.ToLower(dir) {
    case "before":
        start = now.Add(offset)
        end = start.Add(window)
    case "after":
        start = now.Add(-offset)
        end = start.Add(window)
    default:
        return fmt.Errorf("unknown offset_direction %q", dir)
    }

    s.debugf("Query employee_competencies where %s in [%s, %s)", field, start.Format(time.RFC3339), end.Format(time.RFC3339))

    var rows []map[string]any
    if err := s.db.WithContext(ctx).
        Table("employee_competencies").
        Where(field+" >= ? AND "+field+" < ?", start, end).
        Find(&rows).Error; err != nil {
        return err
    }

    s.debugf("Rule %q matched %d row(s) in employee_competencies", r.Name, len(rows))

    for _, row := range rows {
        ev := EvalContext{
            Now: time.Now().UTC(),
            Data: map[string]any{
                "trigger": map[string]any{
                    "type":             "relative_time",
                    "entity_type":      "employee_competency",
                    "date_field":       field,
                    "offset_direction": strings.ToLower(dir),
                    "offset_value":     r.Trigger.Parameters["offset_value"],
                    "offset_unit":      r.Trigger.Parameters["offset_unit"],
                },
                "employeeCompetency": row,
            },
        }
        s.debugf("FIRE relative_time rule %q employee_competency at %s", r.Name, ev.Now.Format(time.RFC3339))
        if err := s.eval(ev, r.Obj); err != nil {
            log.Printf("relative_time rule %q failed (employee_competency): %v", r.Name, err)
        }
    }
    return nil
}

func (s *Service) evalRelativeEmployee(ctx context.Context, now time.Time, window time.Duration, offset time.Duration, dir string, dateField string, r Rule) error {
    // Supported field(s): termination_date (column name in DB is terminationdate)
    field := strings.ToLower(strings.ReplaceAll(dateField, " ", ""))
    // Normalize common variants
    if field == "termination_date" || field == "terminationdate" {
        field = "terminationdate"
    } else {
        return fmt.Errorf("unknown date_field %q for employee", dateField)
    }

    start := now
    end := now.Add(window)
    switch strings.ToLower(dir) {
    case "before":
        start = now.Add(offset)
        end = start.Add(window)
    case "after":
        start = now.Add(-offset)
        end = start.Add(window)
    default:
        return fmt.Errorf("unknown offset_direction %q", dir)
    }

    s.debugf("Query employee where %s in [%s, %s)", field, start.Format(time.RFC3339), end.Format(time.RFC3339))

    var rows []map[string]any
    if err := s.db.WithContext(ctx).
        Table("employee").
        Where(field+" IS NOT NULL").
        Where(field+" >= ? AND "+field+" < ?", start, end).
        Find(&rows).Error; err != nil {
        return err
    }

    s.debugf("Rule %q matched %d row(s) in employee", r.Name, len(rows))

    for _, row := range rows {
        ev := EvalContext{
            Now: time.Now().UTC(),
            Data: map[string]any{
                "trigger": map[string]any{
                    "type":             "relative_time",
                    "entity_type":      "employee",
                    "date_field":       "termination_date",
                    "offset_direction": strings.ToLower(dir),
                    "offset_value":     r.Trigger.Parameters["offset_value"],
                    "offset_unit":      r.Trigger.Parameters["offset_unit"],
                },
                "employee": row,
            },
        }
        s.debugf("FIRE relative_time rule %q employee at %s", r.Name, ev.Now.Format(time.RFC3339))
        if err := s.eval(ev, r.Obj); err != nil {
            log.Printf("relative_time rule %q failed (employee): %v", r.Name, err)
        }
    }
    return nil
}

func (s *Service) evalRelativeEmploymentHistory(ctx context.Context, now time.Time, window time.Duration, offset time.Duration, dir string, dateField string, r Rule) error {
    // Supported field(s): start_date
    field := strings.ToLower(dateField)
    if field != "start_date" {
        return fmt.Errorf("unknown date_field %q for employment_history", dateField)
    }

    start := now
    end := now.Add(window)
    switch strings.ToLower(dir) {
    case "before":
        start = now.Add(offset)
        end = start.Add(window)
    case "after":
        start = now.Add(-offset)
        end = start.Add(window)
    default:
        return fmt.Errorf("unknown offset_direction %q", dir)
    }

    s.debugf("Query employment_history where %s in [%s, %s)", field, start.Format(time.RFC3339), end.Format(time.RFC3339))

    var rows []map[string]any
    if err := s.db.WithContext(ctx).
        Table("employment_history").
        Where(field+" >= ? AND "+field+" < ?", start, end).
        Find(&rows).Error; err != nil {
        return err
    }

    s.debugf("Rule %q matched %d row(s) in employment_history", r.Name, len(rows))

    for _, row := range rows {
        ev := EvalContext{
            Now: time.Now().UTC(),
            Data: map[string]any{
                "trigger": map[string]any{
                    "type":             "relative_time",
                    "entity_type":      "employment_history",
                    "date_field":       field,
                    "offset_direction": strings.ToLower(dir),
                    "offset_value":     r.Trigger.Parameters["offset_value"],
                    "offset_unit":      r.Trigger.Parameters["offset_unit"],
                },
                "employmentHistory": row,
            },
        }
        s.debugf("FIRE relative_time rule %q employment_history at %s", r.Name, ev.Now.Format(time.RFC3339))
        if err := s.eval(ev, r.Obj); err != nil {
            log.Printf("relative_time rule %q failed (employment_history): %v", r.Name, err)
        }
    }
    return nil
}

func toDuration(n int, unit string) time.Duration {
    switch strings.ToLower(unit) {
    case "minutes", "minute", "min":
        return time.Duration(n) * time.Minute
    case "hours", "hour", "hr":
        return time.Duration(n) * time.Hour
    case "days", "day":
        return time.Duration(n) * 24 * time.Hour
    case "weeks", "week":
        return time.Duration(n) * 7 * 24 * time.Hour
    case "months", "month":
        return time.Duration(n) * 30 * 24 * time.Hour
    default:
        return 0
    }
}