package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
)

type DBRule struct {
	ID      string      `gorm:"primaryKey;type:text"`
	Enabled bool        `gorm:"not null;default:true"`
	Type    string      `gorm:"type:text;not null"`
	Body    RawRuleJSON `gorm:"type:json"`
}

// RawRuleJSON represents the JSON structure for rules
// This is a local copy to avoid import cycles
type RawRuleJSON struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"`
	Enabled    bool                   `json:"enabled"`
	Target     string                 `json:"target,omitempty"`
	Frequency  *Period                `json:"frequency,omitempty"`
	Conditions map[string]interface{} `json:"conditions,omitempty"`
	Params     map[string]interface{} `json:"params,omitempty"`
	When       string                 `json:"when,omitempty"`
	Actions    []RawAction            `json:"actions,omitempty"`
}

type Period struct {
	Years  int `json:"years,omitempty"`
	Months int `json:"months,omitempty"`
	Days   int `json:"days,omitempty"`
}

type RawAction struct {
	Type   string                 `json:"type"`
	Params map[string]interface{} `json:"params,omitempty"`
}

func (r RawRuleJSON) Value() (driver.Value, error) {
	return json.Marshal(r)
}

func (r *RawRuleJSON) Scan(v interface{}) error {
	bytes, ok := v.([]byte)
	if !ok {
		return fmt.Errorf("unexpected DB type %T for RawRule", v)
	}
	return json.Unmarshal(bytes, r)
}

// GORM Json helpers
func (r *DBRule) BeforeSave(_ *gorm.DB) error {
	r.Type = r.Body.Type
	return nil
}
