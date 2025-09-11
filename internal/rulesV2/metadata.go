package rulesv2

// Parameter represents a parameter definition for triggers and actions
type Parameter struct {
	Name        string `json:"name"`
	Type        string `json:"type"` // "string", "number", "boolean", "date", "array", "object"
	Required    bool   `json:"required"`
	Description string `json:"description"`
	Example     any    `json:"example,omitempty"`
	// Options is an optional fixed set of allowed values.
	// Frontend can render a dropdown if present.
	Options []any `json:"options,omitempty"`
}

// TriggerMetadata represents metadata about a trigger type
type TriggerMetadata struct {
	Type        string      `json:"type"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Parameters  []Parameter `json:"parameters"`
}

// ActionMetadata represents metadata about an action type
type ActionMetadata struct {
	Type        string      `json:"type"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Parameters  []Parameter `json:"parameters"`
}

// FactMetadata represents metadata about available facts for conditions
type FactMetadata struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Description string   `json:"description"`
	Operators   []string `json:"operators"`
	// Triggers indicates which triggers supply this fact in their context.
	// A fact may be available for multiple triggers.
	Triggers []string `json:"triggers,omitempty"`
}

// OperatorMetadata represents metadata about available operators
type OperatorMetadata struct {
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	Description string   `json:"description"`
	Types       []string `json:"types"` // Compatible data types
}

// RulesMetadata contains all metadata for the rules engine
type RulesMetadata struct {
	Triggers  []TriggerMetadata  `json:"triggers"`
	Actions   []ActionMetadata   `json:"actions"`
	Facts     []FactMetadata     `json:"facts"`
	Operators []OperatorMetadata `json:"operators"`
}

// GetRulesMetadata returns metadata about all available triggers, actions, facts, and operators
func GetRulesMetadata() RulesMetadata {
	return RulesMetadata{
		Triggers:  getTriggerMetadata(),
		Actions:   getActionMetadata(),
		Facts:     getFactMetadata(),
		Operators: getOperatorMetadata(),
	}
}

// getTriggerMetadata returns metadata for all available triggers
func getTriggerMetadata() []TriggerMetadata {
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
	}
}

