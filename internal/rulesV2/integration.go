package rulesv2

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"Automated-Scheduling-Project/internal/database/gen_models"

	"gorm.io/gorm"
)

// RuleBackEndService orchestrates the rules engine with job matrix operations
type RuleBackEndService struct {
	DB     *gorm.DB
	Engine *Engine
	Store  *DbRuleStore
}

// NewRuleBackEndService creates a new integration service with all components wired
func NewRuleBackEndService(db *gorm.DB) *RuleBackEndService {
	// Create registry with all components
	registry := NewRegistryWithDefaults().
		UseFactResolver(EmployeeFacts{}).
		UseFactResolver(CompetencyFacts{}).
		UseFactResolver(EventFacts{}).
		UseTrigger("job_matrix_update", &JobMatrixTrigger{DB: db}).
		UseTrigger("scheduled_competency_check", &ScheduledCompetencyCheckTrigger{DB: db}).
		UseTrigger("new_hire", &NewHireTrigger{DB: db}).
		UseAction("notification", &NotificationAction{DB: db}).
		UseAction("schedule_training", &ScheduleTrainingAction{DB: db}).
		UseAction("competency_assignment", &CompetencyAssignmentAction{DB: db}).
		UseAction("job_matrix_update", &JobMatrixUpdateAction{DB: db}).
		UseAction("webhook", &WebhookAction{}).
		UseAction("audit_log", &AuditLogAction{DB: db})

	engine := &Engine{
		R:                       registry,
		ContinueActionsOnError:  true,
		StopOnFirstConditionErr: false,
	}

	store := &DbRuleStore{DB: db}

	return &RuleBackEndService{
		DB:     db,
		Engine: engine,
		Store:  store,
	}
}

// OnJobMatrixUpdate triggers rules when job matrix entries are modified
func (s *RuleBackEndService) OnJobMatrixUpdate(ctx context.Context, employeeNumber string, competencyID int32, action string) error {
	data := map[string]any{
		"employeeNumber": employeeNumber,
		"competencyID":   competencyID,
		"action":         action,
	}

	return DispatchEvent(ctx, s.Engine, s.Store, "job_matrix_update", data)
}

// OnNewHire triggers rules for new employee
func (s *RuleBackEndService) OnNewHire(ctx context.Context, employeeNumber string) error {
	data := map[string]any{
		"employeeNumber": employeeNumber,
	}

	return DispatchEvent(ctx, s.Engine, s.Store, "new_hire", data)
}

// RunScheduledChecks runs periodic competency and compliance checks
func (s *RuleBackEndService) RunScheduledChecks(ctx context.Context) error {
	data := map[string]any{
		"intervalDays": 1, // daily check
	}

	return DispatchEvent(ctx, s.Engine, s.Store, "scheduled_competency_check", data)
}

// CreateSampleRules creates some example rules for demonstration
func (s *RuleBackEndService) CreateSampleRules(ctx context.Context) error {
	sampleRules := []Rulev2{
		{
			Name: "Notify Manager on Critical Competency Gap",
			Trigger: TriggerSpec{
				Type: "job_matrix_update",
			},
			Conditions: []Condition{
				{
					Fact:     "employee.Employeestatus",
					Operator: "equals",
					Value:    "Active",
				},
			},
			Actions: []ActionSpec{
				{
					Type: "notification",
					Parameters: map[string]any{
						"recipient": "manager@company.com",
						"subject":   "Critical Competency Gap Identified",
						"message":   "Employee needs training",
					},
				},
			},
		},
	}

	// Convert to database storage format and save
	for i, rule := range sampleRules {
		ruleData, err := json.Marshal(rule)
		if err != nil {
			return fmt.Errorf("failed to marshal rule %s: %w", rule.Name, err)
		}

		dbRule := gen_models.DbRule{
			ID:      fmt.Sprintf("rule_%d", i+1),
			Type:    rule.Trigger.Type,
			Enabled: true,
			Body:    string(ruleData),
		}

		if err := s.DB.Create(&dbRule).Error; err != nil {
			log.Printf("Failed to create rule %s: %v", rule.Name, err)
		} else {
			log.Printf("Created sample rule: %s", rule.Name)
		}
	}

	return nil
}

// DbRuleStore implements RuleStore interface for database persistence
type DbRuleStore struct {
	DB *gorm.DB
}

