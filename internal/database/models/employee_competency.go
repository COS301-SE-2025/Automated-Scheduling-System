package models

import "time"

type EmployeeCompetency struct {
    EmployeeCompetencyID int                  `gorm:"column:employee_competency_id;primaryKey" json:"employeeCompetencyID"`
    EmployeeNumber       string               `gorm:"column:employee_number" json:"employeeNumber"`
    CompetencyID         int                  `gorm:"column:competency_id" json:"competencyID"`
    AchievementDate      *time.Time           `gorm:"column:achievement_date" json:"achievementDate"`
    ExpiryDate           *time.Time           `gorm:"column:expiry_date" json:"expiryDate"`
    GrantedByScheduleID  *int                 `gorm:"column:granted_by_schedule_id" json:"grantedByScheduleID"`
    Notes                string               `gorm:"column:notes" json:"notes"`
    CompetencyDefinition CompetencyDefinition `gorm:"foreignKey:CompetencyID;references:CompetencyID" json:"competencyDefinition"`
}

func (EmployeeCompetency) TableName() string { return "employee_competencies" }

type CreateEmployeeCompetencyRequest struct {
    EmployeeNumber      string  `json:"employeeNumber" binding:"required"`
    CompetencyID        int     `json:"competencyID" binding:"required"`
    AchievementDate     *string `json:"achievementDate"`    // YYYY-MM-DD; default today
    ExpiryDate          *string `json:"expiryDate"`         // optional; if omitted & competency has expiry period -> auto-calc
    GrantedByScheduleID *int    `json:"grantedByScheduleID"`
    Notes               string  `json:"notes"`
}

type UpdateEmployeeCompetencyRequest struct {
    AchievementDate     *string `json:"achievementDate"` // optional change
    ExpiryDate          *string `json:"expiryDate"`
    GrantedByScheduleID *int    `json:"grantedByScheduleID"`
    Notes               *string `json:"notes"`
}
