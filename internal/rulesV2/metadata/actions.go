package metadata

// GetActionMetadata returns metadata for all available actions
func GetActionMetadata() []ActionMetadata {
    return []ActionMetadata{
        {
            Type:        "notification",
            Name:        "Send Notification",
            Description: "Send email or system notification to specified recipient",
            Parameters: []Parameter{
                {
                    Name:        "type",
                    Type:        "string",
                    Required:    true,
                    Description: "Email or SMS",
                    Options:     []any{"sms", "email"},
                    Example:     "sms",
                },
                {
                    Name:        "recipients",
                    Type:        "employees",
                    Required:    true,
                    Description: "Email address or user ID of the recipient",
                    Example:     "manager@company.com",
                },
                {
                    Name:        "subject",
                    Type:        "string",
                    Required:    true,
                    Description: "Email subject line",
                    Example:     "Training Required",
                },
                {
                    Name:        "message",
                    Type:        "text_area",
                    Required:    true,
                    Description: "Message content",
                    Example:     "Employee needs safety training by end of month",
                },
            },
        },
        {
            Type:        "create_event",
            Name:        "Schedule Event",
            Description: "Create an event in the calendar system",
            Parameters: []Parameter{
                {
                    Name:        "title",
                    Type:        "string",
                    Required:    true,
                    Description: "Name of event",
                    Example:     "Safety Training Session",
                },
                {
                    Name:        "customEventID",
                    Type:        "event_type",
                    Required:    true,
                    Description: "Event definition ID that this schedule is based on",
                    Example:     2,
                },
                {
                    Name:        "startTime",
                    Type:        "date",
                    Required:    true,
                    Description: "Event start date and time (YYYY-MM-DD HH:MM format)",
                    Example:     "2025-08-25 09:00",
                },
                {
                    Name:        "endTime",
                    Type:        "date",
                    Required:    false,
                    Description: "Event end date and time (YYYY-MM-DD HH:MM format). Defaults to 2 hours after start time if not provided",
                    Example:     "2025-08-25 11:00",
                },
                {
                    Name:        "employeeNumbers",
                    Type:        "employees",
                    Required:    false,
                    Description: "List of employee numbers to directly invite to the event",
                    Example:     []string{"EMP001", "EMP002"},
                },
                {
                    Name:        "positionCodes",
                    Type:        "job_positions",
                    Required:    false,
                    Description: "List of position codes to target (all employees in these positions will be invited)",
                    Example:     []string{"MGR", "DEV"},
                },
                {
                    Name:        "roomName",
                    Type:        "string",
                    Required:    false,
                    Description: "Room or location name for the event",
                    Example:     "Conference Room A",
                },
                {
                    Name:        "minAttendees",
                    Type:        "number",
                    Required:    false,
                    Description: "Maximum number of attendees for the event",
                    Example:     20,
                },
                {
                    Name:        "maxAttendees",
                    Type:        "number",
                    Required:    false,
                    Description: "Minimum number of attendees required for the event",
                    Example:     5,
                },
            },
        },
        {
            Type:        "competency_assignment",
            Name:        "Competency Assignment",
            Description: "Assign or remove competency requirements for an employee",
            Parameters: []Parameter{
                {
                    Name:        "employeeNumber",
                    Type:        "string",
                    Required:    true,
                    Description: "Employee number/ID",
                    Example:     "EMP001",
                },
                {
                    Name:        "competencyID",
                    Type:        "number",
                    Required:    true,
                    Description: "Competency definition ID",
                    Example:     123,
                },
                {
                    Name:        "action",
                    Type:        "string",
                    Required:    true,
                    Description: "Action to perform: 'assign' or 'remove'",
                    Example:     "assign",
                },
            },
        },
        {
            Type:        "webhook",
            Name:        "HTTP Webhook",
            Description: "Send HTTP request to external system",
            Parameters: []Parameter{
                {
                    Name:        "url",
                    Type:        "string",
                    Required:    true,
                    Description: "Target URL for the webhook",
                    Example:     "https://api.external-system.com/notifications",
                },
                {
                    Name:        "method",
                    Type:        "string",
                    Required:    false,
                    Description: "HTTP method (defaults to POST)",
                    Example:     "POST",
                },
                {
                    Name:        "payload",
                    Type:        "object",
                    Required:    false,
                    Description: "JSON payload to send",
                    Example:     map[string]any{"event": "training_required", "employee": "EMP001"},
                },
            },
        },
        {
            Type:        "audit_log",
            Name:        "Audit Log",
            Description: "Create audit log entry for compliance tracking",
            Parameters: []Parameter{
                {
                    Name:        "action",
                    Type:        "string",
                    Required:    true,
                    Description: "Action being logged",
                    Example:     "competency_check_failed",
                },
                {
                    Name:        "employee_id",
                    Type:        "string",
                    Required:    false,
                    Description: "Employee ID if action relates to specific employee",
                    Example:     "EMP001",
                },
                {
                    Name:        "details",
                    Type:        "object",
                    Required:    false,
                    Description: "Additional details about the action",
                    Example:     map[string]any{"competency": "safety_training", "reason": "expired"},
                },
            },
        },
    }
}