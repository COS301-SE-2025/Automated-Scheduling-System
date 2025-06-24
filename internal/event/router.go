package event

import (
	"Automated-Scheduling-Project/internal/auth"
	"github.com/gin-gonic/gin"
)

func RegisterEventRoutes(r *gin.Engine) {
	eventProtected := r.Group("/api")
	eventProtected.Use(auth.AuthMiddleware())
	{
		eventProtected.GET("/events", GetEventsHandler)
		eventProtected.POST("/events", CreateEventHandler)
		eventProtected.PATCH("/events/:eventID", UpdateEventHandler)
		eventProtected.DELETE("/events/:eventID", DeleteEventHandler)
	}
}
