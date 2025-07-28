package models

import (
	"time"
)

// =====================================================================
// GORM MODELS
// =====================================================================

// GORM model for the CustomEventDefinition table
// Template for an event
type CustomEventDefinition struct {
	CustomEventID       int `gorm:"primaryKey;autoIncrement"`
	EventName           string
	ActivityDescription string
	StandardDuration    string // string for INTERVAL.
	GrantsCertificateID *int
	Facilitator         string
	CreatedBy           string
	CreationDate        time.Time `gorm:"autoCreateTime"`
}

// GORM model for the CustomEventSchedule table
// Specific instance of an event on the calendar
type CustomEventSchedule struct {
	CustomEventScheduleID int `gorm:"primaryKey;autoIncrement"`
	CustomEventID         int // Foreign key to CustomEventDefinition
	EventStartDate        time.Time
	EventEndDate          time.Time
	RoomName              string
	MaximumAttendees      int
	MinimumAttendees      int
	StatusName            string
	CreationDate          time.Time `gorm:"autoCreateTime"`

	CustomEventDefinition CustomEventDefinition `gorm:"foreignKey:CustomEventID"`
}

// =====================================================================
// API REQUEST & RESPONSE STRUCTS
// =====================================================================

// JSON structure for creating a new event template
type CreateEventDefinitionRequest struct {
	EventName           string `json:"eventName" binding:"required"`
	ActivityDescription string `json:"activityDescription"`
	StandardDuration    string `json:"standardDuration"` // e.g. "5 hours", "2 days"
	GrantsCertificateID *int   `json:"grantsCertificateId"`
	Facilitator         string `json:"facilitator"`
}

// JSON structure for scheduling an instance of an event
type CreateEventScheduleRequest struct {
	CustomEventID    int       `json:"customEventId" binding:"required"`
	EventStartDate   time.Time `json:"start" binding:"required"`
	EventEndDate     time.Time `json:"end" binding:"required"`
	RoomName         string    `json:"roomName"`
	MaximumAttendees int       `json:"maxAttendees"`
	MinimumAttendees int       `json:"minAttendees"`
	StatusName       string    `json:"statusName"`
}

// JSON structure for returning a scheduled event to the front-end
type EventScheduleResponse struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Start       time.Time `json:"start"`
	End         time.Time `json:"end"`
	RoomName    string    `json:"roomName,omitempty"`
	Facilitator string    `json:"facilitator,omitempty"`
	Status      string    `json:"status,omitempty"`
	AllDay      bool      `json:"allDay"` // Logic to be implemented if needed
}