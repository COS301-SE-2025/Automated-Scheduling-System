package rulesv2

type TriggerSpec struct {
    Type        string      `json:"type"`
    Parameters  map[string]any      `json:"parameters,omitempty"`
}

type Condition struct {
    Fact    string      `json:"fact"`  // eg. employee.EmployeeStatus
    Operator    string  `json:"operator"` 
    Value any           `json:"value,omitempty"`
    Extras  map[string]any  `json:"-"`
}

type ActionSpec struct{
    Type string `json:"type"`
    Parameters map[string]any  `json:"parameters,omitempty"` 
}

type Rulev2 struct {
    Name    string `json:"name"`
    Trigger TriggerSpec `json:"trigger"`
    Conditions []Condition `json:"conditions,omitempty"`
    Actions []ActionSpec    `json:"actions"`
}
