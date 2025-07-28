package event

import (
	"Automated-Scheduling-Project/internal/database/models"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

// ================================================================
// Event Definition Handlers (for HR to manage course templates)
// ================================================================

// CreateEventDefinitionHandler handles creating a new event template.
func CreateEventDefinitionHandler(c *gin.Context) {
	var req models.CreateEventDefinitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	createdBy, exists := c.Get("email")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User identity not found in token"})
		return
	}

	definition := models.CustomEventDefinition{
		EventName:           req.EventName,
		ActivityDescription: req.ActivityDescription,
		StandardDuration:    req.StandardDuration,
		GrantsCertificateID: req.GrantsCertificateID,
		Facilitator:         req.Facilitator,
		CreatedBy:        createdBy.(string),
	}

	if err := DB.Create(&definition).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event definition"})
		return
	}

	c.JSON(http.StatusCreated, definition)
}

// GetEventDefinitionsHandler returns a list of all available event templates.
func GetEventDefinitionsHandler(c *gin.Context) {
	var definitions []models.CustomEventDefinition
	if err := DB.Find(&definitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event definitions"})
		return
	}
	c.JSON(http.StatusOK, definitions)
}

// ================================================================
// Event Schedule Handlers (for managing calendar instances)
// ================================================================

// CreateEventScheduleHandler creates a new scheduled instance of an event definition.
func CreateEventScheduleHandler(c *gin.Context) {
	var req models.CreateEventScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	// Check if the referenced CustomEventID exists before creating a schedule for it.
	var definition models.CustomEventDefinition
	if err := DB.First(&definition, req.CustomEventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event definition with the specified ID not found"})
		return
	}

	schedule := models.CustomEventSchedule{
		CustomEventID:    req.CustomEventID,
		EventStartDate:   req.EventStartDate,
		EventEndDate:     req.EventEndDate,
		RoomName:         req.RoomName,
		MaximumAttendees: req.MaximumAttendees,
		MinimumAttendees: req.MinimumAttendees,
		StatusName:       "Scheduled", // Default status
		CustomEventDefinition: definition,
	}
	if req.StatusName != "" {
		schedule.StatusName = req.StatusName
	}

	if err := DB.Create(&schedule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event schedule"})
		return
	}

	c.JSON(http.StatusCreated, schedule)
}

// GetEventSchedulesHandler fetches all scheduled events, suitable for a calendar view.
func GetEventSchedulesHandler(c *gin.Context) {
	var schedules []models.CustomEventSchedule
	// Use Preload to automatically fetch the related CustomEventDefinition for each schedule.
	if err := DB.Preload("CustomEventDefinition").Find(&schedules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event schedules"})
		return
	}

	// Map the database models to the desired API response format.
	responseEvents := make([]models.EventScheduleResponse, 0, len(schedules))
	for _, s := range schedules {
		// IMPORTANT: Check if the preloaded definition is nil before accessing it.
		// This prevents a panic if a schedule has an orphaned reference.
		if s.CustomEventDefinition.CustomEventID == 0 {
			log.Printf("Warning: Skipping event schedule with ID %d because its event definition is missing.", s.CustomEventScheduleID)
			continue // Skip this record and move to the next one
		}

		responseEvents = append(responseEvents, models.EventScheduleResponse{
			ID:          s.CustomEventScheduleID,
			Title:       s.CustomEventDefinition.EventName, // Now this is safe
			Start:       s.EventStartDate,
			End:         s.EventEndDate,
			RoomName:    s.RoomName,
			Facilitator: s.CustomEventDefinition.Facilitator, // And this is safe
			Status:      s.StatusName,
			AllDay:      false, // Implement your logic for AllDay if needed
		})
	}

	c.JSON(http.StatusOK, responseEvents)
}

// UpdateEventScheduleHandler updates an existing scheduled event.
func UpdateEventScheduleHandler(c *gin.Context) {
	scheduleIDStr := c.Param("scheduleID")
	scheduleID, err := strconv.Atoi(scheduleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Schedule ID format"})
		return
	}

	var req models.CreateEventScheduleRequest // Reuse create request struct for updates
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	var scheduleToUpdate models.CustomEventSchedule
	if err := DB.First(&scheduleToUpdate, scheduleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event schedule not found"})
		return
	}

	// Update fields from request
	scheduleToUpdate.CustomEventID = req.CustomEventID
	scheduleToUpdate.EventStartDate = req.EventStartDate
	scheduleToUpdate.EventEndDate = req.EventEndDate
	scheduleToUpdate.RoomName = req.RoomName
	scheduleToUpdate.MaximumAttendees = req.MaximumAttendees
	scheduleToUpdate.MinimumAttendees = req.MinimumAttendees
	scheduleToUpdate.StatusName = req.StatusName

	if err := DB.Save(&scheduleToUpdate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event schedule"})
		return
	}

	c.JSON(http.StatusOK, scheduleToUpdate)
}

// DeleteEventScheduleHandler deletes a scheduled event.
func DeleteEventScheduleHandler(c *gin.Context) {
	scheduleIDStr := c.Param("scheduleID")
	scheduleID, err := strconv.Atoi(scheduleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Schedule ID format"})
		return
	}

	result := DB.Delete(&models.CustomEventSchedule{}, scheduleID)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event schedule"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event schedule not found or already deleted"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event schedule deleted successfully"})
}