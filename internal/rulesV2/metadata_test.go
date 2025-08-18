package rulesv2

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetRulesMetadata(t *testing.T) {
	metadata := GetRulesMetadata()

	assert.NotEmpty(t, metadata.Triggers)
	assert.NotEmpty(t, metadata.Actions)
	assert.NotEmpty(t, metadata.Facts)
	assert.NotEmpty(t, metadata.Operators)

	// Check that we have expected triggers
	triggerTypes := make(map[string]bool)
	for _, trigger := range metadata.Triggers {
		triggerTypes[trigger.Type] = true
	}
	assert.True(t, triggerTypes["job_matrix_update"])
	assert.True(t, triggerTypes["new_hire"])
	assert.True(t, triggerTypes["scheduled_competency_check"])

	// Check that we have expected actions
	actionTypes := make(map[string]bool)
	for _, action := range metadata.Actions {
		actionTypes[action.Type] = true
	}
	assert.True(t, actionTypes["notification"])
	assert.True(t, actionTypes["schedule_training"])
	assert.True(t, actionTypes["competency_assignment"])
	assert.True(t, actionTypes["webhook"])
	assert.True(t, actionTypes["audit_log"])
}

func TestGetTriggerMetadata(t *testing.T) {
	triggers := getTriggerMetadata()

	assert.NotEmpty(t, triggers)

	// Find and test job_matrix_update trigger
	var jobMatrixTrigger *TriggerMetadata
	for _, trigger := range triggers {
		if trigger.Type == "job_matrix_update" {
			jobMatrixTrigger = &trigger
			break
		}
	}

	assert.NotNil(t, jobMatrixTrigger)
	assert.Equal(t, "Job Matrix Update", jobMatrixTrigger.Name)
	assert.Contains(t, jobMatrixTrigger.Description, "job matrix entries")
	assert.Len(t, jobMatrixTrigger.Parameters, 3) // employee_id, competency_id, action

	// Test parameter structure
	employeeParam := jobMatrixTrigger.Parameters[0]
	assert.Equal(t, "employee_id", employeeParam.Name)
	assert.Equal(t, "string", employeeParam.Type)
	assert.True(t, employeeParam.Required)
	assert.NotEmpty(t, employeeParam.Description)
	assert.NotNil(t, employeeParam.Example)
}

func TestGetActionMetadata(t *testing.T) {
	actions := getActionMetadata()

	assert.NotEmpty(t, actions)

	// Find and test notification action
	var notificationAction *ActionMetadata
	for _, action := range actions {
		if action.Type == "notification" {
			notificationAction = &action
			break
		}
	}

	assert.NotNil(t, notificationAction)
	assert.Equal(t, "Send Notification", notificationAction.Name)
	assert.Contains(t, notificationAction.Description, "notification")
	assert.Len(t, notificationAction.Parameters, 3) // recipient, subject, message

	// Test parameter structure
	recipientParam := notificationAction.Parameters[0]
	assert.Equal(t, "recipient", recipientParam.Name)
	assert.Equal(t, "string", recipientParam.Type)
	assert.True(t, recipientParam.Required)
	assert.NotEmpty(t, recipientParam.Description)
	assert.NotNil(t, recipientParam.Example)

	// Find and test webhook action
	var webhookAction *ActionMetadata
	for _, action := range actions {
		if action.Type == "webhook" {
			webhookAction = &action
			break
		}
	}

	assert.NotNil(t, webhookAction)
	assert.Equal(t, "HTTP Webhook", webhookAction.Name)
	assert.Len(t, webhookAction.Parameters, 3) // url, method, payload

	// Test optional parameters
	methodParam := webhookAction.Parameters[1]
	assert.Equal(t, "method", methodParam.Name)
	assert.False(t, methodParam.Required)
}

func TestGetFactMetadata(t *testing.T) {
	facts := getFactMetadata()

	assert.NotEmpty(t, facts)

	// Find and test employee fact
	var employeeStatusFact *FactMetadata
	for _, fact := range facts {
		if fact.Name == "employee.Employeestatus" {
			employeeStatusFact = &fact
			break
		}
	}

	assert.NotNil(t, employeeStatusFact)
	assert.Equal(t, "string", employeeStatusFact.Type)
	assert.Contains(t, employeeStatusFact.Description, "status")
	assert.Contains(t, employeeStatusFact.Operators, "equals")
	assert.Contains(t, employeeStatusFact.Operators, "notEquals")

	// Find and test boolean fact
	var isActiveFact *FactMetadata
	for _, fact := range facts {
		if fact.Name == "competency.IsActive" {
			isActiveFact = &fact
			break
		}
	}

	assert.NotNil(t, isActiveFact)
	assert.Equal(t, "boolean", isActiveFact.Type)
	assert.Contains(t, isActiveFact.Operators, "isTrue")
	assert.Contains(t, isActiveFact.Operators, "isFalse")

	// Find and test number fact
	var requiredLevelFact *FactMetadata
	for _, fact := range facts {
		if fact.Name == "jobMatrix.RequiredLevel" {
			requiredLevelFact = &fact
			break
		}
	}

	assert.NotNil(t, requiredLevelFact)
	assert.Equal(t, "number", requiredLevelFact.Type)
	assert.Contains(t, requiredLevelFact.Operators, "greaterThan")
	assert.Contains(t, requiredLevelFact.Operators, "lessThan")
}

