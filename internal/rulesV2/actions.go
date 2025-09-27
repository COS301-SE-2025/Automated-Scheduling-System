package rulesv2

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"Automated-Scheduling-Project/internal/email"
	"Automated-Scheduling-Project/internal/sms"

	"gorm.io/gorm"
)

// NotificationAction handles sending notifications
type NotificationAction struct {
	DB *gorm.DB
}

func (a *NotificationAction) Execute(ctx EvalContext, params map[string]any) error {
	// paramsJSON, _ := json.Marshal(params)
	// log.Printf("NotificationAction.Execute received params: %s", string(paramsJSON))

	recipientsParam, _ := params["recipients"].(string)
	subject, _ := params["subject"].(string)
	message, _ := params["message"].(string)
	notificationType, _ := params["type"].(string) // "email" or "sms"

	// Parse recipients JSON string into array
	var recipients []string
	if recipientsParam != "" {
		if err := json.Unmarshal([]byte(recipientsParam), &recipients); err != nil {
			return fmt.Errorf("failed to parse recipients JSON: %w", err)
		}
	}

	missing := []string{}
	if len(recipients) == 0 {
		missing = append(missing, "recipients")
	}
	if subject == "" {
		missing = append(missing, "subject")
	}
	if message == "" {
		missing = append(missing, "message")
	}
	if len(missing) > 0 {
		return fmt.Errorf("notification requires: %v", missing)
	}

	if notificationType == "" {
		notificationType = "email" // Default to email notification
	}

	// Send notification to each recipient
	for _, employeeNumber := range recipients {
		if employeeNumber == "" {
			continue // Skip empty recipient entries
		}

		// Get employee email from database
		var employee gen_models.Employee
		if err := a.DB.Where("employeenumber = ?", employeeNumber).First(&employee).Error; err != nil {
			log.Printf("Failed to find employee %s: %v", employeeNumber, err)
			return fmt.Errorf("failed to find employee %s: %w", employeeNumber, err)
		}

		switch notificationType {
		case "email":
			employeeEmail := employee.Useraccountemail

			err := a.sendEmail(employeeEmail, subject, message)
			if err != nil {
				log.Printf("Failed to send email to %s (%s): %v", employeeNumber, employeeEmail, err)
				return fmt.Errorf("failed to execute NotificationAction for %s: %w", employeeNumber, err)
			}
		case "sms":
			// Get employee phone number from database
			var employee gen_models.Employee
			if err := a.DB.Where("employeenumber = ?", employeeNumber).First(&employee).Error; err != nil {
				log.Printf("Failed to find employee %s: %v", employeeNumber, err)
				return fmt.Errorf("failed to find employee %s: %w", employeeNumber, err)
			}
			var employeeSMS string
			// Only send sms if the employee has a phone number
			if employee.PhoneNumber != nil {
				employeeSMS = *employee.PhoneNumber
			} else {
				log.Printf("Employee %s has no phone number, skipping SMS", employeeNumber)
				continue
			}

			smsWithSubject := subject + "\n\n" + message
			err := a.sendSMS(employeeSMS, smsWithSubject)
			if err != nil {
				log.Printf("Failed to send SMS to %s (%s): %v", employeeNumber, employeeSMS, err)
				return fmt.Errorf("failed to send SMS to %s: %w", employeeNumber, err)
			}
		case "push":
			// TODO: Implement push notification logic here
			log.Printf("PUSH NOTIFICATION SENT: To=%s, Subject=%s, Message=%s", employeeNumber, subject, message)
		default:
			return fmt.Errorf("unknown notification type: %s", notificationType)
		}

		// Log each successful notification
		err := a.logSuccessfulNotification(employee.Useraccountemail, subject, message, notificationType)
		if err != nil {
			log.Printf("Failed to log notification for %s: %v", employeeNumber, err)
		}
	}

	return nil
}

// System notification function (default behaviour if no notification service is passed in)
func (a *NotificationAction) logSuccessfulNotification(recipient, subject, message string, notificationType string) error {
	// TODO add notifications to the database models.
	notificationData := map[string]any{
		"type":      notificationType,
		"recipient": recipient,
		"subject":   subject,
		"message":   message,
	}

	logData, _ := json.Marshal(notificationData)
	log.Printf("NOTIFICATION SUCCEEDED: %s", string(logData))

	return nil
}

// Email function linked to the internal/email
func (a *NotificationAction) sendEmail(recipient, subject, message string) error {
	err := email.SendEmail(recipient, subject, message)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	return nil
}

