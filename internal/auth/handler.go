package auth

import (
    "net/http"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)
func RegisterHandler(c *gin.Context){
    username := c.PostForm("username")
    email := c.PostForm("email")
	password := c.PostForm("password")

	if username == "" || email == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password are required"})
		return
	}

	// Check if user already exists

    var existing User
    if err := DB.Where("email = ? OR username = ?", email, username).First(&existing).Error; err == nil{
        c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
    }

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
    user := User{Username: username, Email: email, Password: string(hashedPassword)}
    if err := DB.Create(&user).Error; err != nil{
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
		"message": "User registered successfully",
        "username": user.Username,
		"token":   token,
	})
}

func LoginHandler(c *gin.Context){
    identifier := c.PostForm("email") // Can be email or password
    password := c.PostForm("password")

    if identifier == ""|| password == "" {
        c.JSON(400, gin.H{"error": "Email and password are required"})
        return
    } 

    var user User
    if err := DB.Where("email = ? OR username = ?", identifier, identifier).First(&user).Error; err != nil {
        c.JSON(401, gin.H{"error": "Invalid email or password"})
        return
    }
    if err:= bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error":"Invalid credentials"})
        return
    }
    token, err := GenerateJWT(identifier)
    if err!= nil{
        c.JSON(500, gin.H{"error":"Could not generate token"})
        return
    }
    c.JSON(200, gin.H{"token": token})
}

func ProfileHandler(c *gin.Context){
    emailInterface, exists := c.Get("email")

    if !exists {
        c.JSON(http.StatusInternalServerError, gin.H{"error":"Could not extract email from token"})
        return
    }
    email, ok := emailInterface.(string)
    if !ok {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid email format"})
        return
    }
    var user User

    if err := DB.Where("email = ?", email).First(&user).Error; err!= nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
    }

    c.JSON(http.StatusOK, gin.H{
        "username" : user.Username,
        "email": user.Email,
    })
}
