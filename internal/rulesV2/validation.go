package rulesv2

import (
	"fmt"
	"reflect"
	"strings"
	"time"
)

// ValidationError represents a parameter validation error
type ValidationError struct {
	Parameter string `json:"parameter"`
	Message   string `json:"message"`
}

// ValidationResult represents the result of validating rule parameters
type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors,omitempty"`
}

// ValidateRuleParameters validates a rule's trigger and action parameters
func ValidateRuleParameters(rule Rulev2) ValidationResult {
	result := ValidationResult{Valid: true, Errors: []ValidationError{}}

	// Validate trigger parameters
	triggerMeta := findTriggerMetadata(rule.Trigger.Type)
	if triggerMeta == nil {
		result.Valid = false
		result.Errors = append(result.Errors, ValidationError{
			Parameter: "trigger.type",
			Message:   fmt.Sprintf("Unknown trigger type: %s", rule.Trigger.Type),
		})
	} else {
		// Validate trigger parameters (if any are provided in rule.Trigger.Parameters)
		if rule.Trigger.Parameters != nil {
			for _, param := range triggerMeta.Parameters {
				if err := validateParameter(param, rule.Trigger.Parameters); err != nil {
					result.Valid = false
					result.Errors = append(result.Errors, ValidationError{
						Parameter: fmt.Sprintf("trigger.%s", param.Name),
						Message:   err.Error(),
					})
				}
			}
		}
	}

	// Validate action parameters
	for i, action := range rule.Actions {
		actionMeta := findActionMetadata(action.Type)
		if actionMeta == nil {
			result.Valid = false
			result.Errors = append(result.Errors, ValidationError{
				Parameter: fmt.Sprintf("actions[%d].type", i),
				Message:   fmt.Sprintf("Unknown action type: %s", action.Type),
			})
			continue
		}

		// Validate action parameters
		for _, param := range actionMeta.Parameters {
			if err := validateParameter(param, action.Parameters); err != nil {
				result.Valid = false
				result.Errors = append(result.Errors, ValidationError{
					Parameter: fmt.Sprintf("actions[%d].%s", i, param.Name),
					Message:   err.Error(),
				})
			}
		}
	}

	return result
}

// findTriggerMetadata finds metadata for a specific trigger type
func findTriggerMetadata(triggerType string) *TriggerMetadata {
	triggers := getTriggerMetadata()
	for _, trigger := range triggers {
		if trigger.Type == triggerType {
			return &trigger
		}
	}
	return nil
}

// findActionMetadata finds metadata for a specific action type
func findActionMetadata(actionType string) *ActionMetadata {
	actions := getActionMetadata()
	for _, action := range actions {
		if action.Type == actionType {
			return &action
		}
	}
	return nil
}

// validateParameter validates a single parameter against its metadata
func validateParameter(param Parameter, params map[string]any) error {
	value, exists := params[param.Name]

	// Check if required parameter is missing
	if param.Required && !exists {
		return fmt.Errorf("required parameter '%s' is missing", param.Name)
	}

	// If parameter is not required and not provided, that's okay
	if !exists {
		return nil
	}

	// Validate parameter type
	if err := validateParameterType(param, value); err != nil {
		return err
	}

	// If options (enum) are provided, enforce membership
	if len(param.Options) > 0 {
		valStr := strings.ToLower(fmt.Sprint(value))
		ok := false
		for _, opt := range param.Options {
			if valStr == strings.ToLower(fmt.Sprint(opt)) {
				ok = true
				break
			}
		}
		if !ok {
			return fmt.Errorf("parameter '%s' must be one of %v", param.Name, param.Options)
		}
	}

	return nil
}

// validateParameterType validates that a parameter value matches its expected type
func validateParameterType(param Parameter, value any) error {
	if value == nil {
		if param.Required {
			return fmt.Errorf("parameter '%s' cannot be null", param.Name)
		}
		return nil
	}

	switch param.Type {
	case "string", "text_area":
		if _, ok := value.(string); !ok {
			return fmt.Errorf("parameter '%s' must be a string, got %T", param.Name, value)
		}
	case "number":
		switch value.(type) {
		case int, int32, int64, float32, float64:
			// Valid number types
		default:
			return fmt.Errorf("parameter '%s' must be a number, got %T", param.Name, value)
		}
	case "boolean":
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("parameter '%s' must be a boolean, got %T", param.Name, value)
		}
	case "date":
		// Accept string dates that can be parsed
		if str, ok := value.(string); ok {
			if _, err := time.Parse("2006-01-02", str); err != nil {
				if _, err := time.Parse(time.RFC3339, str); err != nil {
					return fmt.Errorf("parameter '%s' must be a valid date (YYYY-MM-DD or RFC3339 format)", param.Name)
				}
			}
		} else if _, ok := value.(time.Time); !ok {
			return fmt.Errorf("parameter '%s' must be a date string or time.Time, got %T", param.Name, value)
		}
	case "array":
		if reflect.TypeOf(value).Kind() != reflect.Slice {
			return fmt.Errorf("parameter '%s' must be an array, got %T", param.Name, value)
		}
	case "object":
		if reflect.TypeOf(value).Kind() != reflect.Map {
			return fmt.Errorf("parameter '%s' must be an object, got %T", param.Name, value)
		}
	default:
		return fmt.Errorf("unknown parameter type '%s' for parameter '%s'", param.Type, param.Name)
	}

	return nil
}
