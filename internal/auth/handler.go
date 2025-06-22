package auth

import (
	"Automated-Scheduling-Project/internal/database"
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
	var employeeInfo EmployeeInformation
	if err := DB.Where(`"USERACCOUNTEMAIL" = ?`, email).First(&employeeInfo).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "This email is not registered in the employee system. Please contact HR."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify employee information"})
		return
	}

	// Check if user already exists

	var existing User

	if err := DB.Where("employee_number = ? OR username = ?", employeeInfo.EmployeeNumber, username).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
		return
	}

	//Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := User{Username: username, EmployeeNumber: employeeInfo.EmployeeNumber, Password: string(hashedPassword), Role: "User"}
	if err := DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User creation failed"})
		return
	}

	// Generate JWT
	token, err := GenerateJWT(email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	responseUser := UserResponse{
		UserID:         user.UserID,
		EmployeeNumber: user.EmployeeNumber,
		Username:       user.Username,
		Name:           fmt.Sprintf("%s %s", employeeInfo.FirstName, employeeInfo.LastName),
		Email:          employeeInfo.UserAccountEmail,
		EmployeeStatus: employeeInfo.EmployeeStatus,
		Role:           user.Role,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User registered successfully",
		"user":    responseUser,
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

	var loginData struct {
		UserResponse
		Password string `json:"-"`
	}

	err := DB.Table("users").
		Select(
			"users.user_id", "users.username", "users.role", "users.password",
			`employeeinformation."EMPLOYEENUMBER"`,
			`employeeinformation."USERACCOUNTEMAIL" as email`,
			`CONCAT_WS(' ', employeeinformation."FIRSTNAME", employeeinformation."LASTNAME") as name`,
			`employeeinformation."EMPLOYEESTATUS" as employee_status`,
			`employeeinformation."TERMINATIONDATE"`,
		).
		Joins("LEFT JOIN employeeinformation ON users.employee_number = employeeinformation.\"EMPLOYEENUMBER\"").
		Where(`users.username = ? OR employeeinformation."USERACCOUNTEMAIL" = ?`, identifier, identifier).
		First(&loginData).Error

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(loginData.Password), []byte(password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	token, err := GenerateJWT(identifier)
	if err != nil {
		c.JSON(500, gin.H{"error": "Could not generate token"})
		return
	}
	c.JSON(200, gin.H{
		"token": token,
		"user":  loginData.UserResponse,
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
	var userResponse UserResponse

	err := DB.Table("users").
		Select(
			"users.user_id",
			"users.username",
			`employeeinformation."EMPLOYEENUMBER"`,
			`CONCAT_WS(' ', employeeinformation."FIRSTNAME", employeeinformation."LASTNAME") as name`,
			`employeeinformation."USERACCOUNTEMAIL" as email`,
			`employeeinformation."TERMINATIONDATE"`,
			`employeeinformation."EMPLOYEESTATUS" as employee_status`,
			"users.role",
		).
		Joins("LEFT JOIN employeeinformation ON users.employee_number = employeeinformation.\"EMPLOYEENUMBER\"").
		Where(`employeeinformation."USERACCOUNTEMAIL" = ?`, email).
		First(&userResponse).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
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

	var employeeInfo EmployeeInformation
	if err := DB.Where(`"USERACCOUNTEMAIL" = ?`, req.Email).First(&employeeInfo).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "If an account with this email exists, a password reset link has been sent."})
		return
	}

	var user User
	if err := DB.Where("employee_number = ?", employeeInfo.EmployeeNumber).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "No such account in our database"})
		return
	}

	resetToken, err := generateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate reset token"})
		return
	}

	user.ForgotPasswordLink = resetToken
	if err := DB.Save(&user).Error; err != nil {
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
