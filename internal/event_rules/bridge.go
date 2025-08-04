package event_rules

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	rules "Automated-Scheduling-Project/internal/rule_engine"
	"fmt"
)

// EventRuleBridge connects the event system with the rule engine
type EventRuleBridge struct {
	engine *rules.Engine
}

func NewEventRuleBridge(engine *rules.Engine) *EventRuleBridge {
	return &EventRuleBridge{engine: engine}
}

// ConvertEventToMedicalCheck converts an event to a medical check for rule validation
func (b *EventRuleBridge) ConvertEventToMedicalCheck(event gen_models.Event, userID int64) *rules.MedicalCheck {
	// Extract check type from event type or use event type directly
	checkType := "general"
	if event.EventType != "" {
		checkType = event.EventType
	}

	return &rules.MedicalCheck{
		ID:        fmt.Sprintf("event-%d", event.ID),
		UserID:    userID,
		CheckType: checkType,
		StartTime: event.StartTime,
		EndTime:   event.EndTime,
		Result:    "", // Will be populated after the event
	}
}

// ValidateEventScheduling validates an event against all rules
func (b *EventRuleBridge) ValidateEventScheduling(event gen_models.Event, userID int64, existingEvents []gen_models.Event, user gen_models.User) []error {
	medicalCheck := b.ConvertEventToMedicalCheck(event, userID)

	// Convert existing events to schedule
	schedule := rules.Schedule{
		Checks: make([]rules.MedicalCheck, 0, len(existingEvents)),
	}

	for _, existingEvent := range existingEvents {
		if check := b.ConvertEventToMedicalCheck(existingEvent, userID); check != nil {
			schedule.Checks = append(schedule.Checks, *check)
		}
	}

	return b.engine.ValidateCheck(*medicalCheck, schedule, user)
}

// CreateRuleBasedEvent creates an event from a medical check (for scheduled rules)
func (b *EventRuleBridge) CreateRuleBasedEvent(check rules.MedicalCheck, user gen_models.User) gen_models.Event {
	return gen_models.Event{
		Title:           fmt.Sprintf("%s Check - %s", check.CheckType, user.Username),
		EventType:       check.CheckType,
		RelevantParties: user.Username,
		StartTime:       check.StartTime,
		EndTime:         check.EndTime,
		AllDay:          false,
	}
}