func TestGetOperatorMetadata(t *testing.T) {
	operators := getOperatorMetadata()

	assert.NotEmpty(t, operators)

	// Create a map for easier testing
	operatorMap := make(map[string]OperatorMetadata)
	for _, op := range operators {
		operatorMap[op.Name] = op
	}

	// Test equals operator
	equals := operatorMap["equals"]
	assert.Equal(t, "==", equals.Symbol)
	assert.Contains(t, equals.Description, "equal")
	assert.Contains(t, equals.Types, "string")
	assert.Contains(t, equals.Types, "number")
	assert.Contains(t, equals.Types, "boolean")

	// Test string-specific operators
	contains := operatorMap["contains"]
	assert.Equal(t, "contains", contains.Symbol)
	assert.Contains(t, contains.Description, "contains")
	assert.Equal(t, []string{"string"}, contains.Types)

	startsWith := operatorMap["startsWith"]
	assert.Equal(t, "startsWith", startsWith.Symbol)
	assert.Equal(t, []string{"string"}, startsWith.Types)

	// Test boolean operators
	isTrue := operatorMap["isTrue"]
	assert.Equal(t, "isTrue", isTrue.Symbol)
	assert.Equal(t, []string{"boolean"}, isTrue.Types)

	isFalse := operatorMap["isFalse"]
	assert.Equal(t, "isFalse", isFalse.Symbol)
	assert.Equal(t, []string{"boolean"}, isFalse.Types)

	// Test numeric operators
	greaterThan := operatorMap["greaterThan"]
	assert.Equal(t, ">", greaterThan.Symbol)
	assert.Contains(t, greaterThan.Types, "number")
	assert.Contains(t, greaterThan.Types, "date")

	// Test array operators
	in := operatorMap["in"]
	assert.Equal(t, "in", in.Symbol)
	assert.Contains(t, in.Types, "string")
	assert.Contains(t, in.Types, "number")

	// Test date operators
	before := operatorMap["before"]
	assert.Equal(t, "before", before.Symbol)
	assert.Equal(t, []string{"date"}, before.Types)

	after := operatorMap["after"]
	assert.Equal(t, "after", after.Symbol)
	assert.Equal(t, []string{"date"}, after.Types)
}

func TestMetadataCompleteness(t *testing.T) {
	metadata := GetRulesMetadata()

	// Ensure all metadata has required fields
	for _, trigger := range metadata.Triggers {
		assert.NotEmpty(t, trigger.Type, "Trigger type should not be empty")
		assert.NotEmpty(t, trigger.Name, "Trigger name should not be empty")
		assert.NotEmpty(t, trigger.Description, "Trigger description should not be empty")

		for _, param := range trigger.Parameters {
			assert.NotEmpty(t, param.Name, "Parameter name should not be empty")
			assert.NotEmpty(t, param.Type, "Parameter type should not be empty")
			assert.NotEmpty(t, param.Description, "Parameter description should not be empty")
		}
	}

	for _, action := range metadata.Actions {
		assert.NotEmpty(t, action.Type, "Action type should not be empty")
		assert.NotEmpty(t, action.Name, "Action name should not be empty")
		assert.NotEmpty(t, action.Description, "Action description should not be empty")

		for _, param := range action.Parameters {
			assert.NotEmpty(t, param.Name, "Parameter name should not be empty")
			assert.NotEmpty(t, param.Type, "Parameter type should not be empty")
			assert.NotEmpty(t, param.Description, "Parameter description should not be empty")
		}
	}

	for _, fact := range metadata.Facts {
		assert.NotEmpty(t, fact.Name, "Fact name should not be empty")
		assert.NotEmpty(t, fact.Type, "Fact type should not be empty")
		assert.NotEmpty(t, fact.Description, "Fact description should not be empty")
		assert.NotEmpty(t, fact.Operators, "Fact operators should not be empty")
	}

	for _, operator := range metadata.Operators {
		assert.NotEmpty(t, operator.Name, "Operator name should not be empty")
		assert.NotEmpty(t, operator.Symbol, "Operator symbol should not be empty")
		assert.NotEmpty(t, operator.Description, "Operator description should not be empty")
		assert.NotEmpty(t, operator.Types, "Operator types should not be empty")
	}
}
