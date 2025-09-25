package event

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"Automated-Scheduling-Project/internal/role"
	rulesv2 "Automated-Scheduling-Project/internal/rulesV2"
	"log"

	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

// Allow tests to stub the current user/role resolution logic.
var currentUserContextFn = currentUserContext

// Rules service wiring: mirror jobposition pattern
var RulesSvc *rulesv2.RuleBackEndService

func SetRulesService(s *rulesv2.RuleBackEndService) { RulesSvc = s }
func fireEventDefinitionTrigger(c *gin.Context, operation string, def any) {
	if RulesSvc == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := RulesSvc.OnEventDefinition(ctx, operation, def); err != nil {
		log.Printf("Failed to fire event definition trigger (operation=%s, eventDefinition:%v): %v",
			operation, def, err)
	}
}
func fireScheduledEventTrigger(c *gin.Context, operation, updateField string, sched any) {
	if RulesSvc == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := RulesSvc.OnScheduledEvent(ctx, operation, updateField, sched); err != nil {
		log.Printf("Failed to fire scheduled event trigger (operation=%s, updateField:%s scheduledEvent:%v): %v",
			operation, updateField, sched, err)
	}
}

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

	// Resolve current user and roles so we can enforce restrictions
	_, _, isAdmin, isHR, err := currentUserContextFn(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	createdBy, exists := c.Get("email")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User identity not found in token"})
		return
	}

	// Regular users are not permitted to set GrantsCertificateID
	var grants *int
	if isAdmin || isHR {
		grants = req.GrantsCertificateID
	} else {
		grants = nil
	}

	definition := models.CustomEventDefinition{
		EventName:           req.EventName,
		ActivityDescription: req.ActivityDescription,
		StandardDuration:    req.StandardDuration,
		GrantsCertificateID: grants,
		Facilitator:         req.Facilitator,
		CreatedBy:           createdBy.(string),
	}

	if err := DB.Create(&definition).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event definition"})
		return
	}

	// fire rules trigger
	fireEventDefinitionTrigger(c, "create", definition)

	c.JSON(http.StatusCreated, definition)
}