// getActionMetadata returns metadata for all available actions
func getActionMetadata() []ActionMetadata {
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
					Name:        "recipient",
					Type:        "string",
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
					Type:        "number",
					Required:    true,
					Description: "Event definition ID that this schedule is based on",
					Example:     2,
				},
				{
					Name:        "startTime",
					Type:        "string",
					Required:    true,
					Description: "Event start date and time (YYYY-MM-DD HH:MM format)",
					Example:     "2025-08-25 09:00",
				},
				{
					Name:        "endTime",
					Type:        "string",
					Required:    false,
					Description: "Event end date and time (YYYY-MM-DD HH:MM format). Defaults to 2 hours after start time if not provided",
					Example:     "2025-08-25 11:00",
				},
				{
					Name:        "employeeNumbers",
					Type:        "array",
					Required:    false,
					Description: "List of employee numbers to directly invite to the event",
					Example:     []string{"EMP001", "EMP002"},
				},
				{
					Name:        "positionCodes",
					Type:        "array",
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

// getFactMetadata returns metadata for all available facts in conditions
func getFactMetadata() []FactMetadata {
	const (
		trJobPos      = "job_position"
		trCompType    = "competency_type"
		trCompetency  = "competency"
		trEventDef    = "event_definition"
		trSchedEvent  = "scheduled_event"
		trRoles       = "roles"
		trLinkJobComp = "link_job_to_competency"
		trCompPrereq  = "competency_prerequisite"
	)

	strOps := []string{"equals", "notEquals", "contains"}
	numOps := []string{"equals", "notEquals", "greaterThan", "lessThan", "greaterThanEqual", "lessThanEqual"}
	boolOps := []string{"isTrue", "isFalse"}
	dateOps := []string{"before", "after", "equals"}

	return []FactMetadata{
		// {
		// 	Name:        "event.Operation",
		// 	Type:        "string",
		// 	Description: "Operation specified by the triggering event",
		// 	Operators:   strOps,
		// 	Triggers:    []string{trJobPos, trCompType, trCompetency, trEventDef, trSchedEvent, trRoles, trLinkJobComp, trCompPrereq},
		// },
		// {
		// 	Name:        "event.UpdateKind",
		// 	Type:        "string",
		// 	Description: "Specific update kind if provided by the event (e.g., permissions changed)",
		// 	Operators:   strOps,
		// 	Triggers:    []string{trRoles},
		// },

		//competency facts
		{
			Name:        "competency.CompetencyID",
			Type:        "number",
			Description: "Competency definition ID",
			Operators:   append([]string{"equals", "notEquals"}, []string{"in", "notIn"}...),
			Triggers:    []string{trCompetency, trLinkJobComp, trCompPrereq},
		},
		{
			Name:        "competency.CompetencyName",
			Type:        "string",
			Description: "Name of the competency",
			Operators:   []string{"equals", "notEquals", "contains", "in", "notIn"},
			Triggers:    []string{trCompetency, trLinkJobComp, trCompPrereq},
		},
		{
			Name:        "competency.CompetencyTypeName",
			Type:        "string",
			Description: "Type/category of the competency",
			Operators:   []string{"equals", "notEquals", "in", "notIn"},
			Triggers:    []string{trCompetency, trLinkJobComp, trCompPrereq},
		},
		{
			Name:        "competency.IsActive",
			Type:        "boolean",
			Description: "Whether the competency is currently active",
			Operators:   boolOps,
			Triggers:    []string{trCompetency, trLinkJobComp},
		},
		{
			Name:        "competency.Source",
			Type:        "string",
			Description: "Source of the competency (Internal, External, etc.)",
			Operators:   []string{"equals", "notEquals", "in", "notIn"},
			Triggers:    []string{trCompetency},
		},
		{
			Name:        "competency.ExpiryPeriodMonths",
			Type:        "number",
			Description: "Expiry period in months for the competency",
			Operators:   numOps,
			Triggers:    []string{trCompetency},
		},

		// Competency type facts
		{
			Name:        "competencyType.TypeName",
			Type:        "string",
			Description: "Competency type name",
			Operators:   []string{"equals", "notEquals", "in", "notIn"},
			Triggers:    []string{trCompType},
		},
		{
			Name:        "competencyType.IsActive",
			Type:        "boolean",
			Description: "Whether the competency type is active",
			Operators:   boolOps,
			Triggers:    []string{trCompType},
		},

		// Job position facts
		{
			Name:        "jobPosition.PositionMatrixCode",
			Type:        "string",
			Description: "Position matrix code",
			Operators:   strOps,
			Triggers:    []string{trJobPos, trLinkJobComp},
		},
		{
			Name:        "jobPosition.JobTitle",
			Type:        "string",
			Description: "Job title for the position",
			Operators:   strOps,
			Triggers:    []string{trJobPos, trLinkJobComp},
		},
		{
			Name:        "jobPosition.IsActive",
			Type:        "boolean",
			Description: "Whether the job position is active",
			Operators:   boolOps,
			Triggers:    []string{trJobPos, trLinkJobComp},
		},

		// Job matrix facts
		{
			Name:        "jobMatrix.CurrentLevel",
			Type:        "number",
			Description: "Employee's current competency level",
			Operators:   numOps,
			Triggers:    []string{},
		},

		// Link job to competency facts
		{
			Name:        "link.State",
			Type:        "string",
			Description: "Link state between job position and competency (e.g., active/inactive)",
			Operators:   strOps,
			Triggers:    []string{trLinkJobComp},
		},

		// Competency prerequisite facts
		{
			Name:        "prerequisite.ParentCompetencyID",
			Type:        "number",
			Description: "Competency that has a prerequisite",
			Operators:   append([]string{"equals", "notEquals"}, []string{"in", "notIn"}...),
			Triggers:    []string{trCompPrereq},
		},
		{
			Name:        "prerequisite.RequiredCompetencyID",
			Type:        "number",
			Description: "Competency required as a prerequisite",
			Operators:   append([]string{"equals", "notEquals"}, []string{"in", "notIn"}...),
			Triggers:    []string{trCompPrereq},
		},

		// Event definition facts
		{
			Name:        "eventDef.EventName",
			Type:        "string",
			Description: "Event definition name",
			Operators:   strOps,
			Triggers:    []string{trEventDef},
		},
		{
			Name:        "eventDef.Facilitator",
			Type:        "string",
			Description: "Default facilitator for the event definition",
			Operators:   strOps,
			Triggers:    []string{trEventDef},
		},
		{
			Name:        "eventDef.GrantsCertificateID",
			Type:        "number",
			Description: "Certificate ID granted on completion (if applicable)",
			Operators:   numOps,
			Triggers:    []string{trEventDef},
		},

		// Scheduled event facts
		{
			Name:        "scheduledEvent.Title",
			Type:        "string",
			Description: "Scheduled event title",
			Operators:   strOps,
			Triggers:    []string{trSchedEvent},
		},
		{
			Name:        "scheduledEvent.StatusName",
			Type:        "string",
			Description: "Status of the scheduled event",
			Operators:   strOps,
			Triggers:    []string{trSchedEvent},
		},
		{
			Name:        "scheduledEvent.RoomName",
			Type:        "string",
			Description: "Room or location name",
			Operators:   strOps,
			Triggers:    []string{trSchedEvent},
		},
		{
			Name:        "scheduledEvent.EventStartDate",
			Type:        "date",
			Description: "Scheduled start time",
			Operators:   dateOps,
			Triggers:    []string{trSchedEvent},
		},
		{
			Name:        "scheduledEvent.EventEndDate",
			Type:        "date",
			Description: "Scheduled end time",
			Operators:   dateOps,
			Triggers:    []string{trSchedEvent},
		},
		{
			Name:        "scheduledEvent.MaximumAttendees",
			Type:        "number",
			Description: "Maximum attendees",
			Operators:   numOps,
			Triggers:    []string{trSchedEvent},
		},
		{
			Name:        "scheduledEvent.MinimumAttendees",
			Type:        "number",
			Description: "Minimum attendees",
			Operators:   numOps,
			Triggers:    []string{trSchedEvent},
		},
		{
			Name:        "scheduledEvent.Color",
			Type:        "string",
			Description: "Event color",
			Operators:   strOps,
			Triggers:    []string{trSchedEvent},
		},

		// Roles facts
		{
			Name:        "role.RoleName", // was: role.Name
			Type:        "string",
			Description: "Role name",
			Operators:   strOps,
			Triggers:    []string{trRoles},
		},
		{
			Name:        "role.Description",
			Type:        "string",
			Description: "Role description",
			Operators:   strOps,
			Triggers:    []string{trRoles},
		},

		// Temporal/global facts
		{
			Name:        "current_time",
			Type:        "date",
			Description: "Current date and time",
			Operators:   []string{"before", "after", "equals"},
			Triggers:    []string{trSchedEvent},
		},
	}
}

// getOperatorMetadata returns metadata for all available operators
func getOperatorMetadata() []OperatorMetadata {
	return []OperatorMetadata{
		{
			Name:        "equals",
			Symbol:      "==",
			Description: "Values are equal",
			Types:       []string{"string", "number", "boolean", "date"},
		},
		{
			Name:        "notEquals",
			Symbol:      "!=",
			Description: "Values are not equal",
			Types:       []string{"string", "number", "boolean", "date"},
		},
		{
			Name:        "greaterThan",
			Symbol:      ">",
			Description: "Left value is greater than right value",
			Types:       []string{"number", "date"},
		},
		{
			Name:        "lessThan",
			Symbol:      "<",
			Description: "Left value is less than right value",
			Types:       []string{"number", "date"},
		},
		{
			Name:        "greaterThanEqual",
			Symbol:      ">=",
			Description: "Left value is greater than or equal to right value",
			Types:       []string{"number", "date"},
		},
		{
			Name:        "lessThanEqual",
			Symbol:      "<=",
			Description: "Left value is less than or equal to right value",
			Types:       []string{"number", "date"},
		},
		{
			Name:        "contains",
			Symbol:      "contains",
			Description: "String contains substring",
			Types:       []string{"string"},
		},
		{
			Name:        "isTrue",
			Symbol:      "isTrue",
			Description: "Boolean value is true",
			Types:       []string{"boolean"},
		},
		{
			Name:        "isFalse",
			Symbol:      "isFalse",
			Description: "Boolean value is false",
			Types:       []string{"boolean"},
		},
		{
			Name:        "before",
			Symbol:      "before",
			Description: "Date is before the specified date",
			Types:       []string{"date"},
		},
		{
			Name:        "after",
			Symbol:      "after",
			Description: "Date is after the specified date",
			Types:       []string{"date"},
		},
	}
}
