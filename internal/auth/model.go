package auth

import (
	"time"

	"gorm.io/gorm"
)

// type User struct {
// 	gorm.Model
// 	Username           string `gorm:"uniqueIndex; not null"`
// 	Email              string `gorm:"uniqueIndex; not null"`
// 	Password           string `gorm:"not null"`
// 	ForgotPasswordLink string `gorm:"null"`
// 	Role 			   string `gorm:"unique; not null" `
// }

//Testing with different user struct to fit more with the schema that was given

type User struct {
	UserID             uint   `gorm:"primaryKey;autoIncrement" json:"userId"`
	EmployeeNumber     string `gorm:"unique;not null" json:"employeeNumber"`
	Password           string `gorm:"not null" json:"-"`
	Role               string `gorm:"default:'User'" json:"role"`
	ForgotPasswordLink string `gorm:"null" json:"-`
	Username           string `gorm:"uniqueIndex;not null" json:"username"`
}
type EmployeeInformation struct {
	gorm.Model       `gorm:"-"`
	EmployeeNumber   string     `gorm:"column:EMPLOYEENUMBER;primaryKey"`
	FirstName        string     `gorm:"column:FIRSTNAME"`
	LastName         string     `gorm:"column:LASTNAME"`
	TerminationDate  *time.Time `gorm:"column:TERMINATIONDATE"`
	EmployeeStatus   string     `gorm:"column:EMPLOYEESTATUS"`
	UserAccountEmail string     `gorm:"column:USERACCOUNTEMAIL"`
}

func (EmployeeInformation) TableName() string {
	return "employeeinformation"
}

type UserResponse struct {
	UserID          uint       `gorm:"column:user_id" json:"userId"`
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
