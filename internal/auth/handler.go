package auth

import (
	"database/sql"
    "net/http"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB

func Init(dbConn *sql.DB){
    db=dbConn
}

func RegisterHandler(c *gin.Context){
    email := c.PostForm("email")
	password := c.PostForm("password")

	if email == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password are required"})
		return
	}

	// Check if user already exists
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Insert into database
	_, err = db.Exec("INSERT INTO users (email, password) VALUES ($1, $2)", email, string(hashedPassword))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
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
		"token":   token,
	})
}

func LoginHandler(c *gin.Context){
    email := c.PostForm("email")
    password := c.PostForm("password")

    if email == ""|| password == "" {
        c.JSON(400, gin.H{"error": "Email and password are required"})
    } 

    var storedHashedPassword string 
    err := db.QueryRow("SELECT password FROM users WHERE email=$1", email).Scan(&storedHashedPassword)

    if err != nil {
        if err == sql.ErrNoRows{
            c.JSON(401, gin.H{"error": "Invalid email or password"})
        } else {
            c.JSON(500, gin.H{"error": "Server error"})
        }
        return
    }
    err = bcrypt.CompareHashAndPassword([]byte(storedHashedPassword),[]byte(password))
    if err != nil {
        c.JSON(401, gin.H{"error": "Invalid email or password"})
        return
    }
    token, err := GenerateJWT(email)
    if err!= nil{
        c.JSON(500, gin.H{"error":"Could not generate token"})
        return
    }
    c.JSON(200, gin.H{"token": token})
}