func (s *DbRuleStore) ListByTrigger(ctx context.Context, triggerType string) ([]Rulev2, error) {
	var dbRules []gen_models.DbRule
	err := s.DB.Where("type = ? AND enabled = ?", triggerType, true).Find(&dbRules).Error
	if err != nil {
		return nil, err
	}

	var rules []Rulev2
	for _, dbRule := range dbRules {
		var rule Rulev2
		if err := json.Unmarshal([]byte(dbRule.Body), &rule); err != nil {
			log.Printf("Failed to unmarshal rule %s: %v", dbRule.ID, err)
			continue
		}
		rules = append(rules, rule)
	}

	return rules, nil
}

// GetRuleByID retrieves a specific rule by ID
func (s *DbRuleStore) GetRuleByID(ctx context.Context, ruleID string) (*Rulev2, error) {
	var dbRule gen_models.DbRule
	err := s.DB.Where("id = ?", ruleID).First(&dbRule).Error
	if err != nil {
		return nil, err
	}

	var rule Rulev2
	if err := json.Unmarshal([]byte(dbRule.Body), &rule); err != nil {
		return nil, fmt.Errorf("failed to unmarshal rule: %w", err)
	}

	return &rule, nil
}

// CreateRule creates a new rule in the database
func (s *DbRuleStore) CreateRule(ctx context.Context, rule Rulev2, ruleID string) error {
	ruleData, err := json.Marshal(rule)
	if err != nil {
		return fmt.Errorf("failed to marshal rule: %w", err)
	}

	dbRule := gen_models.DbRule{
		ID:      ruleID,
		Type:    rule.Trigger.Type,
		Enabled: true,
		Body:    string(ruleData),
	}

	return s.DB.Create(&dbRule).Error
}

// UpdateRule updates an existing rule
func (s *DbRuleStore) UpdateRule(ctx context.Context, ruleID string, rule Rulev2) error {
	ruleData, err := json.Marshal(rule)
	if err != nil {
		return fmt.Errorf("failed to marshal rule: %w", err)
	}

	return s.DB.Model(&gen_models.DbRule{}).
		Where("id = ?", ruleID).
		Updates(map[string]interface{}{
			"type": rule.Trigger.Type,
			"body": string(ruleData),
		}).Error
}

// DeleteRule removes a rule from the database
func (s *DbRuleStore) DeleteRule(ctx context.Context, ruleID string) error {
	return s.DB.Where("id = ?", ruleID).Delete(&gen_models.DbRule{}).Error
}

// EnableRule enables or disables a rule
func (s *DbRuleStore) EnableRule(ctx context.Context, ruleID string, enabled bool) error {
	return s.DB.Model(&gen_models.DbRule{}).
		Where("id = ?", ruleID).
		Update("enabled", enabled).Error
}

// ListAllRules returns all rules in the system
func (s *DbRuleStore) ListAllRules(ctx context.Context) ([]Rulev2, error) {
	var dbRules []gen_models.DbRule
	err := s.DB.Find(&dbRules).Error
	if err != nil {
		return nil, err
	}

	var rules []Rulev2
	for _, dbRule := range dbRules {
		var rule Rulev2
		if err := json.Unmarshal([]byte(dbRule.Body), &rule); err != nil {
			log.Printf("Failed to unmarshal rule %s: %v", dbRule.ID, err)
			continue
		}
		rules = append(rules, rule)
	}

	return rules, nil
}

// GetRuleStats returns statistics about rules in the system
func (s *DbRuleStore) GetRuleStats(ctx context.Context) (map[string]interface{}, error) {
	var totalRules int64
	var enabledRules int64
	var rulesByType []struct {
		Type  string
		Count int64
	}

	// Count total rules
	if err := s.DB.Model(&gen_models.DbRule{}).Count(&totalRules).Error; err != nil {
		return nil, err
	}

	// Count enabled rules
	if err := s.DB.Model(&gen_models.DbRule{}).Where("enabled = ?", true).Count(&enabledRules).Error; err != nil {
		return nil, err
	}

	// Count rules by type
	if err := s.DB.Model(&gen_models.DbRule{}).
		Select("type, count(*) as count").
		Group("type").
		Scan(&rulesByType).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_rules":    totalRules,
		"enabled_rules":  enabledRules,
		"disabled_rules": totalRules - enabledRules,
		"rules_by_type":  rulesByType,
	}, nil
}
