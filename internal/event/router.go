package event

import (
	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/role"

	"github.com/gin-gonic/gin"
)

func RegisterEventRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/event-schedules", GetEventSchedulesHandler)

		protected := api.Group("/")
		protected.Use(auth.AuthMiddleware())
		{
			schedules := protected.Group("/")
			schedules.Use(role.RequirePage("events"))
			{
				schedules.POST("/event-schedules", CreateEventScheduleHandler)
				schedules.PUT("/event-schedules/:scheduleID", UpdateEventScheduleHandler)
				schedules.DELETE("/event-schedules/:scheduleID", DeleteEventScheduleHandler)
			}

			defs := protected.Group("/")
			defs.Use(role.RequirePage("event-definitions"))
			{
				defs.POST("/event-definitions", CreateEventDefinitionHandler)
				defs.GET("/event-definitions", GetEventDefinitionsHandler)
				defs.PUT("/event-definitions/:definitionID", UpdateEventDefinitionHandler)
				defs.DELETE("/event-definitions/:definitionID", DeleteEventDefinitionHandler)
			}
		}
	}
}
