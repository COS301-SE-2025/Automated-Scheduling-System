//go:build unit

package metadata

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
    assert.True(t, actionTypes["create_event"])
}

func TestGetTriggerMetadata(t *testing.T) {
    triggers := GetTriggerMetadata()
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
    actions := GetActionMetadata()
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
        assert.Equal(t, "recipients", recipientParam.Name)
        assert.Equal(t, "employees", recipientParam.Type)
        assert.True(t, recipientParam.Required)
        assert.NotEmpty(t, recipientParam.Description)
        assert.NotNil(t, recipientParam.Example)
    }

}

func TestGetFactMetadata(t *testing.T) {
    facts := GetFactMetadata()
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
    operators := GetOperatorMetadata()
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

func TestScheduledTimeTriggerMetadata(t *testing.T) {
    triggers := GetTriggerMetadata()

    var sched *TriggerMetadata
    for _, tr := range triggers {
        if tr.Type == "scheduled_time" {
            tmp := tr
            sched = &tmp
            break
        }
    }
    if assert.NotNil(t, sched, "scheduled_time trigger should exist") {
        var freq, tz *Parameter
        for i := range sched.Parameters {
            p := sched.Parameters[i]
            if p.Name == "frequency" {
                freq = &p
            }
            if p.Name == "timezone" {
                tz = &p
            }
        }
        if assert.NotNil(t, freq, "frequency parameter required") {
            assert.Equal(t, "string", freq.Type)
            assert.True(t, freq.Required)
            // Expect canonical options
            opts := map[any]bool{}
            for _, o := range freq.Options {
                opts[o] = true
            }
            assert.True(t, opts["hourly"])
            assert.True(t, opts["daily"])
            assert.True(t, opts["weekly"])
            assert.True(t, opts["monthly"])
            assert.True(t, opts["once"])
            assert.True(t, opts["cron"])
            assert.Len(t, freq.Options, 6)
        }
        if assert.NotNil(t, tz, "timezone parameter required") {
            assert.Equal(t, "string", tz.Type)
            assert.False(t, tz.Required)
            // Range -12..14 inclusive -> 27 options, including UTC+0
            assert.GreaterOrEqual(t, len(tz.Options), 27)
            seen := map[any]bool{}
            for _, o := range tz.Options {
                seen[o] = true
            }
            assert.True(t, seen["UTC+0"])
            assert.True(t, seen["UTC+2"])
            assert.True(t, seen["UTC-5"])
        }
    }
}

func TestRelativeTimeTriggerMetadata(t *testing.T) {
    triggers := GetTriggerMetadata()

    var rel *TriggerMetadata
    for _, tr := range triggers {
        if tr.Type == "relative_time" {
            tmp := tr
            rel = &tmp
            break
        }
    }
    if assert.NotNil(t, rel, "relative_time trigger should exist") {
        var entity, dateField, dir, value, unit *Parameter
        for i := range rel.Parameters {
            p := rel.Parameters[i]
            switch p.Name {
            case "entity_type":
                entity = &p
            case "date_field":
                dateField = &p
            case "offset_direction":
                dir = &p
            case "offset_value":
                value = &p
            case "offset_unit":
                unit = &p
            }
        }
        if assert.NotNil(t, entity, "entity_type parameter required") {
            assert.Equal(t, "string", entity.Type)
            assert.True(t, entity.Required)
            opts := map[any]bool{}
            for _, o := range entity.Options {
                opts[o] = true
            }
            assert.True(t, opts["scheduled_event"])
            assert.True(t, opts["employee"])
            assert.True(t, opts["employee_competency"])
            assert.True(t, opts["employment_history"])
        }
        if assert.NotNil(t, dateField, "date_field parameter required") {
            assert.Equal(t, "string", dateField.Type)
            assert.True(t, dateField.Required)
            opts := map[any]bool{}
            for _, o := range dateField.Options {
                opts[o] = true
            }
            assert.True(t, opts["event_start_date"])
            assert.True(t, opts["event_end_date"])
            assert.True(t, opts["expiry_date"])
            assert.True(t, opts["termination_date"])
            assert.True(t, opts["start_date"])
        }
        if assert.NotNil(t, dir, "offset_direction parameter required") {
            assert.Equal(t, "string", dir.Type)
            assert.True(t, dir.Required)
            opts := map[any]bool{}
            for _, o := range dir.Options {
                opts[o] = true
            }
            assert.True(t, opts["before"])
            assert.True(t, opts["after"])
        }
        if assert.NotNil(t, value, "offset_value parameter required") {
            assert.Equal(t, "integer", value.Type)
            assert.True(t, value.Required)
        }
        if assert.NotNil(t, unit, "offset_unit parameter required") {
            assert.Equal(t, "string", unit.Type)
            assert.True(t, unit.Required)
            opts := map[any]bool{}
            for _, o := range unit.Options {
                opts[o] = true
            }
            assert.True(t, opts["minutes"])
            assert.True(t, opts["hours"])
            assert.True(t, opts["days"])
            assert.True(t, opts["weeks"])
            assert.True(t, opts["months"])
        }
    }
}

func TestRelativeEntityFacts(t *testing.T) {
    facts := GetFactMetadata()

    // Helper to check presence and trigger mapping
    requireFactWithTrigger := func(name, trigger string) {
        var f *FactMetadata
        for i := range facts {
            if facts[i].Name == name {
                tmp := facts[i]
                f = &tmp
                break
            }
        }
        if assert.NotNil(t, f, "missing fact %s", name) {
            found := false
            for _, tr := range f.Triggers {
                if tr == trigger {
                    found = true
                    break
                }
            }
            assert.True(t, found, "fact %s should be available for trigger %s", name, trigger)
        }
    }

    requireFactWithTrigger("employee.FirstName", "employee")
    requireFactWithTrigger("employee.TerminationDate", "employee")
    requireFactWithTrigger("employeeCompetency.ExpiryDate", "employee_competency")
    requireFactWithTrigger("employmentHistory.StartDate", "employment_history")
}