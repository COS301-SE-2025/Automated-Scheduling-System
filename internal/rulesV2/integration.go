package rulesv2

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"

	// swap to your models.Rule (rules table)
	"Automated-Scheduling-Project/internal/database/models"

	"gorm.io/datatypes"
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

	// ensure rules table exists
	if err := db.AutoMigrate(&models.Rule{}); err != nil {
		panic(err)
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
	// sampleRules := []Rulev2{
	// 	{
	// 		Name: "Notify Manager on Critical Competency Gap",
	// 		Trigger: TriggerSpec{
	// 			Type: "job_matrix_update",
	// 		},
	// 		Conditions: []Condition{
	// 			{
	// 				Fact:     "employee.Employeestatus",
	// 				Operator: "equals",
	// 				Value:    "Active",
	// 			},
	// 		},
	// 		Actions: []ActionSpec{
	// 			{
	// 				Type: "notification",
	// 				Parameters: map[string]any{
	// 					"recipient": "manager@company.com",
	// 					"subject":   "Critical Competency Gap Identified",
	// 					"message":   "Employee needs training",
	// 				},
	// 			},
	// 		},
	// 	},
	// }

	// // Save into rules table (models.Rule)
	// for _, rule := range sampleRules {
	// 	body, err := json.Marshal(rule)
	// 	if err != nil {
	// 		return fmt.Errorf("failed to marshal rule %s: %w", rule.Name, err)
	// 	}
	// 	row := models.Rule{
	// 		Name:        rule.Name,
	// 		TriggerType: rule.Trigger.Type,
	// 		Spec:        datatypes.JSON(body),
	// 		Enabled:     true,
	// 	}
	// 	if err := s.DB.Create(&row).Error; err != nil {
	// 		log.Printf("Failed to create rule %s: %v", rule.Name, err)
	// 	} else {
	// 		log.Printf("Created sample rule: %s (id=%d)", rule.Name, row.ID)
	// 	}
	// }

	return nil
}

// DbRuleStore implements RuleStore interface for database persistence (uses models.Rule -> table "rules")
type DbRuleStore struct {
	DB *gorm.DB
}

func (s *DbRuleStore) ListByTrigger(ctx context.Context, triggerType string) ([]Rulev2, error) {
	var rows []models.Rule
	if err := s.DB.WithContext(ctx).
		Where("trigger_type = ? AND enabled = ?", triggerType, true).
		Order("id ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]Rulev2, 0, len(rows))
	for _, r := range rows {
		var spec Rulev2
		if err := json.Unmarshal(r.Spec, &spec); err != nil {
			log.Printf("Failed to unmarshal rule id=%d: %v", r.ID, err)
			continue
		}
		out = append(out, spec)
	}
	return out, nil
}

func (s *DbRuleStore) GetRuleByID(ctx context.Context, ruleID string) (*Rulev2, error) {
	id, err := strconv.ParseUint(ruleID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid rule id: %w", err)
	}
	var row models.Rule
	if err := s.DB.WithContext(ctx).First(&row, uint(id)).Error; err != nil {
		return nil, err
	}
	var spec Rulev2
	if err := json.Unmarshal(row.Spec, &spec); err != nil {
		return nil, fmt.Errorf("failed to unmarshal rule: %w", err)
	}
	return &spec, nil
}

func (s *DbRuleStore) CreateRule(ctx context.Context, rule Rulev2, _ string) error {
	body, err := json.Marshal(rule)
	if err != nil {
		return fmt.Errorf("failed to marshal rule: %w", err)
	}
	row := models.Rule{
		Name:        rule.Name,
		TriggerType: rule.Trigger.Type,
		Spec:        datatypes.JSON(body),
		Enabled:     true,
	}
	return s.DB.WithContext(ctx).Create(&row).Error
}

func (s *DbRuleStore) UpdateRule(ctx context.Context, ruleID string, rule Rulev2) error {
	id, err := strconv.ParseUint(ruleID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid rule id: %w", err)
	}
	body, err := json.Marshal(rule)
	if err != nil {
		return fmt.Errorf("failed to marshal rule: %w", err)
	}
	return s.DB.WithContext(ctx).Model(&models.Rule{}).
		Where("id = ?", uint(id)).
		Updates(map[string]any{
			"name":         rule.Name,
			"trigger_type": rule.Trigger.Type,
			"spec":         datatypes.JSON(body),
		}).Error
}

func (s *DbRuleStore) DeleteRule(ctx context.Context, ruleID string) error {
	id, err := strconv.ParseUint(ruleID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid rule id: %w", err)
	}
	return s.DB.WithContext(ctx).Delete(&models.Rule{}, uint(id)).Error
}

func (s *DbRuleStore) EnableRule(ctx context.Context, ruleID string, enabled bool) error {
	id, err := strconv.ParseUint(ruleID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid rule id: %w", err)
	}
	return s.DB.WithContext(ctx).Model(&models.Rule{}).
		Where("id = ?", uint(id)).
		Update("enabled", enabled).Error
}

func (s *DbRuleStore) ListAllRules(ctx context.Context) ([]Rulev2, error) {
	var rows []models.Rule
	if err := s.DB.WithContext(ctx).Order("id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]Rulev2, 0, len(rows))
	for _, r := range rows {
		var spec Rulev2
		if err := json.Unmarshal(r.Spec, &spec); err != nil {
			log.Printf("Failed to unmarshal rule id=%d: %v", r.ID, err)
			continue
		}
		out = append(out, spec)
	}
	return out, nil
}

func (s *DbRuleStore) GetRuleStats(ctx context.Context) (map[string]interface{}, error) {
	var total int64
	var enabled int64
	type byType struct {
		TriggerType string
		Count       int64
	}

	if err := s.DB.WithContext(ctx).Model(&models.Rule{}).Count(&total).Error; err != nil {
		return nil, err
	}
	if err := s.DB.WithContext(ctx).Model(&models.Rule{}).
		Where("enabled = ?", true).
		Count(&enabled).Error; err != nil {
		return nil, err
	}
	var rows []byType
	if err := s.DB.WithContext(ctx).Model(&models.Rule{}).
		Select("trigger_type, COUNT(*) as count").
		Group("trigger_type").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_rules":    total,
		"enabled_rules":  enabled,
		"disabled_rules": total - enabled,
		"rules_by_type":  rows,
	}, nil
}
