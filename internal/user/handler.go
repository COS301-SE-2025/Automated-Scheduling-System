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
			`employeeinformation."EMPLOYEENUMBER" as employeeNumber`,
			`CONCAT_WS(' ', employeeinformation."FIRSTNAME", employeeinformation."LASTNAME") as name`,
			`employeeinformation."USERACCOUNTEMAIL" as email`,
			`employeeinformation."TERMINATIONDATE" as terminationDate`,
			`employeeinformation."EMPLOYEESTATUS" as status`,
			"users.role",
		).
		Joins(`LEFT JOIN employeeinformation ON users.employee_number = employeeinformation."EMPLOYEENUMBER"`).
		Scan(&responseUsers).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch users: %v", err)})
		return
	}
	c.JSON(http.StatusOK, responseUsers)
}