// Calls sendSMS and handles error responses if there are any
func (a *NotificationAction) sendSMS(recipient, message string) error {
	resp, err := sms.SendSMS(recipient, message)
	if err != nil {
		log.Printf("SMS SEND ERROR: To=%s, Message=%s, Error=%v", recipient, message, err)
		return err
	}

	// Check if the recipient was actually accepted
	if len(resp.Recipients) == 0 {
		return fmt.Errorf("no recipients in SMS response")
	}

	recipientResp := resp.Recipients[0] // Will only send to one recipient for now
	if !recipientResp.Accepted {
		log.Printf("SMS REJECTED: To=%s, Error=%s", recipientResp.MobileNumber, recipientResp.AcceptError)
		return fmt.Errorf("SMS rejected by API: %s", recipientResp.AcceptError)
	}

	// log.Printf("SMS SENT: To=%s, Message=%s, MessageID=%d, Cost=%.1f",
	// 	recipientResp.MobileNumber, message, *recipientResp.APIMessageID, recipientResp.CreditCost)
	return nil
}

type CreateEventAction struct {
	DB *gorm.DB
}

func (a *CreateEventAction) Execute(ctx EvalContext, params map[string]any) error {
	// Extract parameters with proper type handling
	title, _ := params["title"].(string)
	startTime, _ := params["startTime"].(string)
	endTime, _ := params["endTime"].(string)
	roomName, _ := params["roomName"].(string)
	color, _ := params["color"].(string)
	statusName, _ := params["statusName"].(string)
	maxAttendees, _ := params["maxAttendees"].(int)
	minAttendees, _ := params["minAttendees"].(int)

	// Log extracted string parameters
	// log.Printf("Extracted parameters: title='%s', startTime='%s', endTime='%s', roomName='%s', color='%s', statusName='%s'",
	// title, startTime, endTime, roomName, color, statusName)

	// Handle customEventID parameter
	customEventID := 0
	if customEventIDParam, ok := params["customEventID"]; ok {
		switch v := customEventIDParam.(type) {
		case string:
			if parsed, err := strconv.Atoi(v); err == nil {
				customEventID = parsed
			}
		case int:
			customEventID = v
		case float64:
			customEventID = int(v)
		}
	}

	// Handle employee numbers - JSON string format
	var employeeNumbers []string
	if empParam, ok := params["employeeNumbers"]; ok {
		if empStr, ok := empParam.(string); ok && empStr != "" {
			if err := json.Unmarshal([]byte(empStr), &employeeNumbers); err != nil {
				return fmt.Errorf("invalid employeeNumbers format: %w", err)
			}
		}
	}

	// Handle position codes - JSON string format
	var positionCodes []string
	if posParam, ok := params["positionCodes"]; ok {
		log.Printf("positionCodes parameter found: %v (type: %T)", posParam, posParam)
		if posStr, ok := posParam.(string); ok && posStr != "" {
			if err := json.Unmarshal([]byte(posStr), &positionCodes); err != nil {
				log.Printf("Failed to parse positionCodes JSON: %v", err)
				return fmt.Errorf("invalid positionCodes format: %w", err)
			}
			log.Printf("Parsed positionCodes from JSON string: %v", positionCodes)
		}
	} else {
		log.Printf("positionCodes parameter not found in params")
	}

	// Log final extracted values before validation
	// log.Printf("Final extracted values: title='%s' (empty: %t), customEventID=%d (zero: %t), startTime='%s' (empty: %t)",
	// 	title, title == "", customEventID, customEventID == 0, startTime, startTime == "")

	// Required fields validation
	if title == "" || customEventID == 0 || startTime == "" {
		missing := []string{}
		if title == "" {
			missing = append(missing, "title")
		}
		if customEventID == 0 {
			missing = append(missing, "customEventID")
		}
		if startTime == "" {
			missing = append(missing, "startTime")
		}
		return fmt.Errorf("create_event requires title, customEventID, and startTime - missing: %v", missing)
	}

	// Parse start time
	startDateTime, err := time.Parse("2006-01-02T15:04", startTime)
	if err != nil {
		return fmt.Errorf("Couldn't parse startTime")
	}

	// Parse end time
	endDateTime, err := time.Parse("2006-01-02T15:04", endTime)
	if err != nil && endTime != "" {
		return fmt.Errorf("Couldn't parse endTime")
	}
	endDateTime = startDateTime.Add(2 * time.Hour) // Default to 2 hours later

	// Set defaults
	if color == "" {
		color = "#007bff"
	}
	if statusName == "" {
		statusName = "Scheduled"
	}

	// Create request for event creation
	request := models.CreateEventScheduleRequest{
		CustomEventID:    customEventID,
		Title:            title,
		EventStartDate:   startDateTime,
		EventEndDate:     endDateTime,
		RoomName:         roomName,
		MaximumAttendees: maxAttendees,
		MinimumAttendees: minAttendees,
		StatusName:       statusName,
		Color:            color,
		EmployeeNumbers:  employeeNumbers,
		PositionCodes:    positionCodes,
	}

	// Call the reusable event creation logic
	schedule, err := a.createEventSchedule(request)
	if err != nil {
		return err
	}

	log.Printf("EVENT SCHEDULE CREATED: ID=%d, Title=%s, CustomEventID=%d, Start=%s",
		schedule.CustomEventScheduleID, title, customEventID, startDateTime.Format("2006-01-02 15:04"))

	return nil
}

