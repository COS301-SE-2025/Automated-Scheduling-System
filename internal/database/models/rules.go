package models

import (
	"time"

	"gorm.io/datatypes"
)

// =====================================================================
// RULE ENGINE MODEL
// =====================================================================

// Rule model stores each business rule (JSON spec) in the database.
//
// Each rule is tied to a specific trigger type (e.g. "EVENT_STATUS_CHANGED",
// "DAILY_COMPETENCY_EXPIRY_CHECK") and has a JSON column holding the full
// definition (Trigger, Conditions, Actions).
type Rule struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	TriggerType string         `gorm:"size:100;index;not null" json:"triggerType"`
	Spec        datatypes.JSON `gorm:"type:jsonb;not null" json:"spec"` // full Rulev2 as JSON
	Enabled     bool           `gorm:"default:true" json:"enabled"`

	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}
