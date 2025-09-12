package metadata

// Parameter represents a parameter definition for triggers and actions
type Parameter struct {
    Name        string `json:"name"`
    Type        string `json:"type"` // "string", "text_area", "employees", "event_type", "job_positions", "number", "boolean", "date", "array", "object"
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