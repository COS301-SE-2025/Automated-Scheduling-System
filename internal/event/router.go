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
				// New: list employees who are currently Booked for this schedule
				schedules.GET("/event-schedules/:scheduleID/booked", GetBookedEmployeesHandler)
				schedules.GET("/employees-by-positions", GetEmployeesByPositions)
				schedules.POST("/competency-check", CheckEmployeesHaveCompetency)
				// RSVP (book/reject) endpoint
				schedules.POST("/event-schedules/:scheduleID/rsvp", RSVPHandler)
			}

			// Use the general 'events' page permission for definitions endpoints
			// so that viewing events inherently allows viewing/managing definitions,
			// without requiring a separate explicit 'event-definitions' page grant.
			defs := protected.Group("/")
			defs.Use(role.RequirePage("events"))
			{
				defs.POST("/event-definitions", CreateEventDefinitionHandler)
				defs.GET("/event-definitions", GetEventDefinitionsHandler)
				defs.PUT("/event-definitions/:definitionID", UpdateEventDefinitionHandler)
				defs.DELETE("/event-definitions/:definitionID", DeleteEventDefinitionHandler)
			}
		}
	}
}
