package models

import "time"

type EmploymentHistory struct {
    EmploymentID       int       `gorm:"column:employment_id;primaryKey" json:"employmentID"`
    EmployeeNumber     string    `gorm:"column:employee_number" json:"employeeNumber"`
    PositionMatrixCode string    `gorm:"column:position_matrix_code" json:"positionMatrixCode"`
    StartDate          time.Time `gorm:"column:start_date" json:"startDate"`
    EndDate            *time.Time `gorm:"column:end_date" json:"endDate"`
    EmploymentType     string    `gorm:"column:employment_type" json:"employmentType"`
    Notes              string    `gorm:"column:notes" json:"notes"`
}

func (EmploymentHistory) TableName() string { return "employment_history" }

type CreateEmploymentHistoryRequest struct {
    EmployeeNumber     string  `json:"employeeNumber" binding:"required"`
    PositionMatrixCode string  `json:"positionMatrixCode" binding:"required"`
    StartDate          string  `json:"startDate" binding:"required"` // YYYY-MM-DD
    EndDate            *string `json:"endDate"`                      // optional
    EmploymentType     *string `json:"employmentType"`               // default 'Primary'
    Notes              string  `json:"notes"`
}

type UpdateEmploymentHistoryRequest struct {
    EndDate        *string `json:"endDate"`        // "" to clear
    EmploymentType *string `json:"employmentType"` // optional
    Notes          *string `json:"notes"`
}