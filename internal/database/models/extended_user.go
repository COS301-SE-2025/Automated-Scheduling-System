package models

import "Automated-Scheduling-Project/internal/database/gen_models"

type ExtendedUser struct {
	User     gen_models.User     `gorm:"embedded"`
	Employee gen_models.Employee `gorm:"foreignKey:EmployeeNumber;references:Employeenumber"`
}
