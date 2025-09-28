package metadata

// GetRulesMetadata returns metadata about all available triggers, actions, facts, and operators
func GetRulesMetadata() RulesMetadata {
    return RulesMetadata{
        Triggers:  GetTriggerMetadata(),
        Actions:   GetActionMetadata(),
        Facts:     GetFactMetadata(),
        Operators: GetOperatorMetadata(),
    }
}