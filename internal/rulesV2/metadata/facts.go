package metadata

// GetFactMetadata returns metadata for all available facts in conditions
func GetFactMetadata() []FactMetadata {
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
            Name:        "role.RoleName",
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