// GetEventDefinitionsHandler returns a list of all available event templates.
func GetEventDefinitionsHandler(c *gin.Context) {
	var definitions []models.CustomEventDefinition

	// Determine caller role; non-admin/HR users should only see their own definitions
	_, _, isAdmin, isHR, err := currentUserContextFn(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if isAdmin || isHR {
		if err := DB.Find(&definitions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event definitions"})
			return
		}
	} else {
		// Use the email from the token to filter definitions created by this user
		emailVal, _ := c.Get("email")
		email := ""
		if emailVal != nil {
			email = emailVal.(string)
		}
		if err := DB.Where("created_by = ?", email).Find(&definitions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event definitions"})
			return
		}
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

	// Ensure permissions: non-admin/HR can only update their own definitions and cannot set GrantsCertificateID
	_, _, isAdmin, isHR, err := currentUserContextFn(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if !(isAdmin || isHR) {
		// Get requester's email
		emailVal, _ := c.Get("email")
		email := ""
		if emailVal != nil {
			email = emailVal.(string)
		}
		if definitionToUpdate.CreatedBy != email {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not permitted to modify this event definition"})
			return
		}
	}

	// Update fields from request
	definitionToUpdate.EventName = req.EventName
	definitionToUpdate.ActivityDescription = req.ActivityDescription
	definitionToUpdate.StandardDuration = req.StandardDuration
	// Only Admin/HR may set GrantsCertificateID
	if isAdmin || isHR {
		definitionToUpdate.GrantsCertificateID = req.GrantsCertificateID
	} else {
		definitionToUpdate.GrantsCertificateID = nil
	}
	definitionToUpdate.Facilitator = req.Facilitator

	if err := DB.Save(&definitionToUpdate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event definition"})
		return
	}

	// fire rules trigger
	fireEventDefinitionTrigger(c, "update", definitionToUpdate)

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

	// Load the definition to check ownership/permissions
	var def models.CustomEventDefinition
	if err := DB.First(&def, definitionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event definition not found"})
		return
	}

	// Check permissions
	_, _, isAdmin, isHR, err := currentUserContextFn(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if !(isAdmin || isHR) {
		emailVal, _ := c.Get("email")
		email := ""
		if emailVal != nil {
			email = emailVal.(string)
		}
		if def.CreatedBy != email {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not permitted to delete this event definition"})
			return
		}
	}

	result := DB.Delete(&models.CustomEventDefinition{}, definitionID)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event definition. It may be in use by a scheduled event."})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event definition not found or already deleted"})
		return
	}

	// fire rules trigger
	fireEventDefinitionTrigger(c, "delete", def)

	c.JSON(http.StatusOK, gin.H{"message": "Event definition deleted successfully"})
}

// CreateEventScheduleParams holds the parameters needed to create an event schedule
type CreateEventScheduleParams struct {
	Request         models.CreateEventScheduleRequest
	CurrentUser     *gen_models.User
	CurrentEmployee *gen_models.Employee
	IsAdmin         bool
	IsHR            bool
}

// CreateEventScheduleResult holds the result of creating an event schedule
type CreateEventScheduleResult struct {
	Schedule     models.CustomEventSchedule
	AllSchedules []models.CustomEventSchedule
}

// CreateEventSchedule creates a new scheduled instance of an event definition.
// This function contains the core business logic and can be called from anywhere in the project.
func CreateEventSchedule(params CreateEventScheduleParams) (*CreateEventScheduleResult, error) {
	req := params.Request
	currentUser := params.CurrentUser
	currentEmployee := params.CurrentEmployee
	isAdmin := params.IsAdmin
	isHR := params.IsHR

	// Enforce create constraints for generic users
	if !isAdmin && !isHR {
		// Generic users cannot target other employees or positions
		if len(req.PositionCodes) > 0 {
			return nil, fmt.Errorf("you cannot target job positions")
		}
		if len(req.EmployeeNumbers) > 0 {
			// Only themselves permitted
			if !(len(req.EmployeeNumbers) == 1 && req.EmployeeNumbers[0] == currentEmployee.Employeenumber) {
				return nil, fmt.Errorf("you can only schedule for yourself")
			}
		}
	}

	// Check if the referenced CustomEventID exists before creating a schedule for it.
	var count int64
	if err := DB.Model(&models.CustomEventDefinition{}).Where("custom_event_id = ?", req.CustomEventID).Count(&count).Error; err != nil {
		return nil, fmt.Errorf("database error while checking for event definition: %w", err)
	}
	if count == 0 {
		return nil, fmt.Errorf("event definition with the specified ID not found")
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
	if currentUser != nil {
		schedule.CreatedByUserID = &currentUser.ID
	}

	if req.StatusName != "" {
		schedule.StatusName = req.StatusName
	}

	// GORM will now only insert into the `custom_event_schedules` table.
	if err := DB.Create(&schedule).Error; err != nil {
		return nil, fmt.Errorf("failed to create event schedule: %w", err)
	}

	// Write target links if any
	if len(req.EmployeeNumbers) == 0 && !isAdmin && !isHR {
		// For generic user with no explicit employeeNumbers, attach themselves
		if err := DB.Create(&models.EventScheduleEmployee{CustomEventScheduleID: schedule.CustomEventScheduleID, EmployeeNumber: currentEmployee.Employeenumber, Role: "Attendee"}).Error; err != nil {
			return nil, fmt.Errorf("failed to create employee link: %w", err)
		}
	} else {
		for _, emp := range req.EmployeeNumbers {
			if err := DB.Create(&models.EventScheduleEmployee{CustomEventScheduleID: schedule.CustomEventScheduleID, EmployeeNumber: emp, Role: "Attendee"}).Error; err != nil {
				return nil, fmt.Errorf("failed to create employee link for %s: %w", emp, err)
			}
		}
	}
	for _, pos := range req.PositionCodes {
		if err := DB.Create(&models.EventSchedulePositionTarget{CustomEventScheduleID: schedule.CustomEventScheduleID, PositionMatrixCode: pos}).Error; err != nil {
			return nil, fmt.Errorf("failed to create position target for %s: %w", pos, err)
		}
	}

	// After creating, fetch and return the entire updated list of schedules.
	// This ensures the frontend state is always consistent.
	var allSchedules []models.CustomEventSchedule
	if err := DB.Preload("CustomEventDefinition").Preload("Employees").Preload("Positions").Order("event_start_date asc").Find(&allSchedules).Error; err != nil {
		// The creation succeeded, but we can't return the list.
		// Return the single created item as a fallback.
		return &CreateEventScheduleResult{
			Schedule:     schedule,
			AllSchedules: []models.CustomEventSchedule{schedule},
		}, nil
	}

	return &CreateEventScheduleResult{
		Schedule:     schedule,
		AllSchedules: allSchedules,
	}, nil
}

// CreateEventScheduleHandler creates a new scheduled instance of an event definition.
func CreateEventScheduleHandler(c *gin.Context) {
	var req models.CreateEventScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	// Resolve current user and role
	currentUser, currentEmployee, isAdmin, isHR, err := currentUserContextFn(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Call the extracted business logic function
	params := CreateEventScheduleParams{
		Request:         req,
		CurrentUser:     currentUser,
		CurrentEmployee: currentEmployee,
		IsAdmin:         isAdmin,
		IsHR:            isHR,
	}

	result, err := CreateEventSchedule(params)
	if err != nil {
		// Determine appropriate HTTP status based on error message
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "not found") {
			status = http.StatusNotFound
		} else if strings.Contains(err.Error(), "cannot target") || strings.Contains(err.Error(), "can only schedule") {
			status = http.StatusForbidden
		} else if strings.Contains(err.Error(), "database error") {
			status = http.StatusInternalServerError
		}

		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	// fire rules trigger
	fireScheduledEventTrigger(c, "create", "", result.Schedule)

	c.JSON(http.StatusCreated, result.AllSchedules)
}

// GetEventSchedulesHandler fetches all scheduled events, suitable for a calendar view.
func GetEventSchedulesHandler(c *gin.Context) {
	var schedules []models.CustomEventSchedule
	// Determine current user and role to filter results
	currentUser, currentEmployee, isAdmin, isHR, err := currentUserContextFn(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	q := DB.Preload("CustomEventDefinition").Preload("Employees").Preload("Positions")
	if isAdmin || isHR {
		if err := q.Find(&schedules).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event schedules"})
			return
		}
	} else {
		sub := DB.Table("employment_history").Select("position_matrix_code").Where("employee_number = ? AND (end_date IS NULL OR end_date > NOW())", currentEmployee.Employeenumber)
		if err := q.Joins("LEFT JOIN event_schedule_employees ese ON ese.custom_event_schedule_id = custom_event_schedules.custom_event_schedule_id").
			Joins("LEFT JOIN event_schedule_position_targets espt ON espt.custom_event_schedule_id = custom_event_schedules.custom_event_schedule_id").
			Where("ese.employee_number = ? OR espt.position_matrix_code IN (?) OR custom_event_schedules.created_by_user_id = ?", currentEmployee.Employeenumber, sub, currentUser.ID).
			Group("custom_event_schedules.custom_event_schedule_id").
			Find(&schedules).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event schedules"})
			return
		}
	}

	// Enrich with permission flags (avoid changing database model)
	type scheduleDTO struct {
		models.CustomEventSchedule
		CanEdit   bool `json:"canEdit"`
		CanDelete bool `json:"canDelete"`
		CreatorID *int64 `json:"creatorUserId"`
	}
	out := make([]scheduleDTO, 0, len(schedules))
	for _, s := range schedules {
		creatorID := s.CreatedByUserID
		canManage := false
		if isAdmin || isHR {
			canManage = true
		} else if creatorID != nil && currentUser != nil && *creatorID == currentUser.ID {
			canManage = true
		}
		out = append(out, scheduleDTO{CustomEventSchedule: s, CanEdit: canManage, CanDelete: canManage, CreatorID: creatorID})
	}

	c.JSON(http.StatusOK, out)
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

	// Permissions: Only Admin/HR or the original creator may update the schedule.
	// (Previous logic allowed any directly linked attendee; now tightened per new RBAC requirement.)
	currentUser, currentEmployee, isAdmin, isHR, err := currentUserContextFn(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if !isAdmin && !isHR {
		if scheduleToUpdate.CreatedByUserID == nil || *scheduleToUpdate.CreatedByUserID != currentUser.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not permitted to modify this event"})
			return
		}
		// Creator (non Admin/HR) still cannot add other employees or positions beyond themselves.
		if len(req.EmployeeNumbers) > 0 && !(len(req.EmployeeNumbers) == 1 && req.EmployeeNumbers[0] == currentEmployee.Employeenumber) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only modify yourself as attendee"})
			return
		}
		if len(req.PositionCodes) > 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "You cannot target positions"})
			return
		}
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

	// Update links: replace sets if provided
	if req.EmployeeNumbers != nil {
		_ = DB.Where("custom_event_schedule_id = ?", scheduleToUpdate.CustomEventScheduleID).Delete(&models.EventScheduleEmployee{})
		for _, emp := range req.EmployeeNumbers {
			_ = DB.Create(&models.EventScheduleEmployee{CustomEventScheduleID: scheduleToUpdate.CustomEventScheduleID, EmployeeNumber: emp, Role: "Attendee"}).Error
		}
	}
	if req.PositionCodes != nil {
		_ = DB.Where("custom_event_schedule_id = ?", scheduleToUpdate.CustomEventScheduleID).Delete(&models.EventSchedulePositionTarget{})
		for _, pos := range req.PositionCodes {
			_ = DB.Create(&models.EventSchedulePositionTarget{CustomEventScheduleID: scheduleToUpdate.CustomEventScheduleID, PositionMatrixCode: pos}).Error
		}
	}

	// If status changed to Completed, and the definition grants a competency, grant to attendees
	if scheduleToUpdate.StatusName == "Completed" {
		go grantCompetenciesForCompletedSchedule(scheduleToUpdate.CustomEventScheduleID)
	}

	// FIX: After updating, fetch and return the entire updated list of schedules.
	var allSchedules []models.CustomEventSchedule
	if err := DB.Preload("CustomEventDefinition").Preload("Employees").Preload("Positions").Order("event_start_date asc").Find(&allSchedules).Error; err != nil {
		// The update succeeded, but we can't return the list.
		// Return the single updated item as a fallback.
		c.JSON(http.StatusOK, scheduleToUpdate)
		return
	}

	// fire rules trigger (generic field for now)
	fireScheduledEventTrigger(c, "update", "other", scheduleToUpdate)

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

	// Load the schedule first so we can include fields (e.g., Title) in the trigger context
	var schedule models.CustomEventSchedule
	if err := DB.First(&schedule, scheduleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event schedule not found"})
		return
	}

	// Permission gate: Only Admin/HR or the creator may delete.
	currentUser, _, isAdmin, isHR, err := currentUserContextFn(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if !isAdmin && !isHR {
		if schedule.CreatedByUserID == nil || *schedule.CreatedByUserID != currentUser.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not permitted to delete this event"})
			return
		}
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

	// fire rules trigger
	// Include the pre-delete schedule so facts like scheduledEvent.Title resolve
	fireScheduledEventTrigger(c, "delete", "", schedule)

	c.JSON(http.StatusOK, gin.H{"message": "Event schedule deleted successfully"})
}

