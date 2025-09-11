//go:build unit

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

	// Check expected triggers
	triggerTypes := make(map[string]bool)
	for _, trigger := range metadata.Triggers {
		triggerTypes[trigger.Type] = true
	}
	assert.True(t, triggerTypes["event_definition"])
	assert.True(t, triggerTypes["scheduled_event"])
	assert.True(t, triggerTypes["link_job_to_competency"])
	assert.True(t, triggerTypes["roles"])
	assert.True(t, triggerTypes["competency_prerequisite"])

	// Check expected actions
	actionTypes := make(map[string]bool)
	for _, action := range metadata.Actions {
		actionTypes[action.Type] = true
	}
	assert.True(t, actionTypes["notification"])
	assert.True(t, actionTypes["create_event"]) // Changed from schedule_training to create_event
	assert.True(t, actionTypes["competency_assignment"])
	assert.True(t, actionTypes["webhook"])
	assert.True(t, actionTypes["audit_log"])
}

func TestGetTriggerMetadata(t *testing.T) {
	triggers := getTriggerMetadata()
	assert.NotEmpty(t, triggers)

	// Find and test scheduled_event trigger
	var scheduledEventTrigger *TriggerMetadata
	for _, trigger := range triggers {
		if trigger.Type == "scheduled_event" {
			tr := trigger
			scheduledEventTrigger = &tr
			break
		}
	}
	assert.NotNil(t, scheduledEventTrigger)
	assert.Equal(t, "Scheduled Event", scheduledEventTrigger.Name)
	assert.Contains(t, scheduledEventTrigger.Description, "scheduled event")
	assert.GreaterOrEqual(t, len(scheduledEventTrigger.Parameters), 1)

	// Validate presence of operation and update_field params
	var opParam *Parameter
	var updateFieldParam *Parameter
	for i := range scheduledEventTrigger.Parameters {
		p := scheduledEventTrigger.Parameters[i]
		if p.Name == "operation" {
			opParam = &p
		}
		if p.Name == "update_field" {
			updateFieldParam = &p
		}
	}
	if assert.NotNil(t, opParam) {
		assert.Equal(t, "string", opParam.Type)
		assert.True(t, opParam.Required)
		if assert.NotEmpty(t, opParam.Options) {
			opts := map[any]bool{}
			for _, o := range opParam.Options {
				opts[o] = true
			}
			assert.True(t, opts["create"])
			assert.True(t, opts["update"])
			assert.True(t, opts["delete"])
		}
	}
	if assert.NotNil(t, updateFieldParam) {
		assert.Equal(t, "string", updateFieldParam.Type)
		assert.False(t, updateFieldParam.Required)
	}
}

func TestGetActionMetadata(t *testing.T) {
	actions := getActionMetadata()
	assert.NotEmpty(t, actions)

	// notification
	var notificationAction *ActionMetadata
	for _, action := range actions {
		if action.Type == "notification" {
			a := action
			notificationAction = &a
			break
		}
	}
	if assert.NotNil(t, notificationAction) {
		assert.Equal(t, "Send Notification", notificationAction.Name)
		assert.Contains(t, notificationAction.Description, "notification")

		recipientParam := notificationAction.Parameters[1]
		assert.Equal(t, "recipient", recipientParam.Name)
		assert.Equal(t, "string", recipientParam.Type)
		assert.True(t, recipientParam.Required)
		assert.NotEmpty(t, recipientParam.Description)
		assert.NotNil(t, recipientParam.Example)
	}

	// webhook
	var webhookAction *ActionMetadata
	for _, action := range actions {
		if action.Type == "webhook" {
			a := action
			webhookAction = &a
			break
		}
	}
	if assert.NotNil(t, webhookAction) {
		assert.Equal(t, "HTTP Webhook", webhookAction.Name)
		assert.Len(t, webhookAction.Parameters, 3)
		methodParam := webhookAction.Parameters[1]
		assert.Equal(t, "method", methodParam.Name)
		assert.False(t, methodParam.Required)
	}
}

