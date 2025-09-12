package rulesv2

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"

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
	registry := NewRegistryWithDefaults().
		UseFactResolver(EmployeeFacts{}).
		UseFactResolver(CompetencyFacts{}).
		UseFactResolver(EventFacts{}).
		UseFactResolver(DomainFacts{}).
		UseTrigger("job_position", NewTrigger(db, "job_position")).
		UseTrigger("competency_type", NewTrigger(db, "competency_type")).
		UseTrigger("competency", NewTrigger(db, "competency")).
		UseTrigger("event_definition", NewTrigger(db, "event_definition")).
		UseTrigger("scheduled_event", NewTrigger(db, "scheduled_event")).
		UseTrigger("roles", NewTrigger(db, "roles")).
		UseTrigger("link_job_to_competency", NewTrigger(db, "link_job_to_competency")).
		UseTrigger("competency_prerequisite", NewTrigger(db, "competency_prerequisite")).
		UseAction("notification", &NotificationAction{DB: db}).
		// UseAction("schedule_training", &ScheduleTrainingAction{DB: db}).
		UseAction("competency_assignment", &CompetencyAssignmentAction{DB: db}).
		UseAction("webhook", &WebhookAction{}).
		UseAction("audit_log", &AuditLogAction{DB: db}).
		UseAction("create_event", &CreateEventAction{DB: db})

	engine := &Engine{
		R:                       registry,
		ContinueActionsOnError:  true,
		StopOnFirstConditionErr: false,
		Debug:                   true,
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

// DbRuleStore implements RuleStore interface for database persistence (uses models.Rule -> table "rules")
type DbRuleStore struct {
	DB *gorm.DB
}

// ListAllRuleRows returns full DB rows (id, name, trigger_type, spec, enabled)
func (s *DbRuleStore) ListAllRuleRows(ctx context.Context) ([]models.Rule, error) {
	var rows []models.Rule
	if err := s.DB.WithContext(ctx).Order("id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
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

// CreateRule inserts and returns the DB id as string (so frontend can store it)
func (s *DbRuleStore) CreateRule(ctx context.Context, rule Rulev2) (string, error) {
	body, err := json.Marshal(rule)
	if err != nil {
		return "", fmt.Errorf("failed to marshal rule: %w", err)
	}
	row := models.Rule{
		Name:        rule.Name,
		TriggerType: rule.Trigger.Type,
		Spec:        datatypes.JSON(body),
		Enabled:     true,
	}
	if err := s.DB.WithContext(ctx).Create(&row).Error; err != nil {
		return "", err
	}
	return strconv.FormatUint(uint64(row.ID), 10), nil
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

// New trigger entrypoints for DispatchEvent

func (s *RuleBackEndService) OnJobPosition(ctx context.Context, operation string, jobPosition any) error {
	data := map[string]any{
		"trigger": map[string]any{
			"type":      "job_position",
			"operation": operation,
		},
	}
	if jobPosition != nil {
		data["jobPosition"] = jobPosition
	}
	return DispatchEvent(ctx, s.Engine, s.Store, "job_position", data)
}

func (s *RuleBackEndService) OnCompetencyType(ctx context.Context, operation string, competencyType any) error {
	data := map[string]any{
		"trigger": map[string]any{
			"type":      "competency_type",
			"operation": operation,
		},
	}
	if competencyType != nil {
		data["competencyType"] = competencyType
	}
	return DispatchEvent(ctx, s.Engine, s.Store, "competency_type", data)
}

func (s *RuleBackEndService) OnCompetency(ctx context.Context, operation string, competency any) error {
	data := map[string]any{
		"trigger": map[string]any{
			"type":      "competency",
			"operation": operation,
		},
	}
	if competency != nil {
		data["competency"] = competency
	}
	return DispatchEvent(ctx, s.Engine, s.Store, "competency", data)
}

func (s *RuleBackEndService) OnEventDefinition(ctx context.Context, operation string, eventDefinition any) error {
	data := map[string]any{
		"trigger": map[string]any{
			"type":      "event_definition",
			"operation": operation,
		},
	}
	if eventDefinition != nil {
		data["eventDefinition"] = eventDefinition
	}
	return DispatchEvent(ctx, s.Engine, s.Store, "event_definition", data)
}

func (s *RuleBackEndService) OnScheduledEvent(ctx context.Context, operation, updateField string, scheduledEvent any) error {
	data := map[string]any{
		"trigger": map[string]any{
			"type":        "scheduled_event",
			"operation":   operation,
			"updateField": updateField,
		},
	}
	if scheduledEvent != nil {
		data["scheduledEvent"] = scheduledEvent
	}
	return DispatchEvent(ctx, s.Engine, s.Store, "scheduled_event", data)
}

func (s *RuleBackEndService) OnRoles(ctx context.Context, operation, updateKind string, role any) error {
	data := map[string]any{
		"trigger": map[string]any{
			"type":       "roles",
			"operation":  operation,
			"updateKind": updateKind,
		},
	}
	if role != nil {
		data["role"] = role
	}
	return DispatchEvent(ctx, s.Engine, s.Store, "roles", data)
}

func (s *RuleBackEndService) OnLinkJobToCompetency(ctx context.Context, operation string, link any, jobPosition any, competency any) error {
	data := map[string]any{
		"trigger": map[string]any{
			"type":      "link_job_to_competency",
			"operation": operation,
		},
	}
	if link != nil {
		data["link"] = link
	}
	if jobPosition != nil {
		data["jobPosition"] = jobPosition
	}
	if competency != nil {
		data["competency"] = competency
	}
	return DispatchEvent(ctx, s.Engine, s.Store, "link_job_to_competency", data)
}

func (s *RuleBackEndService) OnCompetencyPrerequisite(ctx context.Context, operation string, prerequisite any, competency any) error {
	data := map[string]any{
		"trigger": map[string]any{
			"type":      "competency_prerequisite",
			"operation": operation,
		},
	}
	if prerequisite != nil {
		data["prerequisite"] = prerequisite
	}
	if competency != nil {
		data["competency"] = competency
	}
	return DispatchEvent(ctx, s.Engine, s.Store, "competency_prerequisite", data)
}
