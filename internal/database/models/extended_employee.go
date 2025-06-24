package models

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
)

type ExtendedEmployee struct {
	Employee gen_models.Employee `gorm:"embedded"`
	User     *gen_models.User    `gorm:"foreignKey:EmployeeNumber;references:Employeenumber"`
}
