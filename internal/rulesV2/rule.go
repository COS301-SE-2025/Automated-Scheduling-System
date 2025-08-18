package rulesv2

type TriggerSpec struct {
    Type       string         `json:"type"`
    Parameters map[string]any `json:"parameters,omitempty"`
}

type Condition struct {
    Fact     string         `json:"fact"`
    Operator string         `json:"operator"`
    Value    any            `json:"value,omitempty"`
    Extras   map[string]any `json:"-"`
}

type ActionSpec struct {
    Type       string         `json:"type"`
    Parameters map[string]any `json:"parameters,omitempty"`
}

// UI snapshot to persist canvas positions and edges
type UIPosition struct {
    X float64 `json:"x"`
    Y float64 `json:"y"`
}
type UINode struct {
    Type     string     `json:"type"`
    Position UIPosition `json:"position"`
}
type UIEdge struct {
    ID     string `json:"id,omitempty"`
    Source string `json:"source"`
    Target string `json:"target"`
}
type UISnapshot struct {
    Nodes map[string]UINode `json:"nodes,omitempty"`
    Edges []UIEdge          `json:"edges,omitempty"`
}

type Rulev2 struct {
    Name       string       `json:"name"`
    Trigger    TriggerSpec  `json:"trigger"`
    Conditions []Condition  `json:"conditions,omitempty"`
    Actions    []ActionSpec `json:"actions"`
    UI         *UISnapshot  `json:"_ui,omitempty"`
}