// currentUserContext resolves the current gen_models.User and their employee, with role flags
func currentUserContext(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
	emailVal, ok := c.Get("email")
	if !ok {
		return nil, nil, false, false, gin.Error{Err: http.ErrNoCookie}
	}
	email := emailVal.(string)

	var ext models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("Useraccountemail = ?", email).First(&ext).Error; err != nil || ext.User == nil {
		return nil, nil, false, false, gin.Error{Err: http.ErrNoCookie}
	}

	// Determine role by page permissions: check if user has Admin role by name, and HR by role mapping
	isAdmin := false
	isHR := false
	// Legacy user table role
	if ext.User.Role == "Admin" {
		isAdmin = true
	}
	// Check mapped roles
	if allowed, _ := role.UserHasRoleName(ext.User.ID, "Admin"); allowed {
		isAdmin = true
	}
	if allowed, _ := role.UserHasRoleName(ext.User.ID, "HR"); allowed {
		isHR = true
	}

	return ext.User, &ext.Employee, isAdmin, isHR, nil
}

// ===================== Attendance & Competency Granting =====================

// AttendancePayload represents marking attendance for a schedule
type AttendancePayload struct {
	EmployeeNumbers []string        `json:"employeeNumbers"`
	Attendance      map[string]bool `json:"attendance"` // optional map employeeNumber -> attended
}

