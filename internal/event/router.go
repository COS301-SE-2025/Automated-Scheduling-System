// internal/event/router.go

package event

import (
	"Automated-Scheduling-Project/internal/auth"

	"github.com/gin-gonic/gin"
)

func RegisterEventRoutes(r *gin.Engine) {

	apiProtected := r.Group("/api")
	apiProtected.Use(auth.AuthMiddleware())
	{
		definitions := apiProtected.Group("/event-definitions")
		{
			definitions.POST("/", CreateEventDefinitionHandler)
			definitions.GET("/", GetEventDefinitionsHandler)
		}

		schedules := apiProtected.Group("/event-schedules")
		{
			schedules.POST("/", CreateEventScheduleHandler)
			schedules.GET("/", GetEventSchedulesHandler)
			schedules.PUT("/:scheduleID", UpdateEventScheduleHandler)
			schedules.DELETE("/:scheduleID", DeleteEventScheduleHandler)
		}
	}
}