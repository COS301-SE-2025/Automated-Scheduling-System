package metadata

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
    }
}