func TestGetFactMetadata(t *testing.T) {
	facts := getFactMetadata()
	assert.NotEmpty(t, facts)

	// Representative string fact
	var compNameFact *FactMetadata
	for _, fact := range facts {
		if fact.Name == "competency.CompetencyName" {
			f := fact
			compNameFact = &f
			break
		}
	}
	if assert.NotNil(t, compNameFact) {
		assert.Equal(t, "string", compNameFact.Type)
		assert.Contains(t, compNameFact.Operators, "equals")
		assert.Contains(t, compNameFact.Operators, "notEquals")
	}

	// Boolean fact
	var isActiveFact *FactMetadata
	for _, fact := range facts {
		if fact.Name == "competency.IsActive" {
			f := fact
			isActiveFact = &f
			break
		}
	}
	if assert.NotNil(t, isActiveFact) {
		assert.Equal(t, "boolean", isActiveFact.Type)
		assert.Contains(t, isActiveFact.Operators, "isTrue")
		assert.Contains(t, isActiveFact.Operators, "isFalse")
	}

	// Number fact
	var maxAttendeesFact *FactMetadata
	for _, fact := range facts {
		if fact.Name == "scheduledEvent.MaximumAttendees" {
			f := fact
			maxAttendeesFact = &f
			break
		}
	}
	if assert.NotNil(t, maxAttendeesFact) {
		assert.Equal(t, "number", maxAttendeesFact.Type)
		assert.Contains(t, maxAttendeesFact.Operators, "greaterThan")
		assert.Contains(t, maxAttendeesFact.Operators, "lessThan")
	}

	// Roles fact
	var roleNameFact *FactMetadata
	for _, fact := range facts {
		if fact.Name == "role.RoleName" {
			f := fact
			roleNameFact = &f
			break
		}
	}
	assert.NotNil(t, roleNameFact)
}

func TestGetOperatorMetadata(t *testing.T) {
	operators := getOperatorMetadata()
	assert.NotEmpty(t, operators)

	operatorMap := make(map[string]OperatorMetadata)
	for _, op := range operators {
		operatorMap[op.Name] = op
	}

	// equals
	if equals, ok := operatorMap["equals"]; assert.True(t, ok) {
		assert.Equal(t, "==", equals.Symbol)
		assert.Contains(t, equals.Description, "equal")
		assert.Contains(t, equals.Types, "string")
		assert.Contains(t, equals.Types, "number")
		assert.Contains(t, equals.Types, "boolean")
	}

	// contains
	if contains, ok := operatorMap["contains"]; assert.True(t, ok) {
		assert.Equal(t, "contains", contains.Symbol)
		assert.Contains(t, contains.Description, "contains")
		assert.Equal(t, []string{"string"}, contains.Types)
	}

	// boolean operators
	if isTrue, ok := operatorMap["isTrue"]; assert.True(t, ok) {
		assert.Equal(t, "isTrue", isTrue.Symbol)
		assert.Equal(t, []string{"boolean"}, isTrue.Types)
	}
	if isFalse, ok := operatorMap["isFalse"]; assert.True(t, ok) {
		assert.Equal(t, "isFalse", isFalse.Symbol)
		assert.Equal(t, []string{"boolean"}, isFalse.Types)
	}

	// numeric/date operators
	if gt, ok := operatorMap["greaterThan"]; assert.True(t, ok) {
		assert.Equal(t, ">", gt.Symbol)
		assert.Contains(t, gt.Types, "number")
		assert.Contains(t, gt.Types, "date")
	}
	if gte, ok := operatorMap["greaterThanEqual"]; assert.True(t, ok) {
		assert.Equal(t, ">=", gte.Symbol)
		assert.Contains(t, gte.Types, "number")
		assert.Contains(t, gte.Types, "date")
	}
	if lte, ok := operatorMap["lessThanEqual"]; assert.True(t, ok) {
		assert.Equal(t, "<=", lte.Symbol)
		assert.Contains(t, lte.Types, "number")
		assert.Contains(t, lte.Types, "date")
	}

	// date-only operators
	if before, ok := operatorMap["before"]; assert.True(t, ok) {
		assert.Equal(t, "before", before.Symbol)
		assert.Equal(t, []string{"date"}, before.Types)
	}
	if after, ok := operatorMap["after"]; assert.True(t, ok) {
		assert.Equal(t, "after", after.Symbol)
		assert.Equal(t, []string{"date"}, after.Types)
	}
}

func TestMetadataCompleteness(t *testing.T) {
	metadata := GetRulesMetadata()

	for _, trigger := range metadata.Triggers {
		assert.NotEmpty(t, trigger.Type)
		assert.NotEmpty(t, trigger.Name)
		assert.NotEmpty(t, trigger.Description)

		for _, param := range trigger.Parameters {
			assert.NotEmpty(t, param.Name)
			assert.NotEmpty(t, param.Type)
			assert.NotEmpty(t, param.Description)
		}
	}

	for _, action := range metadata.Actions {
		assert.NotEmpty(t, action.Type)
		assert.NotEmpty(t, action.Name)
		assert.NotEmpty(t, action.Description)

		for _, param := range action.Parameters {
			assert.NotEmpty(t, param.Name)
			assert.NotEmpty(t, param.Type)
			assert.NotEmpty(t, param.Description)
		}
	}

	for _, fact := range metadata.Facts {
		assert.NotEmpty(t, fact.Name)
		assert.NotEmpty(t, fact.Type)
		assert.NotEmpty(t, fact.Description)
		assert.NotEmpty(t, fact.Operators)
	}

	for _, operator := range metadata.Operators {
		assert.NotEmpty(t, operator.Name)
		assert.NotEmpty(t, operator.Symbol)
		assert.NotEmpty(t, operator.Description)
		assert.NotEmpty(t, operator.Types)
	}
}
