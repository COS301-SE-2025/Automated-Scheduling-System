package event

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

func GetEventsHandler(c *gin.Context) {
	var events []gen_models.Event
	if err := DB.Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}

	responseEvents := make([]models.EventResponse, 0)
	for _, event := range events {
		responseEvents = append(responseEvents, models.EventResponse{
			ID:              strconv.FormatInt(event.ID, 10),
			Title:           event.Title,
			Start:           event.StartTime,
			End:             event.EndTime,
			AllDay:          event.AllDay,
			EventType:       event.EventType,
			RelevantParties: event.RelevantParties,
		})
	}

	c.JSON(http.StatusOK, responseEvents)
}

func CreateEventHandler(c *gin.Context) {
	var req models.CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	newEvent := gen_models.Event{
		Title:           req.Title,
		StartTime:       req.Start,
		EndTime:         req.End,
		AllDay:          req.AllDay,
		EventType:       req.EventType,
		RelevantParties: req.RelevantParties,
	}

	if err := DB.Create(&newEvent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	emailInterface, exists := c.Get("email")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not extract user from token to link event"})
		return
	}
	email, ok := emailInterface.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid email format in token"})
		return
	}

	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("useraccountemail = ?", email).First(&extendedEmployee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}

	userEvent := gen_models.UserEvent{
		UserID:  extendedEmployee.User.ID,
		EventID: newEvent.ID,
	}
	if err := DB.Create(&userEvent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link event to user"})
		return
	}

	responseEvent := models.EventResponse{
		ID:              strconv.FormatInt(newEvent.ID, 10),
		Title:           newEvent.Title,
		Start:           newEvent.StartTime,
		End:             newEvent.EndTime,
		AllDay:          newEvent.AllDay,
		EventType:       newEvent.EventType,
		RelevantParties: newEvent.RelevantParties,
	}

	c.JSON(http.StatusCreated, responseEvent)
}

func UpdateEventHandler(c *gin.Context) {
	eventIDStr := c.Param("eventID")
	eventID, err := strconv.ParseInt(eventIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Event ID"})
		return
	}

	var req models.UpdateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	var eventToUpdate gen_models.Event
	if err := DB.First(&eventToUpdate, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if req.Title != nil {
		eventToUpdate.Title = *req.Title
	}
	if req.Start != nil {
		eventToUpdate.StartTime = *req.Start
	}
	if req.End != nil {
		eventToUpdate.EndTime = *req.End
	}
	if req.AllDay != nil {
		eventToUpdate.AllDay = *req.AllDay
	}
	if req.EventType != nil {
		eventToUpdate.EventType = *req.EventType
	}
	if req.RelevantParties != nil {
		eventToUpdate.RelevantParties = *req.RelevantParties
	}

	if err := DB.Save(&eventToUpdate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	responseEvent := models.EventResponse{
		ID:              strconv.FormatInt(eventToUpdate.ID, 10),
		Title:           eventToUpdate.Title,
		Start:           eventToUpdate.StartTime,
		End:             eventToUpdate.EndTime,
		AllDay:          eventToUpdate.AllDay,
		EventType:       eventToUpdate.EventType,
		RelevantParties: eventToUpdate.RelevantParties,
	}

	c.JSON(http.StatusOK, responseEvent)
}

func DeleteEventHandler(c *gin.Context) {
	eventIDStr := c.Param("eventID")
	eventID, err := strconv.ParseInt(eventIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Event ID"})
		return
	}

	if err := DB.Where("event_id = ?", eventID).Delete(&gen_models.UserEvent{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event linkage"})
		return
	}

	if err := DB.Delete(&gen_models.Event{}, eventID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}

func GetUserEventsHandler(c *gin.Context) {
	emailInterface, exists := c.Get("email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	email, ok := emailInterface.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid email format"})
		return
	}

	// Find the user by email
	var extendedEmployee models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("useraccountemail = ?", email).First(&extendedEmployee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}
	userID := extendedEmployee.User.ID

	// Get event IDs linked to this user
	var userEvents []gen_models.UserEvent
	if err := DB.Where("user_id = ?", userID).Find(&userEvents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user events"})
		return
	}
	eventIDs := make([]int64, 0, len(userEvents))
	for _, ue := range userEvents {
		eventIDs = append(eventIDs, ue.EventID)
	}

	// Get the events
	var events []gen_models.Event
	if len(eventIDs) > 0 {
		if err := DB.Where("id IN ?", eventIDs).Find(&events).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
			return
		}
	}

	// Map to response
	responseEvents := make([]models.EventResponse, 0, len(events))
	for _, event := range events {
		responseEvents = append(responseEvents, models.EventResponse{
			ID:              strconv.FormatInt(event.ID, 10),
			Title:           event.Title,
			Start:           event.StartTime,
			End:             event.EndTime,
			AllDay:          event.AllDay,
			EventType:       event.EventType,
			RelevantParties: event.RelevantParties,
		})
	}

	c.JSON(http.StatusOK, responseEvents)
}
