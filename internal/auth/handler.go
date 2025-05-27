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

	// Check if user already exists

	var existing User

	if err := DB.Where("email = ? OR username = ?", email, username).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	user := User{Username: username, Email: email, Password: string(hashedPassword)}
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

	c.JSON(http.StatusOK, gin.H{
		"message":  "User registered successfully",
		"username": user.Username,
		"token":    token,
	})
}

func LoginHandler(c *gin.Context) {
	identifier := c.PostForm("email") // Can be email or password
	password := c.PostForm("password")

	if identifier == "" || password == "" {
		c.JSON(400, gin.H{"error": "Email and password are required"})
		return
	}

	var user User
	if err := DB.Where("email = ? OR username = ?", identifier, identifier).First(&user).Error; err != nil {
		c.JSON(401, gin.H{"error": "Invalid email or password"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	token, err := GenerateJWT(identifier)
	if err != nil {
		c.JSON(500, gin.H{"error": "Could not generate token"})
		return
	}
	c.JSON(200, gin.H{"token": token})
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
	var user User

	if err := DB.Where("email = ?", email).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
	}

	c.JSON(http.StatusOK, gin.H{
		"username": user.Username,
		"email":    user.Email,
	})
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

	var user User
	if err := DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "No such email in our database"})
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
