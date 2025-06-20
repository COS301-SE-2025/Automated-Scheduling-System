package user

import (
	"Automated-Scheduling-Project/internal/auth"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetAllUsersHandler(c *gin.Context) {
	var responseUsers []auth.UserResponse
	err := auth.DB.Table("users").
		Select(
			"users.user_id",
			"users.username",
			"employee_information.employeenumber",
			"CONCAT_WS(' ', employee_information.firstname, employee_information.lastname) as name",
			"employee_information.useraccountemail as email",
			"employee_information.terminationdate",
			"employee_information.employeestatus as status",
			"users.role",
		).
		Joins("LEFT JOIN employee_information ON users.employee_number = employee_information.employeenumber").
		Scan(&responseUsers).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch users: %v", err)})
		return
	}
	c.JSON(http.StatusOK, responseUsers)
}
