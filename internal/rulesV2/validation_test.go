//go:build unit

package rulesv2

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateRuleParameters(t *testing.T) {
	t.Run("ValidRule", func(t *testing.T) {
		rule := Rulev2{
			Name: "Valid Rule",
			Trigger: TriggerSpec{
				Type: "scheduled_event",
			},
			Actions: []ActionSpec{
				{
					Type: "notification",
					Parameters: map[string]any{
						"recipient": "test@example.com",
						"subject":   "Test Subject",
						"message":   "Test Message",
						"type":      "email",
					},
				},
			},
		}

		result := ValidateRuleParameters(rule)
		assert.True(t, result.Valid)
		assert.Empty(t, result.Errors)
	})

	t.Run("InvalidTriggerType", func(t *testing.T) {
		rule := Rulev2{
			Name: "Invalid Rule",
			Trigger: TriggerSpec{
				Type: "invalid_trigger",
			},
			Actions: []ActionSpec{},
		}

		result := ValidateRuleParameters(rule)
		assert.False(t, result.Valid)
		assert.Len(t, result.Errors, 1)
		assert.Contains(t, result.Errors[0].Message, "Unknown trigger type")
	})

	t.Run("InvalidActionType", func(t *testing.T) {
		rule := Rulev2{
			Name: "Invalid Rule",
			Trigger: TriggerSpec{
				Type: "scheduled_event",
			},
			Actions: []ActionSpec{
				{
					Type: "invalid_action",
				},
			},
		}

		result := ValidateRuleParameters(rule)
		assert.False(t, result.Valid)
		assert.Len(t, result.Errors, 1)
		assert.Contains(t, result.Errors[0].Message, "Unknown action type")
	})

	t.Run("MissingRequiredParameters", func(t *testing.T) {
		rule := Rulev2{
			Name: "Invalid Rule",
			Trigger: TriggerSpec{
				Type: "scheduled_event",
			},
			Actions: []ActionSpec{
				{
					Type: "notification",
					Parameters: map[string]any{
						"recipient": "test@example.com",
						// Missing required "subject" and "message"
					},
				},
			},
		}

		result := ValidateRuleParameters(rule)
		assert.False(t, result.Valid)
		assert.GreaterOrEqual(t, len(result.Errors), 2) // Missing subject and message
	})

	t.Run("WrongParameterTypes", func(t *testing.T) {
		rule := Rulev2{
			Name: "Invalid Rule",
			Trigger: TriggerSpec{
				Type: "scheduled_event",
			},
			Actions: []ActionSpec{
				{
					Type: "notification",
					Parameters: map[string]any{
						"recipient": 123,    // Should be string
						"subject":   "test", // Correct
						"message":   "",     // Empty but technically a string
					},
				},
			},
		}

		result := ValidateRuleParameters(rule)
		assert.False(t, result.Valid)
		assert.GreaterOrEqual(t, len(result.Errors), 1) // At least 1 error for wrong type
	})
}

func TestFindTriggerMetadata(t *testing.T) {
	t.Run("ValidTrigger", func(t *testing.T) {
		meta := findTriggerMetadata("scheduled_event")
		assert.NotNil(t, meta)
		assert.Equal(t, "scheduled_event", meta.Type)
		assert.Equal(t, "Scheduled Event", meta.Name)
	})

	t.Run("InvalidTrigger", func(t *testing.T) {
		meta := findTriggerMetadata("invalid_trigger")
		assert.Nil(t, meta)
	})
}

func TestFindActionMetadata(t *testing.T) {
	t.Run("ValidAction", func(t *testing.T) {
		meta := findActionMetadata("notification")
		assert.NotNil(t, meta)
		assert.Equal(t, "notification", meta.Type)
		assert.Equal(t, "Send Notification", meta.Name)
	})

	t.Run("InvalidAction", func(t *testing.T) {
		meta := findActionMetadata("invalid_action")
		assert.Nil(t, meta)
	})
}

func TestValidateParameterType(t *testing.T) {
	t.Run("ValidString", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "string",
			Required: true,
		}
		err := validateParameterType(param, "valid string")
		assert.NoError(t, err)
	})

	t.Run("InvalidString", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "string",
			Required: true,
		}
		err := validateParameterType(param, 123)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must be a string")
	})

	t.Run("ValidNumber", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "number",
			Required: true,
		}

		// Test various number types
		assert.NoError(t, validateParameterType(param, 123))
		assert.NoError(t, validateParameterType(param, int32(123)))
		assert.NoError(t, validateParameterType(param, int64(123)))
		assert.NoError(t, validateParameterType(param, float32(123.5)))
		assert.NoError(t, validateParameterType(param, float64(123.5)))
	})

	t.Run("InvalidNumber", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "number",
			Required: true,
		}
		err := validateParameterType(param, "not a number")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must be a number")
	})

	t.Run("ValidBoolean", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "boolean",
			Required: true,
		}
		assert.NoError(t, validateParameterType(param, true))
		assert.NoError(t, validateParameterType(param, false))
	})

	t.Run("InvalidBoolean", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "boolean",
			Required: true,
		}
		err := validateParameterType(param, "not a boolean")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must be a boolean")
	})

	t.Run("ValidDate", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "date",
			Required: true,
		}
		assert.NoError(t, validateParameterType(param, "2025-01-01"))
		assert.NoError(t, validateParameterType(param, "2025-01-01T10:00:00Z"))
	})

	t.Run("InvalidDate", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "date",
			Required: true,
		}
		err := validateParameterType(param, "invalid-date")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must be a valid date")
	})

	t.Run("ValidArray", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "array",
			Required: true,
		}
		assert.NoError(t, validateParameterType(param, []string{"a", "b", "c"}))
		assert.NoError(t, validateParameterType(param, []int{1, 2, 3}))
	})

	t.Run("InvalidArray", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "array",
			Required: true,
		}
		err := validateParameterType(param, "not an array")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must be an array")
	})

	t.Run("ValidObject", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "object",
			Required: true,
		}
		assert.NoError(t, validateParameterType(param, map[string]any{"key": "value"}))
	})

	t.Run("InvalidObject", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "object",
			Required: true,
		}
		err := validateParameterType(param, "not an object")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must be an object")
	})

	t.Run("UnknownType", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "unknown_type",
			Required: true,
		}
		err := validateParameterType(param, "anything")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unknown parameter type")
	})

	t.Run("NullValueRequired", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "string",
			Required: true,
		}
		err := validateParameterType(param, nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be null")
	})

	t.Run("NullValueOptional", func(t *testing.T) {
		param := Parameter{
			Name:     "test",
			Type:     "string",
			Required: false,
		}
		err := validateParameterType(param, nil)
		assert.NoError(t, err)
	})
}
