package models

import "time"

type EventResponse struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Start           time.Time `json:"start"`
	End             time.Time `json:"end"`
	AllDay          bool      `json:"allDay"`
	EventType       string    `json:"eventType"`
	RelevantParties string    `json:"relevantParties"`
}

type CreateEventRequest struct {
	Title           string    `json:"title" binding:"required"`
	Start           time.Time `json:"start" binding:"required"`
	End             time.Time `json:"end" binding:"required"`
	AllDay          bool      `json:"allDay"`
	EventType       string    `json:"eventType"`
	RelevantParties string    `json:"relevantParties"`
}

type UpdateEventRequest struct {
	Title           *string    `json:"title"`
	Start           *time.Time `json:"start"`
	End             *time.Time `json:"end"`
	AllDay          *bool      `json:"allDay"`
	EventType       *string    `json:"eventType"`
	RelevantParties *string    `json:"relevantParties"`
}
