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

	// Validate target role exists
	var targetRole models.Role
	if err := DB.Where("role_name = ?", req.Role).First(&targetRole).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Specified role does not exist"})
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
	newUser := gen_models.User{Username: req.Username, EmployeeNumber: extendedEmployee.Employee.Employeenumber, Password: string(hashedPassword), Role: req.Role}
	if err := DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User creation failed"})
		return
	}

	// Link user to the selected role for permission checks
	if err := DB.Create(&models.UserHasRole{UserID: newUser.ID, RoleID: targetRole.RoleID}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link user to role"})
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
	// fmt.Print("User Handler is being called\n")
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
		// Validate role exists
		var targetRole models.Role
		if err := DB.Where("role_name = ?", *req.Role).First(&targetRole).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Specified role does not exist"})
			return
		}
		if *req.Role != "Admin" {
			hasAdmin := userToUpdate.User.Role == "Admin"
			if !hasAdmin {
				var cnt int64
				if err := DB.Table("user_has_role uhr").
					Joins("JOIN roles r ON r.role_id = uhr.role_id").
					Where("uhr.user_id = ? AND r.role_name = 'Admin'", userToUpdate.User.ID).
					Count(&cnt).Error; err == nil && cnt > 0 {
					hasAdmin = true
				}
			}
			if hasAdmin {
				var legacyOthers int64
				if err := DB.Model(&gen_models.User{}).Where("role = 'Admin' AND id <> ?", userToUpdate.User.ID).Count(&legacyOthers).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate admin count"})
					return
				}
				var mappedOthers int64
				if err := DB.Table("user_has_role uhr").
					Select("COUNT(DISTINCT uhr.user_id)").
					Joins("JOIN roles r ON r.role_id = uhr.role_id").
					Where("r.role_name = 'Admin' AND uhr.user_id <> ?", userToUpdate.User.ID).
					Count(&mappedOthers).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate admin count"})
					return
				}
				if legacyOthers+mappedOthers == 0 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove Admin role: this is the last admin account"})
					return
				}
			}
		}
		userToUpdate.User.Role = *req.Role
		if err := DB.Where("user_id = ?", userToUpdate.User.ID).Delete(&models.UserHasRole{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role links"})
			return
		}
		if err := DB.Create(&models.UserHasRole{UserID: userToUpdate.User.ID, RoleID: targetRole.RoleID}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign role to user"})
			return
		}
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