// createEventSchedule replicates the same logic as event.CreateEventSchedule
// This avoids circular import issues while reusing the exact same business logic
func (a *CreateEventAction) createEventSchedule(req models.CreateEventScheduleRequest) (*models.CustomEventSchedule, error) {
	// Check if the referenced CustomEventID exists before creating a schedule for it.
	var count int64
	if err := a.DB.Model(&models.CustomEventDefinition{}).Where("custom_event_id = ?", req.CustomEventID).Count(&count).Error; err != nil {
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
		CreatedByUserID:  nil, // Rules engine creates events without specific user context
	}

	if req.StatusName != "" {
		schedule.StatusName = req.StatusName
	}

	// GORM will now only insert into the `custom_event_schedules` table.
	if err := a.DB.Create(&schedule).Error; err != nil {
		return nil, fmt.Errorf("failed to create event schedule: %w", err)
	}

	// Write target links if any - following the same pattern as CreateEventSchedule
	for _, emp := range req.EmployeeNumbers {
		if emp != "" {
			if err := a.DB.Create(&models.EventScheduleEmployee{
				CustomEventScheduleID: schedule.CustomEventScheduleID,
				EmployeeNumber:        emp,
				Role:                  "Attendee",
			}).Error; err != nil {
				return nil, fmt.Errorf("failed to create employee link for %s: %w", emp, err)
			}
		}
	}

	for _, pos := range req.PositionCodes {
		if pos != "" {
			if err := a.DB.Create(&models.EventSchedulePositionTarget{
				CustomEventScheduleID: schedule.CustomEventScheduleID,
				PositionMatrixCode:    pos,
			}).Error; err != nil {
				return nil, fmt.Errorf("failed to create position target for %s: %w", pos, err)
			}
		}
	}

	return &schedule, nil
}

// ScheduleTrainingAction schedules training events
// type ScheduleTrainingAction struct {
// 	DB *gorm.DB
// }

// func (a *ScheduleTrainingAction) Execute(ctx EvalContext, params map[string]any) error {
// 	employeeNumber, _ := params["employeeNumber"].(string)
// 	eventType, _ := params["eventType"].(string)
// 	scheduledDate, _ := params["scheduledDate"].(string)

// 	if employeeNumber == "" || eventType == "" {
// 		return fmt.Errorf("schedule_training requires employeeNumber and eventType")
// 	}

// 	// Parse scheduled date
// 	var scheduledTime time.Time
// 	if scheduledDate != "" {
// 		var err error
// 		scheduledTime, err = time.Parse("2006-01-02", scheduledDate)
// 		if err != nil {
// 			scheduledTime, err = time.Parse(time.RFC3339, scheduledDate)
// 			if err != nil {
// 				scheduledTime = time.Now().AddDate(0, 0, 7) // Default to next week
// 			}
// 		}
// 	} else {
// 		scheduledTime = time.Now().AddDate(0, 0, 7) // Default to next week
// 	}

// 	// Create training event
// 	event := gen_models.Event{
// 		Title:           fmt.Sprintf("%s Training for %s", eventType, employeeNumber),
// 		EventType:       eventType,
// 		RelevantParties: employeeNumber,
// 		StartTime:       scheduledTime,
// 		EndTime:         scheduledTime.Add(2 * time.Hour), // Default 2-hour duration
// 		AllDay:          false,
// 		Color:           "#007bff", // Blue color for training events
// 	}

// 	if err := a.DB.Create(&event).Error; err != nil {
// 		return fmt.Errorf("failed to schedule training: %w", err)
// 	}

// 	log.Printf("TRAINING SCHEDULED: Employee=%s, Type=%s, Date=%s", employeeNumber, eventType, scheduledTime.Format("2006-01-02"))
// 	return nil
// }

// CompetencyAssignmentAction manages competency assignments
type CompetencyAssignmentAction struct {
	DB *gorm.DB
}

