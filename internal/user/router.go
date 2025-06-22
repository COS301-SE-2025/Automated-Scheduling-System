package user

import (
	"Automated-Scheduling-Project/internal/auth"

	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine) {
	userProtected := r.Group("/api")
	userProtected.Use(auth.AuthMiddleware())
	{
		userProtected.GET("/users", GetAllUsersHandler)
		userProtected.POST("/users", AddUserHandler)
		userProtected.PATCH("/users/:userID", UpdateUserHandler)
	}
}
