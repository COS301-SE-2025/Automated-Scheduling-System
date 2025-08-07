package models

import "time"

// =====================================================================
// COMPETENCY DEFINITION
// =====================================================================

// GORM model for the competency_definitions table
type CompetencyDefinition struct {
	CompetencyID       int `gorm:"primaryKey"`
	CompetencyName     string
	Description        string
	CompetencyTypeName string
	Source             string // Using string for ENUM 'LMS' or 'Custom'
	ExpiryPeriodMonths *int
	IsActive           bool   `gorm:"default:true"`
	CreationDate       time.Time `gorm:"autoCreateTime"`
	Prerequisites      []CompetencyDefinition `gorm:"many2many:competency_prerequisites;foreignKey:CompetencyID;joinForeignKey:competency_id;References:CompetencyID;joinReferences:prerequisite_competency_id"`
}

// JSON structure for creating a new competency
type CreateCompetencyRequest struct {
	CompetencyName     string `json:"competencyName" binding:"required"`
	Description        string `json:"description"`
	CompetencyTypeName string `json:"competencyTypeName"`
	Source             string `json:"source" binding:"required,oneof=LMS Custom"` // Validate source
	ExpiryPeriodMonths *int   `json:"expiryPeriodMonths"`
	IsActive           *bool  `json:"isActive"` // Pointer to handle optional boolean
}

// =====================================================================
// CUSTOM JOB MATRIX
// =====================================================================

// GORM model for the custom_job_matrix table
type CustomJobMatrix struct {
	CustomMatrixID     int `gorm:"primaryKey"`
	EmployeeNumber     *string // Pointer for nullable string
	PositionMatrixCode string
	CompetencyID       int
	RequirementStatus  string
	Notes              string
	CreatedBy          string
	CreationDate       time.Time `gorm:"autoCreateTime"`
}

func (CustomJobMatrix) TableName() string {
	return "custom_job_matrix"
}

// JSON structure for creating a job matrix entry
type CreateJobMatrixRequest struct {
	EmployeeNumber     *string `json:"employeeNumber"`
	PositionMatrixCode string  `json:"positionMatrixCode" binding:"required"`
	CompetencyID       int     `json:"competencyId" binding:"required"`
	RequirementStatus  string  `json:"requirementStatus" binding:"required"`
	Notes              string  `json:"notes"`
}

type UpdateJobMatrixRequest struct {
    RequirementStatus  string  `json:"requirementStatus" binding:"required"`
	Notes              string  `json:"notes"`
}

// =====================================================================
// COMPETENCY PREREQUISITE
// =====================================================================

// GORM model for the competency_prerequisites table
type CompetencyPrerequisite struct {
    CompetencyID           int `gorm:"primaryKey"`
    PrerequisiteCompetencyID int `gorm:"primaryKey"`
}

func (CompetencyPrerequisite) TableName() string {
    return "competency_prerequisites"
}

// JSON structure for adding a prerequisite
type AddPrerequisiteRequest struct {
    PrerequisiteCompetencyID int `json:"prerequisiteCompetencyId" binding:"required"`
}