func (a *CompetencyAssignmentAction) Execute(ctx EvalContext, params map[string]any) error {
	employeeNumber, _ := params["employeeNumber"].(string)
	competencyID, _ := params["competencyID"].(int32)
	action, _ := params["action"].(string)

	if employeeNumber == "" || action == "" {
		return fmt.Errorf("competency_assignment requires employeeNumber and action")
	}

	// Convert competencyID from float64 if needed
	if competencyID == 0 {
		if f, ok := params["competencyID"].(float64); ok {
			competencyID = int32(f)
		}
	}

	switch action {
	case "assign":
		// Create or update job matrix entry
		jobMatrix := gen_models.CustomJobMatrix{
			EmployeeNumber:     employeeNumber,
			CompetencyID:       competencyID,
			RequirementStatus:  "Required",
			PositionMatrixCode: "DEFAULT", // You may need to set this based on employee position
			CreationDate:       time.Now(),
		}

		// Use ON CONFLICT DO UPDATE or similar logic
		if err := a.DB.Where("employee_number = ? AND competency_id = ?",
			employeeNumber, competencyID).
			Assign(gen_models.CustomJobMatrix{RequirementStatus: "Required"}).
			FirstOrCreate(&jobMatrix).Error; err != nil {
			return fmt.Errorf("failed to assign competency: %w", err)
		}

		log.Printf("COMPETENCY ASSIGNED: Employee=%s, CompetencyID=%d", employeeNumber, competencyID)

	case "remove":
		if err := a.DB.Where("employee_number = ? AND competency_id = ?",
			employeeNumber, competencyID).Delete(&gen_models.CustomJobMatrix{}).Error; err != nil {
			return fmt.Errorf("failed to remove competency: %w", err)
		}

		log.Printf("COMPETENCY REMOVED: Employee=%s, CompetencyID=%d", employeeNumber, competencyID)

	default:
		return fmt.Errorf("unknown competency assignment action: %s", action)
	}

	return nil
}

// JobMatrixUpdateAction updates job matrix entries
type JobMatrixUpdateAction struct {
	DB *gorm.DB
}

func (a *JobMatrixUpdateAction) Execute(ctx EvalContext, params map[string]any) error {
	employeeNumber, _ := params["employeeNumber"].(string)
	competencyID, _ := params["competencyID"].(int32)
	status, _ := params["status"].(string)

	if employeeNumber == "" || status == "" {
		return fmt.Errorf("job_matrix_update requires employeeNumber and status")
	}

	// Convert competencyID from float64 if needed
	if competencyID == 0 {
		if f, ok := params["competencyID"].(float64); ok {
			competencyID = int32(f)
		}
	}

	// Update job matrix entry
	result := a.DB.Model(&gen_models.CustomJobMatrix{}).
		Where("employee_number = ? AND competency_id = ?", employeeNumber, competencyID).
		Update("requirement_status", status)

	if result.Error != nil {
		return fmt.Errorf("failed to update job matrix: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("no job matrix entry found for employee %s and competency %d", employeeNumber, competencyID)
	}

	log.Printf("JOB MATRIX UPDATED: Employee=%s, CompetencyID=%d, Status=%s", employeeNumber, competencyID, status)
	return nil
}

// WebhookAction sends HTTP webhooks
type WebhookAction struct{}

func (a *WebhookAction) Execute(ctx EvalContext, params map[string]any) error {
	url, _ := params["url"].(string)
	method, _ := params["method"].(string)
	payload := params["payload"]

	if url == "" {
		return fmt.Errorf("webhook requires url")
	}

	if method == "" {
		method = "POST"
	}

	// Prepare payload
	var body []byte
	if payload != nil {
		var err error
		body, err = json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to marshal webhook payload: %w", err)
		}
	}

	// Send HTTP request
	req, err := http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create webhook request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "RulesV2-Engine/1.0")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("webhook request failed: %w", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			log.Printf("Failed to close response body: %v", err)
		}
	}()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook returned status %d", resp.StatusCode)
	}

	log.Printf("WEBHOOK SENT: %s %s -> %d", method, url, resp.StatusCode)
	return nil
}

// AuditLogAction creates audit log entries
type AuditLogAction struct {
	DB *gorm.DB
}

func (a *AuditLogAction) Execute(ctx EvalContext, params map[string]any) error {
	action, _ := params["action"].(string)
	details, _ := params["details"].(string)
	employeeNumber, _ := params["employeeNumber"].(string)

	if action == "" {
		return fmt.Errorf("audit_log requires action")
	}

	// Extract employee number from context if not provided
	if employeeNumber == "" {
		if employee, ok := ctx.Data["employee"].(gen_models.Employee); ok {
			employeeNumber = employee.Employeenumber
		}
	}

	// In a real implementation, you'd have an audit_logs table
	// For now, we'll just log the audit entry
	log.Printf("AUDIT: Action=%s, Employee=%s, Details=%s, Time=%s",
		action, employeeNumber, details, time.Now().Format(time.RFC3339))

	// Example of how you might store in database:
	// auditLog := gen_models.AuditLog{
	//     Action:         action,
	//     EmployeeNumber: employeeNumber,
	//     Details:        details,
	//     Timestamp:      time.Now(),
	// }
	// return a.DB.Create(&auditLog).Error

	return nil
}
