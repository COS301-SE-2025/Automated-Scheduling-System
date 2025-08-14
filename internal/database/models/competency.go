package models

import "time"

// =====================================================================
// JOB POSITION
// =====================================================================

// JobPosition defines a specific role within the organization.
type JobPosition struct {
	PositionMatrixCode string    `gorm:"primaryKey;column:position_matrix_code" json:"positionMatrixCode"`
	JobTitle           string    `gorm:"column:job_title" json:"jobTitle"`
	Description        string    `gorm:"column:description" json:"description"`
	IsActive           bool      `gorm:"column:is_active" json:"isActive"`
	CreationDate       time.Time `gorm:"column:creation_date;autoCreateTime" json:"creationDate"`
}

func (JobPosition) TableName() string {
	return "job_positions"
}

// =====================================================================
// COMPETENCY DEFINITION
// =====================================================================

// GORM model for the competency_definitions table
type CompetencyDefinition struct {
	CompetencyID       int                    `gorm:"column:competency_id;primaryKey" json:"competencyID"`
	CompetencyName     string                 `gorm:"column:competency_name" json:"competencyName"`
	Description        string                 `gorm:"column:description" json:"description"`
	CompetencyTypeName string                 `gorm:"column:competency_type_name" json:"competencyTypeName"`
	Source             string                 `gorm:"column:source" json:"source"`
	ExpiryPeriodMonths *int                   `gorm:"column:expiry_period_months" json:"expiryPeriodMonths"`
	IsActive           bool                   `gorm:"column:is_active" json:"isActive"`
	CreationDate       time.Time              `gorm:"column:creation_date;autoCreateTime" json:"creationDate"`
	Prerequisites      []CompetencyDefinition `gorm:"many2many:competency_prerequisites;foreignKey:CompetencyID;joinForeignKey:competency_id;References:CompetencyID;joinReferences:prerequisite_competency_id" json:"Prerequisites,omitempty"`
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

// JSON structure for updating an existing competency
type UpdateCompetencyRequest struct {
	CompetencyName     string `json:"competencyName" binding:"required"`
	Description        string `json:"description"`
	CompetencyTypeName string `json:"competencyTypeName"`
	ExpiryPeriodMonths *int   `json:"expiryPeriodMonths"`
	IsActive           *bool  `json:"isActive"`
}

// =====================================================================
// JOB REQUIREMENTS MATRIX (Formerly Custom Job Matrix)
// =====================================================================

// CustomJobMatrix now represents a requirement for a job position.
type CustomJobMatrix struct {
	CustomMatrixID     int       `gorm:"primaryKey" json:"customMatrixID"`
	PositionMatrixCode string    `gorm:"column:position_matrix_code" json:"positionMatrixCode"`
	CompetencyID       int       `gorm:"column:competency_id" json:"competencyID"`
	RequirementStatus  string    `gorm:"column:requirement_status" json:"requirementStatus"`
	Notes              string    `gorm:"column:notes" json:"notes"`
	CreatedBy          string    `gorm:"column:created_by" json:"createdBy"`
	CreationDate       time.Time `gorm:"autoCreateTime" json:"creationDate"`
	JobPosition        JobPosition        `gorm:"foreignKey:PositionMatrixCode;references:PositionMatrixCode" json:"jobPosition"`
	CompetencyDefinition CompetencyDefinition `gorm:"foreignKey:CompetencyID" json:"competencyDefinition"`
}

func (CustomJobMatrix) TableName() string {
	return "custom_job_matrix"
}

// JSON structure for creating a job matrix entry (a job requirement).
type CreateJobMatrixRequest struct {
	PositionMatrixCode string `json:"positionMatrixCode" binding:"required"`
	CompetencyID       int    `json:"competencyID" binding:"required"`
	RequirementStatus  string `json:"requirementStatus" binding:"required"`
	Notes              string `json:"notes"`
}

// JSON structure for updating a job matrix entry.
type UpdateJobMatrixRequest struct {
	RequirementStatus string `json:"requirementStatus" binding:"required"`
	Notes             string `json:"notes"`
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

// =====================================================================
// EMPLOYEE & ACHIEVEMENTS
// =====================================================================

// EmployeeCompetency tracks a specific competency achieved by an employee.
type EmployeeCompetency struct {
	EmployeeCompetencyID   int       `gorm:"primaryKey" json:"employeeCompetencyID"`
	EmployeeNumber         string    `gorm:"column:employee_number" json:"employeeNumber"`
	CompetencyID           int       `gorm:"column:competency_id" json:"competencyID"`
	AchievementDate        time.Time `gorm:"column:achievement_date" json:"achievementDate"`
	ExpiryDate             *time.Time`gorm:"column:expiry_date" json:"expiryDate"`
	GrantedByScheduleID    *int      `gorm:"column:granted_by_schedule_id" json:"grantedByScheduleID"`
	Notes                  string    `gorm:"column:notes" json:"notes"`
}

func (EmployeeCompetency) TableName() string {
	return "employee_competencies"
}