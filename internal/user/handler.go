package user

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"fmt"
	"net/http"
	"strconv"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

// var dbService database.Service = database.New()
// var DB *gorm.DB = dbService.Gorm()
var DB *gorm.DB

func GetAllUsersHandler(c *gin.Context) {
	var extendedUsers []models.ExtendedUser
	if err := DB.Model(&gen_models.User{}).Preload("Employee").Find(&extendedUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch users: %v", err)})
		return
	}

	// Map the results to the response format
	var responseUsers []models.UserResponse
	for _, user := range extendedUsers {
		responseUsers = append(responseUsers, models.UserResponse{
			ID:             user.User.ID,
			EmployeeNumber: user.Employee.Employeenumber,
			Username:       user.User.Username,
			Name:           fmt.Sprintf("%s %s", user.Employee.Firstname, user.Employee.Lastname),
			Email:          user.Employee.Useraccountemail,
			EmployeeStatus: user.Employee.Employeestatus,
			Role:           user.User.Role,
		})
	}

	c.JSON(http.StatusOK, responseUsers)
}

func AddUserHandler(c *gin.Context) {
	var req models.AddUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: Email has incorrect formatting "})
		return
	}

	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("UserAccountEmail = ?", req.Email).First(&extendedEmployee).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cannot add user, email not found."})
		return
	}

	if extendedEmployee.User != nil {
		c.JSON(404, gin.H{"error": "An account for this employee already exists"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password."})
		return
	}

	// Create new record
	newUser := gen_models.User{Username: req.Username, EmployeeNumber: extendedEmployee.Employee.Employeenumber, Password: string(hashedPassword), Role: "User"}
	if err := DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User creation failed"})
		return
	}

	userResponse := models.UserResponse{
		ID:             newUser.ID,
		EmployeeNumber: newUser.EmployeeNumber,
		Username:       newUser.Username,
		Name:           fmt.Sprintf("%s %s", extendedEmployee.Employee.Firstname, extendedEmployee.Employee.Lastname),
		Email:          extendedEmployee.Employee.Useraccountemail,
		EmployeeStatus: extendedEmployee.Employee.Employeestatus,
		Role:           newUser.Role,
	}

	c.JSON(http.StatusCreated, userResponse)
}

func UpdateUserHandler(c *gin.Context) {
	fmt.Print("User Handler is being called\n")
	userIdStr := c.Param("userID")
	userId, err := strconv.Atoi(userIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid User ID"})
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	var userToUpdate models.ExtendedUser
	if err := DB.Model(&gen_models.User{}).Preload("Employee").First(&userToUpdate, userId).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if req.Role != nil {
		userToUpdate.User.Role = *req.Role
	}

	if req.Email != nil {
		userToUpdate.Employee.Useraccountemail = *req.Email
	}

	if err := DB.Model(&gen_models.User{}).Where("id = ?", userToUpdate.User.ID).Updates(userToUpdate.User).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user."})
		return
	}

	userResponse := models.UserResponse{
		ID:             userToUpdate.User.ID,
		EmployeeNumber: userToUpdate.User.EmployeeNumber,
		Username:       userToUpdate.User.Username,
		Name:           fmt.Sprintf("%s %s", userToUpdate.Employee.Firstname, userToUpdate.Employee.Lastname),
		Email:          userToUpdate.Employee.Useraccountemail,
		EmployeeStatus: userToUpdate.Employee.Employeestatus,
		Role:           userToUpdate.User.Role,
	}

	c.JSON(http.StatusOK, userResponse)
}
