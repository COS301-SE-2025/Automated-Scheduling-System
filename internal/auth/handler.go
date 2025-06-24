package auth

import (
	"Automated-Scheduling-Project/internal/database"
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"Automated-Scheduling-Project/internal/email"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"crypto/rand"
	"encoding/hex"
)

var dbService database.Service = database.New()
var DB *gorm.DB = dbService.Gorm()

func RegisterHandler(c *gin.Context) {
	username := c.PostForm("username")
	email := c.PostForm("email")
	password := c.PostForm("password")

	if username == "" || email == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password are required"})
		return
	}

	// Check if user is an employee
	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("Useraccountemail = ?", email).First(&extendedEmployee).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "This email is not registered in the employee system. Please contact HR."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify employee information"})
		return
	}

	// Assumes that a user needs to be connected to an employee
	// Check if user already exists
	if extendedEmployee.User != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User with that email already exists"})
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create new record
	extendedEmployee.User = &gen_models.User{Username: username, EmployeeNumber: extendedEmployee.Employee.Employeenumber, Password: string(hashedPassword), Role: "User"}
	if err := DB.Model(&gen_models.User{}).Create(&extendedEmployee.User).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User creation failed"})
		return
	}

	// Generate JWT
	token, err := GenerateJWT(email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	userResponse := models.UserResponse{
		ID:             extendedEmployee.User.ID,
		EmployeeNumber: extendedEmployee.User.EmployeeNumber,
		Username:       extendedEmployee.User.Username,
		Name:           fmt.Sprintf("%s %s", extendedEmployee.Employee.Firstname, extendedEmployee.Employee.Lastname),
		Email:          extendedEmployee.Employee.Useraccountemail,
		EmployeeStatus: extendedEmployee.Employee.Employeestatus,
		Role:           extendedEmployee.User.Role,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User registered successfully",
		"user":    userResponse,
		"token":   token,
	})
}

func LoginHandler(c *gin.Context) {
	identifier := c.PostForm("email") // Can be email or password
	password := c.PostForm("password")

	if identifier == "" || password == "" {
		c.JSON(400, gin.H{"error": "Email and password are required"})
		return
	}

	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("Useraccountemail = ?", identifier).First(&extendedEmployee).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(extendedEmployee.User.Password), []byte(password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to secure password."})
		return
	}
	token, err := GenerateJWT(identifier)
	if err != nil {
		c.JSON(500, gin.H{"error": "Could not generate token"})
		return
	}

	userResponse := models.UserResponse{
		ID:             extendedEmployee.User.ID,
		EmployeeNumber: extendedEmployee.Employee.Employeenumber,
		Username:       extendedEmployee.User.Username,
		Name:           fmt.Sprintf("%s %s", extendedEmployee.Employee.Firstname, extendedEmployee.Employee.Lastname),
		Email:          extendedEmployee.Employee.Useraccountemail,
		EmployeeStatus: extendedEmployee.Employee.Employeestatus,
		Role:           extendedEmployee.User.Role,
	}

	c.JSON(200, gin.H{
		"token": token,
		"user":  userResponse,
	})
}

func ProfileHandler(c *gin.Context) {
	emailInterface, exists := c.Get("email")

	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not extract email from token"})
		return
	}
	email, ok := emailInterface.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid email format"})
		return
	}

	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("Useraccountemail = ?", email).First(&extendedEmployee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}

	userResponse := models.UserResponse{
		ID:             extendedEmployee.User.ID,
		EmployeeNumber: extendedEmployee.User.EmployeeNumber,
		Username:       extendedEmployee.User.Username,
		Name:           fmt.Sprintf("%s %s", extendedEmployee.Employee.Firstname, extendedEmployee.Employee.Lastname),
		Email:          extendedEmployee.Employee.Useraccountemail,
		EmployeeStatus: extendedEmployee.Employee.Employeestatus,
		Role:           extendedEmployee.User.Role,
	}

	c.JSON(http.StatusOK, userResponse)
}

func forgotPasswordHandler(c *gin.Context) {
	type ForgotPasswordRequest struct {
		Email string `json:"email" binding:"required,email"`
	}

	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid address"})
		return
	}

	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("Useraccountemail = ?", req.Email).First(&extendedEmployee).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "If an account with this email exists, a password reset link has been sent."})
		return
	}

	if extendedEmployee.User == nil {
		c.JSON(404, gin.H{"error": "No such account in our database"})
		return
	}

	resetToken, err := generateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate reset token"})
		return
	}

	extendedEmployee.User.ForgotPasswordLink = resetToken
	if err := DB.Save(&extendedEmployee.User).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reset token"})
		return
	}

	// Determine the scheme (http or https)
	scheme := "http"
	if c.Request.Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}

	fullURL := fmt.Sprintf("%s://%s/reset-password?token=%s", scheme, c.Request.Host, resetToken)

	body := fmt.Sprintf("Click the link to reset your password: %s", fullURL)

	if err := email.SendEmail(req.Email, "Password Reset Request", body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset email has been sent."})
}

func generateResetToken() (string, error) {
	// Create a byte slice of the desired length (e.g., 16 bytes = 128 bits)
	token := make([]byte, 16)
	_, err := rand.Read(token)
	if err != nil {
		return "", fmt.Errorf("failed to generate reset token: %w", err)
	}

	// Convert the byte slice to a hexadecimal string
	return hex.EncodeToString(token), nil
}
