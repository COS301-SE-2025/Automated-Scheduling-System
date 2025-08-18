package event

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"Automated-Scheduling-Project/internal/role"
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

	// Resolve current user and role
	currentUser, currentEmployee, isAdmin, isHR, err := currentUserContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Enforce create constraints for generic users
	if !isAdmin && !isHR {
		// Generic users cannot target other employees or positions
		if len(req.PositionCodes) > 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "You cannot target job positions"})
			return
		}
		if len(req.EmployeeNumbers) > 0 {
			// Only themselves permitted
			if !(len(req.EmployeeNumbers) == 1 && req.EmployeeNumbers[0] == currentEmployee.Employeenumber) {
				c.JSON(http.StatusForbidden, gin.H{"error": "You can only schedule for yourself"})
				return
			}
		}
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
		CreatedByUserID:  currentUser.ID,
	}

	if req.StatusName != "" {
		schedule.StatusName = req.StatusName
	}

	// GORM will now only insert into the `custom_event_schedules` table.
	if err := DB.Create(&schedule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event schedule"})
		return
	}

	// Write target links if any
	if len(req.EmployeeNumbers) == 0 && !isAdmin && !isHR {
		// For generic user with no explicit employeeNumbers, attach themselves
		_ = DB.Create(&models.EventScheduleEmployee{CustomEventScheduleID: schedule.CustomEventScheduleID, EmployeeNumber: currentEmployee.Employeenumber, Role: "Attendee"}).Error
	} else {
		for _, emp := range req.EmployeeNumbers {
			_ = DB.Create(&models.EventScheduleEmployee{CustomEventScheduleID: schedule.CustomEventScheduleID, EmployeeNumber: emp, Role: "Attendee"}).Error
		}
	}
	for _, pos := range req.PositionCodes {
		_ = DB.Create(&models.EventSchedulePositionTarget{CustomEventScheduleID: schedule.CustomEventScheduleID, PositionMatrixCode: pos}).Error
	}

    // After creating, fetch and return the entire updated list of schedules.
    // This ensures the frontend state is always consistent.
    var allSchedules []models.CustomEventSchedule
	if err := DB.Preload("CustomEventDefinition").Preload("Employees").Preload("Positions").Order("event_start_date asc").Find(&allSchedules).Error; err != nil {
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
	// Determine current user and role to filter results
	currentUser, currentEmployee, isAdmin, isHR, err := currentUserContext(c)
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
		// Limit to schedules linked to this employee, or targeting their current positions
		// a) direct employee link
		// b) position-based via employment_history (current positions where end_date is NULL)
		// Build subquery for position codes
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

	// Permissions: Generic user can only update their own schedule and cannot add others
	_, currentEmployee, isAdmin, isHR, err := currentUserContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if !isAdmin && !isHR {
		// Ensure the user is the creator or is directly linked; and cannot add others
		var linkCount int64
		_ = DB.Model(&models.EventScheduleEmployee{}).Where("custom_event_schedule_id = ? AND employee_number = ?", scheduleToUpdate.CustomEventScheduleID, currentEmployee.Employeenumber).Count(&linkCount)
		if scheduleToUpdate.CreatedByUserID == 0 || (scheduleToUpdate.CreatedByUserID != 0 && linkCount == 0) {
			// load creator to be safe
		}
		if scheduleToUpdate.CreatedByUserID != 0 && linkCount == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not permitted to modify this event"})
			return
		}
		// Strip any attempt to add other employees/positions
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

    // FIX: After updating, fetch and return the entire updated list of schedules.
    var allSchedules []models.CustomEventSchedule
	if err := DB.Preload("CustomEventDefinition").Preload("Employees").Preload("Positions").Order("event_start_date asc").Find(&allSchedules).Error; err != nil {
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

// currentUserContext resolves the current gen_models.User and their employee, with role flags
func currentUserContext(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
	emailVal, ok := c.Get("email")
	if !ok {
		return nil, nil, false, false,  gin.Error{Err:  http.ErrNoCookie}
	}
	email := emailVal.(string)

	var ext models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("Useraccountemail = ?", email).First(&ext).Error; err != nil || ext.User == nil {
		return nil, nil, false, false,  gin.Error{Err:  http.ErrNoCookie}
	}

	// Determine role by page permissions: check if user has Admin role by name, and HR by role mapping
	isAdmin := false
	isHR := false
	// Legacy user table role
	if ext.User.Role == "Admin" { isAdmin = true }
	// Check mapped roles
	if allowed, _ := role.UserHasRoleName(ext.User.ID, "Admin"); allowed { isAdmin = true }
	if allowed, _ := role.UserHasRoleName(ext.User.ID, "HR"); allowed { isHR = true }

	return ext.User, &ext.Employee, isAdmin, isHR, nil
}