package rulesv2

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/email"
	"Automated-Scheduling-Project/internal/sms"

	"gorm.io/gorm"
)

// NotificationAction handles sending notifications
type NotificationAction struct {
	DB *gorm.DB
}

func (a *NotificationAction) Execute(ctx EvalContext, params map[string]any) error {
	recipient, _ := params["recipient"].(string)
	subject, _ := params["subject"].(string)
	message, _ := params["message"].(string)
	notificationType, _ := params["type"].(string) // "email", "sms", "push", or "system"

	if recipient == "" || subject == "" || message == "" {
		return fmt.Errorf("notification requires recipient, subject, and message")
	}

	if notificationType == "" {
		notificationType = "system" // Default to system notification
	}

	switch notificationType {
	case "email":
		// Call the sendEmail method
		return a.sendEmail(recipient, subject, message)
	case "sms":
		a.sendSMS(recipient, message)
		return nil
	case "push":
		// Implement push notification logic here
		log.Printf("PUSH NOTIFICATION SENT: To=%s, Subject=%s, Message=%s", recipient, subject, message)
		return nil
	case "system":
		// Implement system notification logic here
		a.sendSystem(recipient, subject, message, params)
		return nil
	default:
		return fmt.Errorf("unknown notification type: %s", notificationType)
	}
}

// System notification function (default behaviour if no notification service is passed in)
func (a *NotificationAction) sendSystem(recipient, subject, message string, params map[string]any) error {
	// TODO add notifications to the database models.
	notificationData := map[string]any{
		"type":      "system_notification",
		"recipient": recipient,
		"subject":   subject,
		"message":   message,
		"timestamp": time.Now().Format(time.RFC3339),
		"priority":  params["priority"],
	}

	logData, _ := json.Marshal(notificationData)
	log.Printf("SYSTEM NOTIFICATION: %s", string(logData))
	log.Printf("SYSTEM NOTIFICATION: [%s] %s - %s", recipient, subject, message)
	return nil
}

// Email function linked to the internal/email
func (a *NotificationAction) sendEmail(recipient, subject, message string) error {
	err := email.SendEmail(recipient, subject, message)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	log.Printf("EMAIL SENT: To=%s, Subject=%s", recipient, subject)
	return nil
}

// SMS sender for notification if notification type is SMS
// Takes in the recipient and the message string
func (a *NotificationAction) sendSMS(recipient, message string) error {
	// Implement SMS sending logic here
	sms.SendSMS(recipient, message)
	log.Printf("SMS SENT: To=%s, Message=%s", recipient, message)
	return nil
}

type CreateEventAction struct {
	DB *gorm.DB
}

func (a *CreateEventAction) Execute(ctx EvalContext, params map[string]any) error {
	title, _ := params["title"].(string)
	eventType, _ := params["eventType"].(string)
	startTime, _ := params["startTime"].(string)
	endTime, _ := params["endTime"].(string)
	relevantParties, _ := params["relevantParties"].(string)
	color, _ := params["color"].(string)
	allDay, _ := params["allDay"].(bool)

	if title == "" || eventType == "" || startTime == "" || relevantParties == "" {
		return fmt.Errorf("create_event requires title, eventType, startTime, and relevantParties")
	}
	if color == "" {
		color = "#007bff" // Default color if not provided
	}

	// Parse start time
	var startDateTime time.Time
	if startTime != "" {
		var err error
		startDateTime, err = time.Parse("2006-01-02 15:04", startTime)
		if err != nil {
			return fmt.Errorf("invalid startTime format: %w", err)
		}
	} else {
		startDateTime = time.Now() // Default to now if not provided
	}

	// Parse end time
	var endDateTime time.Time
	if endTime != "" {
		var err error
		endDateTime, err = time.Parse("2006-01-02 15:04", endTime)
		if err != nil {
			return fmt.Errorf("invalid endTime format: %w", err)
		}
	} else {
		endDateTime = startDateTime.Add(2 * time.Hour) // Default to 2 hours later
	}

	if eventType == "" {
		eventType = "general"
	}

	if color == "" {
		color = "#007bff"
	}

	if relevantParties == "" {
		if employee, ok := ctx.Data["employee"].(gen_models.Employee); ok {
			relevantParties = employee.Employeenumber
		} else {
			return fmt.Errorf("relevantParties is required")
		}
	}

	event := gen_models.Event{
		Title:           title,
		EventType:       eventType,
		RelevantParties: relevantParties,
		StartTime:       startDateTime,
		EndTime:         endDateTime,
		AllDay:          allDay,
		Color:           color,
	}

	if err := a.DB.Create(&event).Error; err != nil {
		return fmt.Errorf("failed to create event: %w", err)
	}
	log.Printf("EVENT CREATED: ID=%d, Title=%s, Type=%s, Start=%s, Parties=%s",
		event.ID, title, eventType, startDateTime.Format("2006-01-02 15:04"), relevantParties)

	return nil
}

// ScheduleTrainingAction schedules training events
type ScheduleTrainingAction struct {
	DB *gorm.DB
}

func (a *ScheduleTrainingAction) Execute(ctx EvalContext, params map[string]any) error {
	employeeNumber, _ := params["employeeNumber"].(string)
	eventType, _ := params["eventType"].(string)
	scheduledDate, _ := params["scheduledDate"].(string)

	if employeeNumber == "" || eventType == "" {
		return fmt.Errorf("schedule_training requires employeeNumber and eventType")
	}

	// Parse scheduled date
	var scheduledTime time.Time
	if scheduledDate != "" {
		var err error
		scheduledTime, err = time.Parse("2006-01-02", scheduledDate)
		if err != nil {
			scheduledTime, err = time.Parse(time.RFC3339, scheduledDate)
			if err != nil {
				scheduledTime = time.Now().AddDate(0, 0, 7) // Default to next week
			}
		}
	} else {
		scheduledTime = time.Now().AddDate(0, 0, 7) // Default to next week
	}

	// Create training event
	event := gen_models.Event{
		Title:           fmt.Sprintf("%s Training for %s", eventType, employeeNumber),
		EventType:       eventType,
		RelevantParties: employeeNumber,
		StartTime:       scheduledTime,
		EndTime:         scheduledTime.Add(2 * time.Hour), // Default 2-hour duration
		AllDay:          false,
		Color:           "#007bff", // Blue color for training events
	}

	if err := a.DB.Create(&event).Error; err != nil {
		return fmt.Errorf("failed to schedule training: %w", err)
	}

	log.Printf("TRAINING SCHEDULED: Employee=%s, Type=%s, Date=%s", employeeNumber, eventType, scheduledTime.Format("2006-01-02"))
	return nil
}

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
