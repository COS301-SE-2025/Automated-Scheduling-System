package event

import (
	"Automated-Scheduling-Project/internal/auth"

	"github.com/gin-gonic/gin"
)

func RegisterEventRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/event-schedules", GetEventSchedulesHandler)

		protected := api.Group("/")
		protected.Use(auth.AuthMiddleware())
		{
			protected.POST("/event-schedules", CreateEventScheduleHandler)
			protected.PUT("/event-schedules/:scheduleID", UpdateEventScheduleHandler)
			protected.DELETE("/event-schedules/:scheduleID", DeleteEventScheduleHandler)

			protected.POST("/event-definitions", CreateEventDefinitionHandler)
			protected.GET("/event-definitions", GetEventDefinitionsHandler)
		}
	}
}
