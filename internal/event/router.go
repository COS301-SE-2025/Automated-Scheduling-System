package event

import (
	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/role"

	"github.com/gin-gonic/gin"
)

func RegisterEventRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Protect schedules listing with auth and page permission
		protectedList := api.Group("/")
		protectedList.Use(auth.AuthMiddleware(), role.RequirePage("events"))
		{
			protectedList.GET("/event-schedules", GetEventSchedulesHandler)
		}

		protected := api.Group("/")
		protected.Use(auth.AuthMiddleware())
		{
			schedules := protected.Group("/")
			schedules.Use(role.RequirePage("events"))
			{
				schedules.POST("/event-schedules", CreateEventScheduleHandler)
				schedules.PUT("/event-schedules/:scheduleID", UpdateEventScheduleHandler)
				schedules.DELETE("/event-schedules/:scheduleID", DeleteEventScheduleHandler)
				schedules.GET("/event-schedules/:scheduleID/attendance", GetAttendanceHandler)
				schedules.POST("/event-schedules/:scheduleID/attendance", SetAttendanceHandler)
				schedules.GET("/event-schedules/:scheduleID/attendance-candidates", GetAttendanceCandidates)
				schedules.GET("/employees-by-positions", GetEmployeesByPositions)
				schedules.POST("/competency-check", CheckEmployeesHaveCompetency)
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
