package user

import (
	"Automated-Scheduling-Project/internal/auth"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetAllUsersHandler(c *gin.Context) {
	var users []auth.User
	if err := auth.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	type UserResponse struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	}

	var responseUsers []UserResponse
	for _, u := range users {
		responseUsers = append(responseUsers, UserResponse{
			ID:       u.ID,
			Username: u.Username,
			Email:    u.Email,
		})
	}

	c.JSON(http.StatusOK, responseUsers)
}
