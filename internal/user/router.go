package user

import (
	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/role"

	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine) {
	userProtected := r.Group("/api")
	userProtected.Use(auth.AuthMiddleware(), role.RequirePage("users"))
	{
		userProtected.GET("/users", GetAllUsersHandler)
		userProtected.POST("/users", AddUserHandler)
		userProtected.PATCH("/users/:userID", UpdateUserHandler)
	}
}
