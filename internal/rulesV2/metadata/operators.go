package metadata

// GetOperatorMetadata returns metadata for all available operators
func GetOperatorMetadata() []OperatorMetadata {
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