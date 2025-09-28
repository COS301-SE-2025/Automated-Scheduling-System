package metadata

import "fmt"

// GetTriggerMetadata returns metadata for all available triggers
func GetTriggerMetadata() []TriggerMetadata {
    return []TriggerMetadata{
        {
            Type:        "job_position",
            Name:        "Job Position",
            Description: "Events related to job position lifecycle",
            Parameters: []Parameter{
                {
                    Name:        "operation",
                    Type:        "string",
                    Required:    true,
                    Description: "Operation on the job position",
                    Options:     []any{"create", "update", "deactivate", "reactivate"},
                    Example:     "update",
                },
            },
        },
        {
            Type:        "competency_type",
            Name:        "Competency Type",
            Description: "Events related to competency type lifecycle",
            Parameters: []Parameter{
                {
                    Name:        "operation",
                    Type:        "string",
                    Required:    true,
                    Description: "Operation on the competency type",
                    Options:     []any{"create", "update", "deactivate", "reactivate"},
                    Example:     "create",
                },
            },
        },
        {
            Type:        "competency",
            Name:        "Competency",
            Description: "Events related to competencies",
            Parameters: []Parameter{
                {
                    Name:        "operation",
                    Type:        "string",
                    Required:    true,
                    Description: "Competency operation",
                    Options:     []any{"create", "update", "deactivate", "reactivate"},
                    Example:     "update",
                },
            },
        },
        {
            Type:        "event_definition",
            Name:        "Event Definition",
            Description: "Create/update/delete event definitions",
            Parameters: []Parameter{
                {
                    Name:        "operation",
                    Type:        "string",
                    Required:    true,
                    Description: "Operation on the event definition",
                    Options:     []any{"create", "update", "delete"},
                    Example:     "update",
                },
            },
        },
        {
            Type:        "scheduled_event",
            Name:        "Scheduled Event",
            Description: "Create/update/delete scheduled events",
            Parameters: []Parameter{
                {
                    Name:        "operation",
                    Type:        "string",
                    Required:    true,
                    Description: "Operation on the scheduled event",
                    Options:     []any{"create", "update", "delete"},
                    Example:     "update",
                },
                {
                    Name:        "update_field",
                    Type:        "string",
                    Required:    false,
                    Description: "When operation=update, specify which field changed",
                    Options: []any{
                        "title",
                        "event_start_date",
                        "event_end_date",
                        "room_name",
                        "maximum_attendees",
                        "minimum_attendees",
                        "status_name",
                        "facilitator",
                        "color",
                        "other",
                    },
                },
            },
        },
        {
            Type:        "roles",
            Name:        "Roles",
            Description: "Role lifecycle and permission changes (no delete)",
            Parameters: []Parameter{
                {
                    Name:        "operation",
                    Type:        "string",
                    Required:    true,
                    Description: "Role operation",
                    Options:     []any{"create", "update"},
                    Example:     "update",
                },
                {
                    Name:        "update_kind",
                    Type:        "string",
                    Required:    false,
                    Description: "When operation=update, choose specific change",
                    Options:     []any{"general", "permission_added", "permission_removed"},
                    Example:     "permission_added",
                },
            },
        },
        {
            Type:        "link_job_to_competency",
            Name:        "Link Job to Competency",
            Description: "Add or remove a link between a job position and a competency",
            Parameters: []Parameter{
                {
                    Name:        "operation",
                    Type:        "string",
                    Required:    true,
                    Description: "Link operation",
                    Options:     []any{"add", "remove"},
                    Example:     "add",
                },
            },
        },
        {
            Type:        "competency_prerequisite",
            Name:        "Competency Prerequisite",
            Description: "Add or remove a prerequisite relationship between competencies",
            Parameters: []Parameter{
                {
                    Name:        "operation",
                    Type:        "string",
                    Required:    true,
                    Description: "Change to prerequisite relationship",
                    Options:     []any{"add", "remove"},
                    Example:     "add",
                },
            },
        },
        {
            Type:        "scheduled_time",
            Name:        "Scheduled Time",
            Description: "Triggers at a fixed, recurring time (e.g., hourly, daily, weekly, monthly, once, or custom cron).",
            Parameters: []Parameter{
                {
                    Name:        "frequency",
                    Type:        "string",
                    Required:    true,
                    Description: "The recurrence frequency",
                    Options:     []any{"hourly", "daily", "weekly", "monthly", "once", "cron"},
                    Example:     "daily",
                },
                {
                    Name:        "minute_of_hour",
                    Type:        "integer",
                    Required:    false,
                    Description: "Minute within the hour when frequency=hourly (0..59)",
                    Example:     0,
                },
                {
                    Name:        "time_of_day",
                    Type:        "time", // "HH:MM" 24h
                    Required:    false,
                    Description: "Time of day for daily/weekly/monthly/once (local to timezone), format 'HH:MM'",
                    Example:     "09:00",
                },
                {
                    Name:        "day_of_week",
                    Type:        "integer", // 1=Mon .. 7=Sun
                    Required:    false,
                    Description: "Day of week for weekly schedule (1=Mon..7=Sun)",
                    Options:     []any{1, 2, 3, 4, 5, 6, 7},
                    Example:     1,
                },
                {
                    Name:        "day_of_month",
                    Type:        "integer", // 1..31
                    Required:    false,
                    Description: "Day of month for monthly schedule (1..31)",
                    Example:     1,
                },
                {
                    Name:        "date",
                    Type:        "date",
                    Required:    false,
                    Description: "Exact date for once-off schedule (YYYY-MM-DD)",
                    Example:     "2025-09-30",
                },
                {
                    Name:        "cron_expression",
                    Type:        "string",
                    Required:    false,
                    Description: "Custom 5-field cron expression",
                    Example:     "0 0 * * 1",
                },
                {
                    Name:        "timezone",
                    Type:        "string",
                    Required:    false,
                    Description: "UTC offset for local-time evaluation (e.g., 'UTC+2', 'UTC-5').",
                    Options: func() []any {
                        vals := []any{}
                        for i := -12; i <= 14; i++ {
                            if i == 0 {
                                vals = append(vals, "UTC+0")
                                continue
                            }
                            sign := "+"
                            v := i
                            if i < 0 {
                                sign = "-"
                                v = -i
                            }
                            vals = append(vals, fmt.Sprintf("UTC%s%d", sign, v))
                        }
                        return vals
                    }(),
                    Example:     "UTC+2",
                },
            },
        },
        {
            Type:        "relative_time",
            Name:        "Relative to a Date",
            Description: "Triggers based on a time offset from a date field on an entity.",
            Parameters: []Parameter{
                {
                    Name:        "entity_type",
                    Type:        "string",
                    Required:    true,
                    Description: "Entity that contains the date field",
                    Options:     []any{"scheduled_event", "employee_competency", "employee", "employment_history"},
                    Example:     "scheduled_event",
                },
                {
                    Name:        "date_field",
                    Type:        "string",
                    Required:    true,
                    Description: "Date/time field on the selected entity",
                    // Union of supported fields; UI will filter based on entity_type.
                    Options:     []any{"event_start_date", "event_end_date", "expiry_date", "termination_date", "start_date"},
                    Example:     "event_start_date",
                },
                {
                    Name:        "offset_direction",
                    Type:        "string",
                    Required:    true,
                    Description: "Whether to fire before or after the date",
                    Options:     []any{"before", "after"},
                    Example:     "before",
                },
                {
                    Name:        "offset_value",
                    Type:        "integer",
                    Required:    true,
                    Description: "Numerical value of the offset",
                    Example:     3,
                },
                {
                    Name:        "offset_unit",
                    Type:        "string",
                    Required:    true,
                    Description: "Unit of the offset",
                    Options:     []any{"minutes", "hours", "days", "weeks", "months"},
                    Example:     "days",
                },
            },
        },
    }
}