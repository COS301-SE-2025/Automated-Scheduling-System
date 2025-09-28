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
					Description: "Event start date and time. Supports relative dates like 'today', 'in 1 month', 'tomorrow', etc. or absolute dates in YYYY-MM-DD HH:MM format",
					Example:     "in 1 month",
				},
				{
					Name:        "endTime",
					Type:        "date",
					Required:    false,
					Description: "Event end date and time. Supports relative dates like 'today', 'in 1 month', 'tomorrow', etc. or absolute dates in YYYY-MM-DD HH:MM format. Defaults to 2 hours after start time if not provided",
					Example:     "in 1 month",
				},
				{
					Name:        "roomName",
					Type:        "string",
					Required:    false,
					Description: "Room or location name for the event",
					Example:     "Conference Room A",
				},
				{
					Name:        "maxAttendees",
					Type:        "number",
					Required:    false,
					Description: "Maximum number of attendees for the event",
					Example:     20,
				},
				{
					Name:        "minAttendees",
					Type:        "number",
					Required:    false,
					Description: "Minimum number of attendees required for the event",
					Example:     5,
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
			},
		},
	}
}
