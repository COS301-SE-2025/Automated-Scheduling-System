// internal/database/models/competency_type.go
package models

// GORM model for the competency_types table
type CompetencyType struct {
    TypeName    string `gorm:"primaryKey;column:type_name" json:"typeName"`
    Description string `gorm:"column:description" json:"description"`
    IsActive    bool   `gorm:"column:is_active;default:true" json:"isActive"`
}

func (CompetencyType) TableName() string {
	return "competency_types"
}