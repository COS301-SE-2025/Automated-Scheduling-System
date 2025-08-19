package rulesv2

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"Automated-Scheduling-Project/internal/database/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

/*
DBRuleStore persists Rulev2 JSON specs in Postgres via GORM.
It implements your RuleStore interface used by DispatchEvent.
*/

type DBRuleStore struct {
	DB *gorm.DB
}

/* ----------------------------- Migrations -------------------------------- */

// EnsureRulesTable runs migration for the rules table.
// Call once at startup after connecting to DB.
func EnsureRulesTable(db *gorm.DB) error {
	return db.AutoMigrate(&models.Rule{})
}

/* --------------------------- JSON <-> Spec -------------------------------- */

func specToJSON(spec Rulev2) (datatypes.JSON, error) {
	b, err := json.Marshal(spec)
	if err != nil {
		return nil, err
	}
	return datatypes.JSON(b), nil
}

func jsonToSpec(js datatypes.JSON) (Rulev2, error) {
	var spec Rulev2
	if err := json.Unmarshal(js, &spec); err != nil {
		return Rulev2{}, err
	}
	return spec, nil
}

/* ------------------------ RuleStore implementation ------------------------ */

// ListByTrigger loads ENABLED rules for a given trigger type, parses Spec into Rulev2,
// and returns them to the engine. This satisfies your RuleStore interface.
func (s DBRuleStore) ListByTrigger(ctx context.Context, triggerType string) ([]Rulev2, error) {
	var rows []models.Rule
	if err := s.DB.WithContext(ctx).
		Where("enabled = ? AND trigger_type = ?", true, triggerType).
		Order("id ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]Rulev2, 0, len(rows))
	for _, r := range rows {
		spec, err := jsonToSpec(r.Spec)
		if err != nil {
			return nil, fmt.Errorf("rule id=%d json decode: %w", r.ID, err)
		}
		out = append(out, spec)
	}
	return out, nil
}

/* ------------------------------- CRUD helpers ----------------------------- */

// Create validates then inserts a new rule row from a Rulev2 spec.
func (s DBRuleStore) Create(ctx context.Context, reg *Registry, spec Rulev2, enabled bool) (models.Rule, error) {
	if err := ValidateRule(reg, spec); err != nil {
		return models.Rule{}, err
	}
	js, err := specToJSON(spec)
	if err != nil {
		return models.Rule{}, err
	}
	row := models.Rule{
		Name:        spec.Name,
		TriggerType: spec.Trigger.Type,
		Spec:        js,
		Enabled:     enabled,
	}
	if err := s.DB.WithContext(ctx).Create(&row).Error; err != nil {
		return models.Rule{}, err
	}
	return row, nil
}

// Update replaces name/trigger/spec and optionally enabled.
func (s DBRuleStore) Update(ctx context.Context, reg *Registry, id uint, spec Rulev2, enabled *bool) (models.Rule, error) {
	if err := ValidateRule(reg, spec); err != nil {
		return models.Rule{}, err
	}
	js, err := specToJSON(spec)
	if err != nil {
		return models.Rule{}, err
	}

	var row models.Rule
	if err := s.DB.WithContext(ctx).First(&row, id).Error; err != nil {
		return models.Rule{}, err
	}
	row.Name = spec.Name
	row.TriggerType = spec.Trigger.Type
	row.Spec = js
	if enabled != nil {
		row.Enabled = *enabled
	}
	if err := s.DB.WithContext(ctx).Save(&row).Error; err != nil {
		return models.Rule{}, err
	}
	return row, nil
}

// ToggleEnabled flips enabled without changing spec.
func (s DBRuleStore) ToggleEnabled(ctx context.Context, id uint, enabled bool) error {
	return s.DB.WithContext(ctx).
		Model(&models.Rule{}).
		Where("id = ?", id).
		Update("enabled", enabled).Error
}

// Delete removes a rule row.
func (s DBRuleStore) Delete(ctx context.Context, id uint) error {
	return s.DB.WithContext(ctx).Delete(&models.Rule{}, id).Error
}

// Get returns a single DB row + parsed Rulev2 (handy for admin views).
func (s DBRuleStore) Get(ctx context.Context, id uint) (models.Rule, Rulev2, error) {
	var row models.Rule
	if err := s.DB.WithContext(ctx).First(&row, id).Error; err != nil {
		return models.Rule{}, Rulev2{}, err
	}
	spec, err := jsonToSpec(row.Spec)
	return row, spec, err
}

// ListAll returns all rules (optionally only enabled) for admin pages.
func (s DBRuleStore) ListAll(ctx context.Context, onlyEnabled bool) ([]models.Rule, error) {
	q := s.DB.WithContext(ctx).Model(&models.Rule{})
	if onlyEnabled {
		q = q.Where("enabled = ?", true)
	}
	var rows []models.Rule
	if err := q.Order("id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

// Seed upserts by name (useful for fixtures/dev). Validates before write.
func (s DBRuleStore) Seed(ctx context.Context, reg *Registry, spec Rulev2, enabled bool) (models.Rule, error) {
	if err := ValidateRule(reg, spec); err != nil {
		return models.Rule{}, err
	}
	js, err := specToJSON(spec)
	if err != nil {
		return models.Rule{}, err
	}

	var row models.Rule
	tx := s.DB.WithContext(ctx).Where("name = ?", spec.Name).First(&row)
	if tx.Error == nil {
		row.TriggerType = spec.Trigger.Type
		row.Spec = js
		row.Enabled = enabled
		if err := s.DB.WithContext(ctx).Save(&row).Error; err != nil {
			return models.Rule{}, err
		}
		return row, nil
	}
	if !errors.Is(tx.Error, gorm.ErrRecordNotFound) {
		return models.Rule{}, tx.Error
	}

	row = models.Rule{
		Name:        spec.Name,
		TriggerType: spec.Trigger.Type,
		Spec:        js,
		Enabled:     enabled,
	}
	if err := s.DB.WithContext(ctx).Create(&row).Error; err != nil {
		return models.Rule{}, err
	}
	return row, nil
}

