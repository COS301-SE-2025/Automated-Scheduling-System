package models

import (
	"Automated-Scheduling-Project/internal/rule_engine"
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
)
type DBRule struct {
    ID string `gorm:"primaryKey;type;text"`
    Enabled bool `gorm:"no null; default:true"`
    Type string `gorm:"type:text; not null"`
    Body RawRuleJSON `gorm:"type:json"`
}
// Wrapper for RawRule
type RawRuleJSON rules.RawRule
func (r RawRuleJSON) Value() (driver.Value, error) {
    return json.Marshal(rules.RawRule(r))
}

func (r *RawRuleJSON) Scan(v any) error{
    bytes, ok := v.([]byte)
    if !ok {
        return fmt.Errorf("unexpected DB type %T for RawRule", v)
    }
    return json.Unmarshal(bytes, (*rules.RawRule)(r))

}
// GORM Json helpers
func (r *DBRule) BeforeSave(_ *gorm.DB) error{
    r.Type = r.Body.Type
    return nil 
}

