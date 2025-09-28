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
	"gorm.io/gorm/clause"
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

// GetBookedEmployeesHandler returns the employees who booked this schedule (role='Booked')
func GetBookedEmployeesHandler(c *gin.Context) {
    scheduleIDStr := c.Param("scheduleID")
    scheduleID, err := strconv.Atoi(scheduleIDStr)
    if err != nil || scheduleID <= 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Schedule ID"})
        return
    }
    type row struct {
        EmployeeNumber string `json:"employeeNumber"`
        Name           string `json:"name"`
    }
    // Ensure JSON encodes to [] (not null) when empty
    rows := make([]row, 0)
    DB.Table("event_schedule_employees AS ese").
        Select("ese.employee_number AS employee_number, CONCAT(e.firstname, ' ', e.lastname) AS name").
        Joins("JOIN employee e ON e.employeenumber = ese.employee_number").
        Where("ese.custom_event_schedule_id = ? AND ese.role = ?", scheduleID, "Booked").
        Scan(&rows)
    c.JSON(http.StatusOK, rows)
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

    // Collect IDs
    ids := make([]int, 0, len(schedules))
    for _, s := range schedules {
        ids = append(ids, int(s.CustomEventScheduleID))
    }

    type countRow struct{ ID int; Cnt int }

    // Count booked (only used for non-completed)
    bookedCountMap := map[int]int{}
    if len(ids) > 0 {
        var rows []countRow
        DB.Table("event_schedule_employees").
            Select("custom_event_schedule_id AS id, COUNT(*) AS cnt").
            Where("custom_event_schedule_id IN ? AND role = ?", ids, "Booked").
            Group("custom_event_schedule_id").
            Scan(&rows)
        for _, r := range rows {
            bookedCountMap[r.ID] = r.Cnt
        }
    }

    // Count attended based on attendance table for completed events
    attendedCountMap := map[int]int{}
    if len(ids) > 0 {
        var rows []countRow
        DB.Table("event_attendance").
            Select("custom_event_schedule_id AS id, COUNT(*) AS cnt").
            Where("custom_event_schedule_id IN ? AND attended = ?", ids, true).
            Group("custom_event_schedule_id").
            Scan(&rows)
        for _, r := range rows {
            attendedCountMap[r.ID] = r.Cnt
        }
    }

    // Current user's role entry (Booked/Rejected/Attended/Not Attended/Attendee/etc.)
    myBookingMap := map[int]string{}
    if currentEmployee != nil && len(ids) > 0 {
        type myRow struct{ ID int; Role string }
        var rows []myRow
        DB.Table("event_schedule_employees").
            Select("custom_event_schedule_id AS id, role").
            Where("employee_number = ? AND custom_event_schedule_id IN ?", currentEmployee.Employeenumber, ids).
            Scan(&rows)
        for _, r := range rows {
            myBookingMap[r.ID] = r.Role
        }
    }

    // Compute RSVP eligibility (false for completed)
    canRSVPMap := map[int]bool{}
    if currentEmployee != nil && len(ids) > 0 {
        // User’s current positions
        posRows := []struct{ Code string }{}
        DB.Table("employment_history").
            Select("position_matrix_code AS code").
            Where("employee_number = ? AND (end_date IS NULL OR end_date > NOW())", currentEmployee.Employeenumber).
            Scan(&posRows)
        posCodes := make([]string, 0, len(posRows))
        for _, r := range posRows { if r.Code != "" { posCodes = append(posCodes, r.Code) } }

        // Schedules targeted by user positions
        posEligible := map[int]bool{}
        if len(posCodes) > 0 {
            var rows []struct{ ID int }
            DB.Table("event_schedule_position_targets").
                Select("custom_event_schedule_id AS id").
                Where("custom_event_schedule_id IN ? AND position_matrix_code IN ?", ids, posCodes).
                Group("custom_event_schedule_id").
                Scan(&rows)
            for _, r := range rows { posEligible[r.ID] = true }
        }

        // Counts to detect open events
        empLinkCount := map[int]int{}
        if len(ids) > 0 {
            var rows []countRow
            DB.Table("event_schedule_employees").
                Select("custom_event_schedule_id AS id, COUNT(*) AS cnt").
                Where("custom_event_schedule_id IN ?", ids).
                Group("custom_event_schedule_id").
                Scan(&rows)
            for _, r := range rows { empLinkCount[r.ID] = r.Cnt }
        }
        posLinkCount := map[int]int{}
        if len(ids) > 0 {
            var rows []countRow
            DB.Table("event_schedule_position_targets").
                Select("custom_event_schedule_id AS id, COUNT(*) AS cnt").
                Where("custom_event_schedule_id IN ?", ids).
                Group("custom_event_schedule_id").
                Scan(&rows)
            for _, r := range rows { posLinkCount[r.ID] = r.Cnt }
        }

        for _, s := range schedules {
            id := int(s.CustomEventScheduleID)
            if strings.EqualFold(s.StatusName, "Completed") {
                canRSVPMap[id] = false
                continue
            }
            explicit := false
            if _, ok := myBookingMap[id]; ok { explicit = true }
            open := (empLinkCount[id] == 0 && posLinkCount[id] == 0)
            canRSVPMap[id] = explicit || posEligible[id] || open
        }
    }

    type scheduleDTO struct {
        models.CustomEventSchedule
        CanEdit      bool   `json:"canEdit"`
        CanDelete    bool   `json:"canDelete"`
        CreatorID    *int64 `json:"creatorUserId"`
        BookedCount  int    `json:"bookedCount"`
        SpotsLeft    *int   `json:"spotsLeft,omitempty"`
        MyBooking    string `json:"myBooking,omitempty"`
        CanRSVP      bool   `json:"canRSVP"`
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

        // Completed events: use attended count and disable spots
        id := int(s.CustomEventScheduleID)
        var bc int
        var leftPtr *int
        if strings.EqualFold(s.StatusName, "Completed") {
            bc = attendedCountMap[id]
            leftPtr = nil
        } else {
            bc = bookedCountMap[id]
            if s.MaximumAttendees > 0 {
                left := s.MaximumAttendees - bc
                if left < 0 { left = 0 }
                leftPtr = &left
            }
        }

        my := myBookingMap[id]
        canRSVP := canRSVPMap[id]

        out = append(out, scheduleDTO{
            CustomEventSchedule: s,
            CanEdit:             canManage,
            CanDelete:           canManage,
            CreatorID:           creatorID,
            BookedCount:         bc,
            SpotsLeft:           leftPtr,
            MyBooking:           my,
            CanRSVP:             canRSVP,
        })
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
	// Snapshot the original creator to prevent accidental ownership transfer
	origCreator := scheduleToUpdate.CreatedByUserID

	// Explicitly update only mutable fields; never touch created_by_user_id
	updates := map[string]any{
		"custom_event_id":    req.CustomEventID,
		"title":              req.Title,
		"event_start_date":   req.EventStartDate,
		"event_end_date":     req.EventEndDate,
		"room_name":          req.RoomName,
		"maximum_attendees":  req.MaximumAttendees,
		"minimum_attendees":  req.MinimumAttendees,
		"status_name":        req.StatusName,
		"color":              req.Color,
	}

	if err := DB.Model(&models.CustomEventSchedule{}).
        Where("custom_event_schedule_id = ?", scheduleID).
        Omit("created_by_user_id", "creation_date"). // protect ownership
        Updates(updates).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event schedule in database"})
        return
    }

    // Defensive: ensure ownership didn't change due to triggers or defaults
    if origCreator != nil {
        _ = DB.Model(&models.CustomEventSchedule{}).
            Where("custom_event_schedule_id = ?", scheduleID).
            Update("created_by_user_id", *origCreator).Error
    }

    // Reload entity so subsequent logic has fresh values
    if err := DB.First(&scheduleToUpdate, scheduleID).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload updated schedule"})
        return
    }

	// Update links: replace sets if provided
    if req.EmployeeNumbers != nil {
        // Load existing links so we can preserve their roles (Booked/Rejected/Facilitator/etc.)
        var existingLinks []models.EventScheduleEmployee
        _ = DB.Where("custom_event_schedule_id = ?", scheduleToUpdate.CustomEventScheduleID).
            Find(&existingLinks)

        oldRoles := make(map[string]string, len(existingLinks))
        for _, l := range existingLinks {
            oldRoles[l.EmployeeNumber] = l.Role
        }

        // Replace the set
        _ = DB.Where("custom_event_schedule_id = ?", scheduleToUpdate.CustomEventScheduleID).
            Delete(&models.EventScheduleEmployee{})

        for _, emp := range req.EmployeeNumbers {
            role := oldRoles[emp]
            if strings.TrimSpace(role) == "" {
                role = "Attendee" // default for new employees
            }
            _ = DB.Create(&models.EventScheduleEmployee{
                CustomEventScheduleID: scheduleToUpdate.CustomEventScheduleID,
                EmployeeNumber:        emp,
                Role:                  role,
            }).Error
        }
    }
    if req.PositionCodes != nil {
        _ = DB.Where("custom_event_schedule_id = ?", scheduleToUpdate.CustomEventScheduleID).
            Delete(&models.EventSchedulePositionTarget{})
        for _, pos := range req.PositionCodes {
            _ = DB.Create(&models.EventSchedulePositionTarget{
                CustomEventScheduleID: scheduleToUpdate.CustomEventScheduleID,
                PositionMatrixCode:    pos,
            }).Error
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

// // SetAttendanceHandler sets attendance for a schedule; Admin/HR only.
// // Behavior: replaces the entire attendance set for the given schedule with the
// // provided candidate employees. Any employee omitted from the request will be
// // removed. The "attendance" map determines who is marked attended=true; all
// // others default to false.
// func SetAttendanceHandler(c *gin.Context) {
// 	scheduleIDStr := c.Param("scheduleID")
// 	scheduleID, err := strconv.Atoi(scheduleIDStr)
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Schedule ID"})
// 		return
// 	}

// 	_, _, isAdmin, isHR, err := currentUserContextFn(c)
// 	if err != nil {
// 		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
// 		return
// 	}
// 	if !isAdmin && !isHR {
// 		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
// 		return
// 	}

// 	var payload AttendancePayload
// 	if err := c.ShouldBindJSON(&payload); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
// 		return
// 	}

// 	now := time.Now()
// 	// Build the full candidate set from provided arrays and map keys
// 	candidateSet := map[string]struct{}{}
// 	for _, e := range payload.EmployeeNumbers {
// 		if e != "" {
// 			candidateSet[e] = struct{}{}
// 		}
// 	}
// 	for e := range payload.Attendance {
// 		if e != "" {
// 			candidateSet[e] = struct{}{}
// 		}
// 	}

// 	// If nothing provided, treat as bad request
// 	if len(candidateSet) == 0 {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "No employees provided for attendance"})
// 		return
// 	}

// 	// Clear existing attendance rows for this schedule to avoid stale data
// 	_ = DB.Where("custom_event_schedule_id = ?", scheduleID).Delete(&models.EventAttendance{})

// 	// Insert fresh rows: default to not attended unless explicitly true in map
// 	for e := range candidateSet {
// 		attended, ok := payload.Attendance[e]
// 		if !ok {
// 			attended = false
// 		}
// 		var checkIn *time.Time
// 		if attended {
// 			checkIn = &now
// 		}
// 		// Important: explicitly persist Attended=false for non-attendees.
// 		att := models.EventAttendance{CustomEventScheduleID: scheduleID, EmployeeNumber: e, Attended: attended, CheckInTime: checkIn}
// 		_ = DB.Create(&att).Error
// 	}

// 	// If the schedule is already completed, recompute competency grants now
// 	var sched models.CustomEventSchedule
// 	if err := DB.Select("status_name").First(&sched, scheduleID).Error; err == nil {
// 		if sched.StatusName == "Completed" {
// 			go grantCompetenciesForCompletedSchedule(scheduleID)
// 		}
// 	}

// 	c.JSON(http.StatusOK, gin.H{"message": "Attendance saved"})
// }

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
	// Only remove records that were specifically granted by this schedule
	// If an employee had the competency from another source (job position, etc), 
	// we should reset their achievement_date to NULL instead of deleting the record
	if len(empSet) > 0 {
		empList := make([]string, 0, len(empSet))
		for e := range empSet {
			empList = append(empList, e)
		}
		
		// First, find records that were granted by this schedule for employees no longer attending
		var recordsToReset []models.EmployeeCompetency
		DB.Where("granted_by_schedule_id = ? AND employee_number NOT IN ?", scheduleID, empList).
			Find(&recordsToReset)
		
		// Reset achievement_date and granted_by_schedule_id for these records instead of deleting them
		// This preserves the original competency assignment (from job position, etc.)
		for _, record := range recordsToReset {
			record.AchievementDate = nil
			record.GrantedByScheduleID = nil
			record.ExpiryDate = nil
			record.Notes = "" // Clear the event completion note
			DB.Save(&record)
		}
	} else {
		// No employees attended - reset all records granted by this schedule
		var recordsToReset []models.EmployeeCompetency
		DB.Where("granted_by_schedule_id = ?", scheduleID).Find(&recordsToReset)
		
		for _, record := range recordsToReset {
			record.AchievementDate = nil
			record.GrantedByScheduleID = nil
			record.ExpiryDate = nil
			record.Notes = "" // Clear the event completion note
			DB.Save(&record)
		}
	}

	// Preload competency definition for expiry calculation
	var compDef models.CompetencyDefinition
	_ = DB.First(&compDef, compID).Error

	now := time.Now().UTC()
	achDate := now

	// Calculate expiry date based on achievement date and competency definition
	var expiry *time.Time
	if compDef.ExpiryPeriodMonths != nil {
		e := achDate.AddDate(0, *compDef.ExpiryPeriodMonths, 0)
		expiry = &e
	}

	// Grant competencies to attended employees
	for emp := range empSet {
		// Check if employee already has ANY record for this competency (regardless of schedule)
		var existingCompetency models.EmployeeCompetency
		err := DB.Where("employee_number = ? AND competency_id = ?", emp, compID).
			Order("employee_competency_id ASC"). // Get the first/oldest record if multiple exist
			First(&existingCompetency).Error

		if err != nil && err == gorm.ErrRecordNotFound {
			// No existing record at all, create new competency grant
			ec := models.EmployeeCompetency{
				EmployeeNumber:      emp,
				CompetencyID:        compID,
				AchievementDate:     &achDate,
				ExpiryDate:          expiry,
				GrantedByScheduleID: &scheduleID,
				Notes:               fmt.Sprintf("Competency granted by completing event: %s", schedule.Title),
			}
			
			// Handle potential unique constraint violations (employee_number, competency_id, achievement_date)
			// Try to create the record, if it fails due to unique constraint, update the existing record
			if err := DB.Create(&ec).Error; err != nil {
				// If creation fails, it might be due to the unique constraint
				// Check if there's already a competency for this employee/competency on the same date
				var existingOnDate models.EmployeeCompetency
				existingErr := DB.Where("employee_number = ? AND competency_id = ? AND achievement_date = ?", 
					emp, compID, achDate.Format("2006-01-02")).First(&existingOnDate).Error
				
				if existingErr == nil {
					// Found existing competency on same date, update it to be granted by this schedule
					existingOnDate.GrantedByScheduleID = &scheduleID
					existingOnDate.Notes = fmt.Sprintf("Competency granted by completing event: %s", schedule.Title)
					if existingOnDate.ExpiryDate == nil && expiry != nil {
						existingOnDate.ExpiryDate = expiry
					}
					_ = DB.Save(&existingOnDate).Error
				}
			}
		} else if err == nil {
			// Found existing record - update it to mark as completed
			existingCompetency.AchievementDate = &achDate
			existingCompetency.ExpiryDate = expiry
			existingCompetency.GrantedByScheduleID = &scheduleID
			existingCompetency.Notes = fmt.Sprintf("Competency granted by completing event: %s", schedule.Title)
			_ = DB.Save(&existingCompetency).Error
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
	
	// Query for completed competencies (achievement_date IS NOT NULL)
	// This aligns with the system's logic where NULL achievement_date means competency is required but not completed
	rows := []struct{ EmployeeNumber string }{}
	DB.Table("employee_competencies").
		Select("employee_number").
		Where("competency_id = ? AND employee_number IN ? AND achievement_date IS NOT NULL", req.CompetencyID, req.EmployeeNumbers).
		Group("employee_number").
		Scan(&rows)
	
	// Initialize all employees as not having the competency
	m := map[string]bool{}
	for _, e := range req.EmployeeNumbers {
		m[e] = false
	}
	// Mark employees who have completed the competency as true
	for _, r := range rows {
		m[r.EmployeeNumber] = true
	}
	c.JSON(http.StatusOK, gin.H{"result": m})
}

type rsvpPayload struct {
    Choice string `json:"choice"` // "book" | "reject"
}

// RSVPHandler lets the current user book or reject an event, with capacity enforcement.
func RSVPHandler(c *gin.Context) {
    scheduleIDStr := c.Param("scheduleID")
    scheduleID, err := strconv.Atoi(scheduleIDStr)
    if err != nil || scheduleID <= 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Schedule ID"})
        return
    }
    currentUser, currentEmployee, _, _, err := currentUserContextFn(c)
    if err != nil || currentEmployee == nil || currentUser == nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    var payload rsvpPayload
    if err := c.ShouldBindJSON(&payload); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
        return
    }
    choice := strings.ToLower(strings.TrimSpace(payload.Choice))
    if choice != "book" && choice != "reject" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Choice must be 'book' or 'reject'"})
        return
    }

    // Verify eligibility: user must be explicitly selected or targeted by a position
    eligible := false
    // Explicit
    var cnt int64
    _ = DB.Model(&models.EventScheduleEmployee{}).
        Where("custom_event_schedule_id = ? AND employee_number = ?", scheduleID, currentEmployee.Employeenumber).
        Count(&cnt)
    if cnt > 0 {
        eligible = true
    }
    // Targeted by position
    if !eligible {
        rows := []struct{ Position string }{}
        DB.Table("employment_history").
            Select("position_matrix_code AS position").
            Where("employee_number = ? AND (end_date IS NULL OR end_date > NOW())", currentEmployee.Employeenumber).
            Scan(&rows)
        if len(rows) > 0 {
            pos := make([]string, 0, len(rows))
            for _, r := range rows {
                pos = append(pos, r.Position)
            }
            var tcnt int64
            _ = DB.Model(&models.EventSchedulePositionTarget{}).
                Where("custom_event_schedule_id = ? AND position_matrix_code IN ?", scheduleID, pos).
                Count(&tcnt)
            if tcnt > 0 {
                eligible = true
            }
        }
    }
    // Open event (no explicit employees and no position targets): allow all users
    if !eligible {
        var empLinks, posTargets int64
        _ = DB.Model(&models.EventScheduleEmployee{}).Where("custom_event_schedule_id = ?", scheduleID).Count(&empLinks)
        _ = DB.Model(&models.EventSchedulePositionTarget{}).Where("custom_event_schedule_id = ?", scheduleID).Count(&posTargets)
        if empLinks == 0 && posTargets == 0 {
            eligible = true
        }
    }
    if !eligible {
        c.JSON(http.StatusForbidden, gin.H{"error": "You are not eligible for this event"})
        return
    }

    type rsvpResult struct {
        MyBooking   string `json:"myBooking"`
        BookedCount int    `json:"bookedCount"`
        SpotsLeft   *int   `json:"spotsLeft,omitempty"`
    }

    res := rsvpResult{}
    err = DB.Transaction(func(tx *gorm.DB) error {
        // Lock schedule row to serialize capacity checks
        var sched models.CustomEventSchedule
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            Preload("CustomEventDefinition").
            First(&sched, scheduleID).Error; err != nil {
            return fmt.Errorf("schedule not found")
        }

        // Load existing RSVP of current user (if any)
        var link models.EventScheduleEmployee
        _ = tx.Where("custom_event_schedule_id = ? AND employee_number = ?", scheduleID, currentEmployee.Employeenumber).
            First(&link).Error
        existing := strings.ToLower(link.Role)

        // Compute current booked count
        var bookedCnt int64
        _ = tx.Model(&models.EventScheduleEmployee{}).
            Where("custom_event_schedule_id = ? AND role = ?", scheduleID, "Booked").
            Count(&bookedCnt)

        // Enforce capacity if booking (0 = unlimited)
        if choice == "book" {
            if sched.MaximumAttendees > 0 {
                capacity := int64(sched.MaximumAttendees)
                if bookedCnt >= capacity && existing != "booked" {
                    return fmt.Errorf("event is fully booked")
                }
            }
        }

        // Upsert RSVP row
        newRole := "Rejected"
        if choice == "book" {
            newRole = "Booked"
        }
        if link.CustomEventScheduleID == 0 {
            link = models.EventScheduleEmployee{
                CustomEventScheduleID: scheduleID,
                EmployeeNumber:        currentEmployee.Employeenumber,
                Role:                  newRole,
            }
            if err := tx.Create(&link).Error; err != nil {
                return err
            }
        } else {
            if err := tx.Model(&models.EventScheduleEmployee{}).
                Where("custom_event_schedule_id = ? AND employee_number = ?", scheduleID, currentEmployee.Employeenumber).
                Update("role", newRole).Error; err != nil {
                return err
            }
        }

        // Recompute after change
        bookedCnt = 0
        _ = tx.Model(&models.EventScheduleEmployee{}).
            Where("custom_event_schedule_id = ? AND role = ?", scheduleID, "Booked").
            Count(&bookedCnt)

        res.MyBooking = newRole
        res.BookedCount = int(bookedCnt)
        if sched.MaximumAttendees > 0 {
            left := sched.MaximumAttendees - int(bookedCnt)
            if left < 0 {
                left = 0
            }
            res.SpotsLeft = &left
        } else {
            res.SpotsLeft = nil
        }
        return nil
    })
    if err != nil {
        if strings.Contains(err.Error(), "fully booked") {
            c.JSON(http.StatusConflict, gin.H{"error": "Event is fully booked"})
            return
        }
        if strings.Contains(err.Error(), "schedule not found") {
            c.JSON(http.StatusNotFound, gin.H{"error": "Event schedule not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update RSVP"})
        return
    }

    c.JSON(http.StatusOK, res)
}

// SetAttendanceHandler sets attendance for a schedule; Admin/HR only.
// Behavior: replaces the entire attendance set for the given schedule with the
// provided candidate employees and marks event_schedule_employees role to Attended/Not Attended.
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

    candidateSet := map[string]struct{}{}
    for _, e := range payload.EmployeeNumbers { if e != "" { candidateSet[e] = struct{}{} } }
    for e := range payload.Attendance { if e != "" { candidateSet[e] = struct{}{} } }
    if len(candidateSet) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No employees provided for attendance"})
        return
    }

    err = DB.Transaction(func(tx *gorm.DB) error {
        // Replace attendance rows
        if err := tx.Where("custom_event_schedule_id = ?", scheduleID).Delete(&models.EventAttendance{}).Error; err != nil {
            return err
        }
        for e := range candidateSet {
            attended := payload.Attendance[e]
            var checkIn *time.Time
            if attended { checkIn = &now }
            att := models.EventAttendance{CustomEventScheduleID: scheduleID, EmployeeNumber: e, Attended: attended, CheckInTime: checkIn}
            if err := tx.Create(&att).Error; err != nil { return err }
        }

        // Update event_schedule_employees roles accordingly
        for e := range candidateSet {
            newRole := "Not Attended"
            if payload.Attendance[e] {
                newRole = "Attended"
            }
            if err := tx.Model(&models.EventScheduleEmployee{}).
                Where("custom_event_schedule_id = ? AND employee_number = ?", scheduleID, e).
                Update("role", newRole).Error; err != nil {
                return err
            }
        }
        return nil
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save attendance"})
        return
    }

    // If the schedule is completed, (re)grant linked competencies to attended employees
    var sched models.CustomEventSchedule
    if err := DB.Select("status_name").First(&sched, scheduleID).Error; err == nil {
        if sched.StatusName == "Completed" {
            go grantCompetenciesForCompletedSchedule(scheduleID)
        }
    }
    c.JSON(http.StatusOK, gin.H{"message": "Attendance saved"})
}
