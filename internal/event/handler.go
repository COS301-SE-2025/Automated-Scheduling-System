package event

import (
	"Automated-Scheduling-Project/internal/database/models"
	//"log"
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

// UpdateEventDefinitionHandler updates an existing event definition.
func UpdateEventDefinitionHandler(c *gin.Context) {
    definitionIDStr := c.Param("definitionID")
    definitionID, err := strconv.Atoi(definitionIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Definition ID format"})
        return
    }

    var req models.CreateEventDefinitionRequest // Reuse create request struct for updates
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
        return
    }

    var definitionToUpdate models.CustomEventDefinition
    if err := DB.First(&definitionToUpdate, definitionID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Event definition not found"})
        return
    }

    // Update fields from request
    definitionToUpdate.EventName = req.EventName
    definitionToUpdate.ActivityDescription = req.ActivityDescription
    definitionToUpdate.StandardDuration = req.StandardDuration
    definitionToUpdate.GrantsCertificateID = req.GrantsCertificateID
    definitionToUpdate.Facilitator = req.Facilitator

    if err := DB.Save(&definitionToUpdate).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event definition"})
        return
    }

    c.JSON(http.StatusOK, definitionToUpdate)
}

// DeleteEventDefinitionHandler deletes an event definition.
func DeleteEventDefinitionHandler(c *gin.Context) {
    definitionIDStr := c.Param("definitionID")
    definitionID, err := strconv.Atoi(definitionIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Definition ID format"})
        return
    }

    // Using GORM's delete method. It will automatically handle the "where" clause.
    // It's important to check for foreign key constraints on the database side.
    // If a scheduled event references this definition, this delete might fail
    // unless ON DELETE CASCADE is set up.
    result := DB.Delete(&models.CustomEventDefinition{}, definitionID)
    if result.Error != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event definition. It may be in use by a scheduled event."})
        return
    }
    if result.RowsAffected == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Event definition not found or already deleted"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Event definition deleted successfully"})
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
	var count int64
	if err := DB.Model(&models.CustomEventDefinition{}).Where("custom_event_id = ?", req.CustomEventID).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error while checking for event definition"})
		return
	}
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event definition with the specified ID not found"})
		return
	}

	// Only set the foreign key `CustomEventID`.
	schedule := models.CustomEventSchedule{
		CustomEventID:    req.CustomEventID, // FK
		Title:            req.Title,
		EventStartDate:   req.EventStartDate,
		EventEndDate:     req.EventEndDate,
		RoomName:         req.RoomName,
		MaximumAttendees: req.MaximumAttendees,
		MinimumAttendees: req.MinimumAttendees,
		StatusName:       "Scheduled",
		Color:            req.Color, 
	}

	if req.StatusName != "" {
		schedule.StatusName = req.StatusName
	}

	// GORM will now only insert into the `custom_event_schedules` table.
	if err := DB.Create(&schedule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event schedule"})
		return
	}

    // After creating, fetch and return the entire updated list of schedules.
    // This ensures the frontend state is always consistent.
    var allSchedules []models.CustomEventSchedule
    if err := DB.Preload("CustomEventDefinition").Order("event_start_date asc").Find(&allSchedules).Error; err != nil {
        // The creation succeeded, but we can't return the list.
        // Return the single created item as a fallback.
        c.JSON(http.StatusCreated, schedule)
        return
    }

    c.JSON(http.StatusCreated, allSchedules)
}

// GetEventSchedulesHandler fetches all scheduled events, suitable for a calendar view.
func GetEventSchedulesHandler(c *gin.Context) {
    var schedules []models.CustomEventSchedule
    // Use Preload to automatically fetch the related CustomEventDefinition for each schedule.
    if err := DB.Preload("CustomEventDefinition").Find(&schedules).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event schedules"})
        return
    }

    c.JSON(http.StatusOK, schedules)
}

// UpdateEventScheduleHandler updates an existing scheduled event.
func UpdateEventScheduleHandler(c *gin.Context) {
	scheduleIDStr := c.Param("scheduleID")
	scheduleID, err := strconv.Atoi(scheduleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Schedule ID format"})
		return
	}

	var req models.CreateEventScheduleRequest 
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
	scheduleToUpdate.Title = req.Title
	scheduleToUpdate.EventStartDate = req.EventStartDate
	scheduleToUpdate.EventEndDate = req.EventEndDate
	scheduleToUpdate.RoomName = req.RoomName
	scheduleToUpdate.MaximumAttendees = req.MaximumAttendees
	scheduleToUpdate.MinimumAttendees = req.MinimumAttendees
	scheduleToUpdate.StatusName = req.StatusName
	scheduleToUpdate.Color = req.Color

    if err := DB.Save(&scheduleToUpdate).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event schedule in database"})
        return
    }

    // FIX: After updating, fetch and return the entire updated list of schedules.
    var allSchedules []models.CustomEventSchedule
    if err := DB.Preload("CustomEventDefinition").Order("event_start_date asc").Find(&allSchedules).Error; err != nil {
        // The update succeeded, but we can't return the list.
        // Return the single updated item as a fallback.
        c.JSON(http.StatusOK, scheduleToUpdate)
        return
    } 

    c.JSON(http.StatusOK, allSchedules)
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