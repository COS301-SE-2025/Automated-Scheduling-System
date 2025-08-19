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
	Title                 string    
	EventStartDate        time.Time
	EventEndDate          time.Time
	RoomName              string
	MaximumAttendees      int
	MinimumAttendees      int
	StatusName            string
	Color                 string    `json:"color"`
	CreationDate          time.Time `gorm:"autoCreateTime"`
	CustomEventDefinition CustomEventDefinition `gorm:"foreignKey:CustomEventID;references:CustomEventID"`
	CreatedByUserID       int64
	// Associations
	Employees             []EventScheduleEmployee        `gorm:"foreignKey:CustomEventScheduleID"`
	Positions             []EventSchedulePositionTarget  `gorm:"foreignKey:CustomEventScheduleID"`
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
	Title            string    `json:"title" binding:"required"`
	EventEndDate     time.Time `json:"end" binding:"required"`
	RoomName         string    `json:"roomName"`
	MaximumAttendees int       `json:"maxAttendees"`
	MinimumAttendees int       `json:"minAttendees"`
	StatusName       string    `json:"statusName"`
	Color            string    `json:"color"`
	EmployeeNumbers  []string  `json:"employeeNumbers"`
	PositionCodes    []string  `json:"positionCodes"`
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

// Linking tables for schedule targets
type EventScheduleEmployee struct {
	ScheduleEmployeeID     int    `gorm:"primaryKey;autoIncrement"`
	CustomEventScheduleID  int    `gorm:"column:custom_event_schedule_id"`
	EmployeeNumber         string `gorm:"column:employee_number"`
	Role                   string `gorm:"column:role"`
}

func (EventScheduleEmployee) TableName() string { return "event_schedule_employees" }

type EventSchedulePositionTarget struct {
	SchedulePositionID     int    `gorm:"primaryKey;autoIncrement"`
	CustomEventScheduleID  int    `gorm:"column:custom_event_schedule_id"`
	PositionMatrixCode     string `gorm:"column:position_matrix_code"`
}

func (EventSchedulePositionTarget) TableName() string { return "event_schedule_position_targets" }

type EventAttendance struct {
	ID                    int       `gorm:"primaryKey;autoIncrement" json:"id"`
	CustomEventScheduleID int       `gorm:"column:custom_event_schedule_id;index" json:"customEventScheduleId"`
	EmployeeNumber        string    `gorm:"column:employee_number;index" json:"employeeNumber"`
	// NOTE: Do NOT set a GORM default here; we must be able to persist explicit false values.
	Attended              bool      `gorm:"column:attended" json:"attended"`
	CheckInTime           *time.Time `gorm:"column:check_in_time" json:"checkInTime"`
	CheckOutTime          *time.Time `gorm:"column:check_out_time" json:"checkOutTime"`
	CreatedAt             time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (EventAttendance) TableName() string { return "event_attendance" }