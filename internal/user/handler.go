package user

import (
	"Automated-Scheduling-Project/internal/auth"
	"fmt"
	"net/http"
	"strconv"

	"golang.org/x/crypto/bcrypt"

	"github.com/gin-gonic/gin"
)

func GetAllUsersHandler(c *gin.Context) {
	var responseUsers []auth.UserResponse
	err := auth.DB.Table("users").
		Select(
			"users.user_id",
			"users.username",
			"users.role",
			`employeeinformation."EMPLOYEENUMBER" as employee_number`,
			`CONCAT_WS(' ', employeeinformation."FIRSTNAME", employeeinformation."LASTNAME") as name`,
			`employeeinformation."USERACCOUNTEMAIL" as email`,
			`employeeinformation."TERMINATIONDATE" as terminationDate`,
			`employeeinformation."EMPLOYEESTATUS" as employee_status`,
		).
		Joins(`LEFT JOIN employeeinformation ON users.employee_number = employeeinformation."EMPLOYEENUMBER"`).
		Scan(&responseUsers).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch users: %v", err)})
		return
	}
	c.JSON(http.StatusOK, responseUsers)
}

func AddUserHandler(c *gin.Context) {
	var req auth.AddUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data" + err.Error()})
		return
	}

	var employeeInfo auth.EmployeeInformation
	if err := auth.DB.Where(`"USERACCOUNTEMAIL" = ?`, req.Email).First((&employeeInfo)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cannot add user, email not found."})
		return
	}

	var existingUser auth.User
	if err := auth.DB.Where("employee_number = ? or username = ?", employeeInfo.EmployeeNumber, req.Username).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "An account for this employee already exists"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password."})
		return
	}

	newUser := auth.User{
		EmployeeNumber: employeeInfo.EmployeeNumber,
		Username:       req.Username,
		Password:       string(hashedPassword),
		Role:           req.Role,
	}

	if err := auth.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user in database"})
		return
	}

	responseUser := auth.UserResponse{
		UserID:         newUser.UserID,
		EmployeeNumber: newUser.EmployeeNumber,
		Username:       newUser.Username,
		Name:           fmt.Sprintf("%s %s", employeeInfo.FirstName, employeeInfo.LastName),
		Email:          employeeInfo.UserAccountEmail,
		EmployeeStatus: employeeInfo.EmployeeStatus,
		Role:           newUser.Role,
	}

	c.JSON(http.StatusCreated, responseUser)
}

func UpdateUserHandler(c *gin.Context) {
	userIdStr := c.Param("userID")
	fmt.Print("User ID: " + userIdStr)
	userId, err := strconv.Atoi(userIdStr)
	fmt.Print(userId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid User ID"})
		return
	}

	var req auth.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	var userToUpdate auth.User
	if err := auth.DB.First(&userToUpdate, userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if req.Role != nil {
		userToUpdate.Role = *req.Role
	}

	if req.Email != nil {
		var newEmployeeInfo auth.EmployeeInformation
		if err := auth.DB.Where(`"USERACCOUNTEMAIL" = ?`, *req.Email).First(&newEmployeeInfo).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Cannot update email: new email address not found in employee records."})
			return
		}

		userToUpdate.EmployeeNumber = newEmployeeInfo.EmployeeNumber
	}

	if err := auth.DB.Save(&userToUpdate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user."})
		return
	}

	var updatedUserResponse auth.UserResponse

	auth.DB.Table("users").
		Select("users.user_id", "users.username", "users.role",
			`employeeinformation."EMPLOYEENUMBER" as employee_number`,
			`CONCAT_WS(' ', employeeinformation."FIRSTNAME", employeeinformation."LASTNAME") as name`,
			`employeeinformation."USERACCOUNTEMAIL" as email`,
			`employeeinformation."TERMINATIONDATE" as termination_date`,
			`employeeinformation."EMPLOYEESTATUS" as employee_status`).
		Joins(`LEFT JOIN employeeinformation ON users.employee_number = employeeinformation."EMPLOYEENUMBER"`).
		Where("users.user_id = ?", userId).First(&updatedUserResponse)

	c.JSON(http.StatusOK, updatedUserResponse)
}