// SetAttendanceHandler sets attendance for a schedule; Admin/HR only.
// Behavior: replaces the entire attendance set for the given schedule with the
// provided candidate employees. Any employee omitted from the request will be
// removed. The "attendance" map determines who is marked attended=true; all
// others default to false.
func SetAttendanceHandler(c *gin.Context) {
	scheduleIDStr := c.Param("scheduleID")
	scheduleID, err := strconv.Atoi(scheduleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Schedule ID"})
		return
	}

	_, _, isAdmin, isHR, err := currentUserContextFn(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if !isAdmin && !isHR {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	var payload AttendancePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	now := time.Now()
	// Build the full candidate set from provided arrays and map keys
	candidateSet := map[string]struct{}{}
	for _, e := range payload.EmployeeNumbers {
		if e != "" {
			candidateSet[e] = struct{}{}
		}
	}
	for e := range payload.Attendance {
		if e != "" {
			candidateSet[e] = struct{}{}
		}
	}

	// If nothing provided, treat as bad request
	if len(candidateSet) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No employees provided for attendance"})
		return
	}

	// Clear existing attendance rows for this schedule to avoid stale data
	_ = DB.Where("custom_event_schedule_id = ?", scheduleID).Delete(&models.EventAttendance{})

	// Insert fresh rows: default to not attended unless explicitly true in map
	for e := range candidateSet {
		attended, ok := payload.Attendance[e]
		if !ok {
			attended = false
		}
		var checkIn *time.Time
		if attended {
			checkIn = &now
		}
		// Important: explicitly persist Attended=false for non-attendees.
		att := models.EventAttendance{CustomEventScheduleID: scheduleID, EmployeeNumber: e, Attended: attended, CheckInTime: checkIn}
		_ = DB.Create(&att).Error
	}

	// If the schedule is already completed, recompute competency grants now
	var sched models.CustomEventSchedule
	if err := DB.Select("status_name").First(&sched, scheduleID).Error; err == nil {
		if sched.StatusName == "Completed" {
			go grantCompetenciesForCompletedSchedule(scheduleID)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Attendance saved"})
}

// GetAttendanceHandler lists attendance records for a schedule.
func GetAttendanceHandler(c *gin.Context) {
	scheduleIDStr := c.Param("scheduleID")
	scheduleID, err := strconv.Atoi(scheduleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Schedule ID"})
		return
	}

	var rows []models.EventAttendance
	if err := DB.Where("custom_event_schedule_id = ?", scheduleID).Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance"})
		return
	}
	c.JSON(http.StatusOK, rows)
}

// GetAttendanceCandidates returns employees who are candidates to attend the schedule:
// - explicitly linked employees, plus
// - employees currently in targeted positions.
func GetAttendanceCandidates(c *gin.Context) {
	scheduleIDStr := c.Param("scheduleID")
	scheduleID, err := strconv.Atoi(scheduleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Schedule ID"})
		return
	}

	// Load explicit employee links
	var empLinks []models.EventScheduleEmployee
	_ = DB.Where("custom_event_schedule_id = ?", scheduleID).Find(&empLinks).Error
	empSet := map[string]struct{}{}
	for _, l := range empLinks {
		empSet[l.EmployeeNumber] = struct{}{}
	}

	// Load employees from position targets
	var posTargets []models.EventSchedulePositionTarget
	_ = DB.Where("custom_event_schedule_id = ?", scheduleID).Find(&posTargets).Error
	for _, t := range posTargets {
		rows := []struct{ EmployeeNumber string }{}
		DB.Table("employment_history").
			Select("employee_number").
			Where("position_matrix_code = ? AND (end_date IS NULL OR end_date > NOW())", t.PositionMatrixCode).
			Scan(&rows)
		for _, r := range rows {
			empSet[r.EmployeeNumber] = struct{}{}
		}
	}

	// Fetch basic identity for the set
	empNums := make([]string, 0, len(empSet))
	for k := range empSet {
		empNums = append(empNums, k)
	}
	type dto struct {
		EmployeeNumber string `json:"employeeNumber"`
		Name           string `json:"name"`
	}
	var out []dto
	if len(empNums) == 0 {
		c.JSON(http.StatusOK, out)
		return
	}

	DB.Table("employee AS e").
		Select("e.employeenumber AS employee_number, (e.firstname || ' ' || e.lastname) AS name").
		Where("e.employeenumber IN ?", empNums).
		Scan(&out)
	c.JSON(http.StatusOK, out)
}

// grantCompetenciesForCompletedSchedule looks up any GrantsCertificateID for the schedule definition
// and grants the competency to attended employees and to employees currently in targeted positions.
func grantCompetenciesForCompletedSchedule(scheduleID int) {
	// Load schedule with definition and targets
	var schedule models.CustomEventSchedule
	if err := DB.Preload("CustomEventDefinition").First(&schedule, scheduleID).Error; err != nil {
		return
	}
	if schedule.CustomEventDefinition.GrantsCertificateID == nil {
		return
	}
	compID := *schedule.CustomEventDefinition.GrantsCertificateID

	// Build set of employee numbers from explicit attendance rows (attended=true) only
	var attendance []models.EventAttendance
	_ = DB.Where("custom_event_schedule_id = ? AND attended = ?", scheduleID, true).Find(&attendance).Error
	empSet := map[string]struct{}{}
	for _, a := range attendance {
		empSet[a.EmployeeNumber] = struct{}{}
	}

	// Remove grants for employees no longer marked attended for this schedule
	if len(empSet) > 0 {
		empList := make([]string, 0, len(empSet))
		for e := range empSet {
			empList = append(empList, e)
		}
		DB.Exec("DELETE FROM employee_competencies WHERE granted_by_schedule_id = ? AND employee_number NOT IN ?", scheduleID, empList)
	} else {
		DB.Exec("DELETE FROM employee_competencies WHERE granted_by_schedule_id = ?", scheduleID)
	}

	// Preload competency definition for expiry calculation
	var compDef models.CompetencyDefinition
	_ = DB.First(&compDef, compID).Error

	now := time.Now().UTC()
	achDate := now

	var expiry *time.Time
	if compDef.ExpiryPeriodMonths != nil {
		e := achDate.AddDate(0, *compDef.ExpiryPeriodMonths, 0)
		expiry = &e
	}

	for emp := range empSet {
		var cnt int64
		DB.Table("employee_competencies").
			Where("employee_number = ? AND competency_id = ? AND granted_by_schedule_id = ?", emp, compID, scheduleID).
			Count(&cnt)
		if cnt == 0 {
			ec := models.EmployeeCompetency{
				EmployeeNumber:      emp,
				CompetencyID:        compID,
				AchievementDate:     &achDate,
				ExpiryDate:          expiry,
				GrantedByScheduleID: &scheduleID,
			}
			_ = DB.Create(&ec).Error
		}
	}
}

// ===================== Utilities for UI (employees by positions, competency checks) =====================

// GetEmployeesByPositions returns a list of employee numbers currently in any of the given position codes.
// Query param: codes=A,B,C
func GetEmployeesByPositions(c *gin.Context) {
	codesParam := c.Query("codes")
	if codesParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "codes query parameter required"})
		return
	}
	codes := []string{}
	for _, s := range strings.Split(codesParam, ",") {
		if t := strings.TrimSpace(s); t != "" {
			codes = append(codes, t)
		}
	}
	if len(codes) == 0 {
		c.JSON(http.StatusOK, []string{})
		return
	}
	rows := []struct{ EmployeeNumber string }{}
	DB.Table("employment_history").
		Select("employee_number").
		Where("position_matrix_code IN ? AND (end_date IS NULL OR end_date > NOW())", codes).
		Group("employee_number").
		Scan(&rows)
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		out = append(out, r.EmployeeNumber)
	}
	c.JSON(http.StatusOK, out)
}

type checkCompetencyReq struct {
	CompetencyID    int      `json:"competencyId"`
	EmployeeNumbers []string `json:"employeeNumbers"`
}

// CheckEmployeesHaveCompetency returns a map of employeeNumber->bool indicating if the employee has the competency.
func CheckEmployeesHaveCompetency(c *gin.Context) {
	var req checkCompetencyReq
	if err := c.ShouldBindJSON(&req); err != nil || req.CompetencyID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "competencyId and employeeNumbers required"})
		return
	}
	if len(req.EmployeeNumbers) == 0 {
		c.JSON(http.StatusOK, gin.H{"result": map[string]bool{}})
		return
	}
	rows := []struct{ EmployeeNumber string }{}
	DB.Table("employee_competencies").
		Select("employee_number").
		Where("competency_id = ? AND employee_number IN ?", req.CompetencyID, req.EmployeeNumbers).
		Group("employee_number").
		Scan(&rows)
	m := map[string]bool{}
	for _, e := range req.EmployeeNumbers {
		m[e] = false
	}
	for _, r := range rows {
		m[r.EmployeeNumber] = true
	}
	c.JSON(http.StatusOK, gin.H{"result": m})
}
