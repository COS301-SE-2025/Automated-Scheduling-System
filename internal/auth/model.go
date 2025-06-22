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
	UserID          uint       `json:"userId"`
	EmployeeNumber  string     `json:"employeeNumber"`
	Username        string     `json:"username"`
	Name            string     `json:"name"`
	Email           string     `json:"email"`
	TerminationDate *time.Time `json:"terminationDate"`
	EmployeeStatus  string     `json:"employeeStatus"`
	Role            string     `json:"role"`
}
