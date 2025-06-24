package models

import "time"

type UserResponse struct {
	ID              int64      `gorm:"column:id" json:"userId"`
	EmployeeNumber  string     `gorm:"column:employee_number" json:"employeeNumber"`
	Username        string     `gorm:"column:username" json:"username"`
	Name            string     `gorm:"column:name" json:"name"`
	Email           string     `gorm:"column:email" json:"email"`
	TerminationDate *time.Time `gorm:"column:termination_date" json:"terminationDate"`
	EmployeeStatus  string     `gorm:"column:employee_status" json:"employeeStatus"`
	Role            string     `gorm:"column:role" json:"role"`
}

type AddUserRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role" binding:"required"`
}
type UpdateUserRequest struct {
	Email *string `json:"email,omitempty"`
	Role  *string `json:"role,omitempty"`
}
