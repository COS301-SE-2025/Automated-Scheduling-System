package rulesv2

// Parameter represents a parameter definition for triggers and actions
type Parameter struct {
	Name        string `json:"name"`
	Type        string `json:"type"` // "string", "number", "boolean", "date", "array", "object"
	Required    bool   `json:"required"`
	Description string `json:"description"`
	Example     any    `json:"example,omitempty"`
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
			Type:        "job_matrix_update",
			Name:        "Job Matrix Update",
			Description: "Triggered when job matrix entries are created, updated, or deleted",
			Parameters: []Parameter{
				{
					Name:        "employee_id",
					Type:        "string",
					Required:    true,
					Description: "Employee number/ID",
					Example:     "EMP001",
				},
				{
					Name:        "competency_id",
					Type:        "number",
					Required:    true,
					Description: "Competency definition ID",
					Example:     123,
				},
				{
					Name:        "action",
					Type:        "string",
					Required:    false,
					Description: "Action performed (created, updated, deleted)",
					Example:     "created",
				},
			},
		},
		{
			Type:        "new_hire",
			Name:        "New Hire",
			Description: "Triggered when a new employee is hired",
			Parameters: []Parameter{
				{
					Name:        "employee_id",
					Type:        "string",
					Required:    true,
					Description: "Employee number/ID of the new hire",
					Example:     "EMP001",
				},
			},
		},
		{
			Type:        "scheduled_competency_check",
			Name:        "Scheduled Competency Check",
			Description: "Triggered on scheduled intervals to check competency compliance",
			Parameters:  []Parameter{}, // No external parameters - runs on schedule
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
					Type:        "string",
					Required:    true,
					Description: "Message content",
					Example:     "Employee needs safety training by end of month",
				},
			},
		},
		{
			Type:        "schedule_training",
			Name:        "Schedule Training",
			Description: "Create a training event in the calendar system",
			Parameters: []Parameter{
				{
					Name:        "employeeNumber",
					Type:        "string",
					Required:    true,
					Description: "Employee number/ID who needs training",
					Example:     "EMP001",
				},
				{
					Name:        "eventType",
					Type:        "string",
					Required:    true,
					Description: "Type of training event",
					Example:     "safety_training",
				},
				{
					Name:        "scheduledDate",
					Type:        "date",
					Required:    false,
					Description: "Preferred date for training (YYYY-MM-DD format). If not provided, defaults to next week",
					Example:     "2025-09-01",
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
	return []FactMetadata{
		{
			Name:        "employee.Employeestatus",
			Type:        "string",
			Description: "Current status of the employee",
			Operators:   []string{"equals", "notEquals", "in", "notIn"},
		},
		{
			Name:        "employee.Firstname",
			Type:        "string",
			Description: "Employee's first name",
			Operators:   []string{"equals", "notEquals", "contains", "startsWith", "endsWith"},
		},
		{
			Name:        "employee.Lastname",
			Type:        "string",
			Description: "Employee's last name",
			Operators:   []string{"equals", "notEquals", "contains", "startsWith", "endsWith"},
		},
		{
			Name:        "employee.Useraccountemail",
			Type:        "string",
			Description: "Employee's email address",
			Operators:   []string{"equals", "notEquals", "contains", "endsWith"},
		},
		{
			Name:        "competency.CompetencyName",
			Type:        "string",
			Description: "Name of the competency",
			Operators:   []string{"equals", "notEquals", "contains", "in", "notIn"},
		},
		{
			Name:        "competency.IsActive",
			Type:        "boolean",
			Description: "Whether the competency is currently active",
			Operators:   []string{"isTrue", "isFalse"},
		},
		{
			Name:        "competency.Source",
			Type:        "string",
			Description: "Source of the competency (Internal, External, etc.)",
			Operators:   []string{"equals", "notEquals", "in", "notIn"},
		},
		{
			Name:        "jobMatrix.RequiredLevel",
			Type:        "number",
			Description: "Required competency level for the job",
			Operators:   []string{"equals", "notEquals", "greaterThan", "lessThan", "greaterThanEqual", "lessThanEqual"},
		},
		{
			Name:        "jobMatrix.CurrentLevel",
			Type:        "number",
			Description: "Employee's current competency level",
			Operators:   []string{"equals", "notEquals", "greaterThan", "lessThan", "greaterThanEqual", "lessThanEqual"},
		},
		{
			Name:        "days_since_training",
			Type:        "number",
			Description: "Number of days since last training",
			Operators:   []string{"greaterThan", "lessThan", "greaterThanEqual", "lessThanEqual", "equals"},
		},
		{
			Name:        "current_time",
			Type:        "date",
			Description: "Current date and time",
			Operators:   []string{"before", "after", "equals"},
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
			Name:        "startsWith",
			Symbol:      "startsWith",
			Description: "String starts with substring",
			Types:       []string{"string"},
		},
		{
			Name:        "endsWith",
			Symbol:      "endsWith",
			Description: "String ends with substring",
			Types:       []string{"string"},
		},
		{
			Name:        "in",
			Symbol:      "in",
			Description: "Value is in the provided array",
			Types:       []string{"string", "number"},
		},
		{
			Name:        "notIn",
			Symbol:      "notIn",
			Description: "Value is not in the provided array",
			Types:       []string{"string", "number"},
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
