package user

import (
	"Automated-Scheduling-Project/internal/auth" // For AuthMiddleware
	"fmt"
	"github.com/gin-gonic/gin"
)


func UserRoutes(r *gin.Engine) {
	fmt.Println("Attempting to register user routes under /api group") 
	userProtected := r.Group("/api") 
	userProtected.Use(auth.AuthMiddleware())
	{
		fmt.Println("Registering GET /api/users")
		userProtected.GET("/users", GetAllUsersHandler)
	}
}