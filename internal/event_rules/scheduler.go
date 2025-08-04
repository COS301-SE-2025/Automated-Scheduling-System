package event_rules

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	rules "Automated-Scheduling-Project/internal/rule_engine"
	"log"
	"time"

	"gorm.io/gorm"
)

type RuleScheduler struct {
	db     *gorm.DB
	bridge *EventRuleBridge
}

func NewRuleScheduler(db *gorm.DB, bridge *EventRuleBridge) *RuleScheduler {
	return &RuleScheduler{
		db:     db,
		bridge: bridge,
	}
}

// RunScheduledRules executes all scheduled rules and creates events
func (rs *RuleScheduler) RunScheduledRules() error {
	// Get all users
	var users []gen_models.User
	if err := rs.db.Find(&users).Error; err != nil {
		return err
	}

	now := time.Now()

	// Define callback functions
	newCheckFunc := func(check rules.MedicalCheck) error {
		// Find the user
		var user gen_models.User
		if err := rs.db.First(&user, check.UserID).Error; err != nil {
			log.Printf("Error finding user %d: %v", check.UserID, err)
			return err
		}

		// Create event from medical check
		event := rs.bridge.CreateRuleBasedEvent(check, user)
		if err := rs.db.Create(&event).Error; err != nil {
			log.Printf("Error creating event: %v", err)
			return err
		}

		// Link event to user
		userEvent := gen_models.UserEvent{
			UserID:  check.UserID,
			EventID: event.ID,
		}
		if err := rs.db.Create(&userEvent).Error; err != nil {
			log.Printf("Error linking event to user: %v", err)
			return err
		}

		log.Printf("Created scheduled event: %s for user %d", event.Title, check.UserID)
		return nil
	}

	notifyFunc := func(notification rules.Notification) error {
		// Here you could integrate with your notification system
		log.Printf("Notification for user %d: %s - %s",
			notification.ToUserID, notification.Subject, notification.Message)
		// In the future, you could save notifications to database or send emails
		return nil
	}

	// Run the scheduled rules
	rs.bridge.engine.RunScheduled(now, users, newCheckFunc, notifyFunc)
	return nil
}

// LoadRulesFromDatabase loads all rules from database and creates a new engine
func LoadRulesFromDatabase(db *gorm.DB) (*rules.Engine, error) {
	var dbRules []models.DBRule
	if err := db.Find(&dbRules).Error; err != nil {
		return nil, err
	}

	var engineRules []rules.Rule
	for _, dbRule := range dbRules {
		if !dbRule.Enabled {
			continue
		}

		// Convert models.RawRuleJSON to rules.RawRule
		engineRule := rules.RawRule{
			ID:         dbRule.Body.ID,
			Type:       dbRule.Body.Type,
			Enabled:    dbRule.Body.Enabled,
			Target:     dbRule.Body.Target,
			Conditions: dbRule.Body.Conditions,
			Params:     dbRule.Body.Params,
			When:       dbRule.Body.When,
		}

		// Convert frequency if present
		if dbRule.Body.Frequency != nil {
			engineRule.Frequency = &rules.Period{
				Years:  dbRule.Body.Frequency.Years,
				Months: dbRule.Body.Frequency.Months,
				Days:   dbRule.Body.Frequency.Days,
			}
		}

		// Convert actions
		if len(dbRule.Body.Actions) > 0 {
			engineRule.Actions = make([]rules.RawAction, len(dbRule.Body.Actions))
			for i, action := range dbRule.Body.Actions {
				engineRule.Actions[i] = rules.RawAction{
					Type:   action.Type,
					Params: action.Params,
				}
			}
		}

		rule, err := rules.BuildRule(engineRule)
		if err != nil {
			log.Printf("Error building rule %s: %v", dbRule.ID, err)
			continue
		}
		if rule != nil {
			engineRules = append(engineRules, rule)
		}
	}

	return rules.NewEngine(engineRules), nil
}
