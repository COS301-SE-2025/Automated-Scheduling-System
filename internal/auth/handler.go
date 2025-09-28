package auth

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"Automated-Scheduling-Project/internal/email"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"crypto/rand"
	"encoding/hex"
	"os"
)

var DB *gorm.DB

func RegisterHandler(c *gin.Context) {
	// Sanitize and normalize inputs
	username := strings.TrimSpace(c.PostForm("username"))
	email := strings.ToLower(strings.TrimSpace(c.PostForm("email")))
	password := c.PostForm("password")

	if username == "" || email == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username, email, and password are required"})
		return
	}

	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("useraccountemail = ?", email).First(&extendedEmployee).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "This email is not registered in the employee system. Please contact HR."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify employee information"})
		return
	}

	if extendedEmployee.User != nil && extendedEmployee.User.ID != 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "An account for this email already exists"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	newUser := &gen_models.User{
		Username:       username,
		EmployeeNumber: extendedEmployee.Employee.Employeenumber,
		Password:       string(hashedPassword),
		Role:           "User",
	}

	// changed to use a database transaction for the creation.
	err = DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(newUser).Error; err != nil {
			return err
		}
		return nil
	})

	// Check if the transaction failed.
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User creation failed"})
		return
	}

	// Generate JWT (now that the user is safely in the database)
	token, err := GenerateJWT(email)
	if err != nil {
		// edge case: User was created but token generation failed.
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User registered, but failed to generate session token"})
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Could not extract email from token"})
		return
	}
	email, ok := emailInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email format"})
		return
	}

	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("Useraccountemail = ?", email).First(&extendedEmployee).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
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

func generateResetLinkHandler(c *gin.Context) {
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
		c.JSON(http.StatusNotFound, gin.H{"message": "If an account with this email exists, a password reset link has been sent."})
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

	extendedEmployee.User.ForgotPasswordLink = resetToken

	// Update user's forgotpassword field
	if err := DB.Model(&gen_models.User{}).Where("id = ?", extendedEmployee.User.ID).Updates(extendedEmployee.User).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user's forgot password field."})
		return
	}

	// Determine base URL based on environment
	baseURL := "http://localhost:5173"
	if os.Getenv("ENVIRONMENT") == "production" {
		baseURL = "https://schedulingsystem.app"
	}
	fullURL := fmt.Sprintf("%s/reset-password/%s", baseURL, resetToken)

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

func resetPasswordHandler(c *gin.Context) {
	// Define a struct to match the expected JSON payload
	type ResetPasswordRequest struct {
		Email           string `json:"email" binding:"required,email"`
		Password        string `json:"password" binding:"required"`
		ConfirmPassword string `json:"confirmPassword" binding:"required"`
	}

	var req ResetPasswordRequest

	// Bind the JSON body to the struct
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Access the fields from the struct
	email := req.Email
	password := req.Password

	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("useraccountemail = ?", email).First(&extendedEmployee).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "This email is not registered in the employee system."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify employee information"})
		return
	}

	// Update User model with new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	extendedEmployee.User.Password = string(hashedPassword)

	// Clear forgot password field
	extendedEmployee.User.ForgotPasswordLink = ""

	// Update User in database
	if err := DB.Model(&gen_models.User{}).Where("id = ?", extendedEmployee.User.ID).Updates(extendedEmployee.User).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user forgot password field."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password has been successfully reset."})
}

func resetPasswordPageHandler(c *gin.Context) {
	resetToken := c.Param("resetToken")

	var user gen_models.User

	if err := DB.Model(&gen_models.User{}).Where("forgot_password_link = ?", resetToken).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid reset token."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reset token is valid."})
}
