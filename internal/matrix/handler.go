package matrix

import (
	"Automated-Scheduling-Project/internal/database/models"
	rulesv2 "Automated-Scheduling-Project/internal/rulesV2"
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

// added: rules service wiring
var RulesSvc *rulesv2.RuleBackEndService

func SetRulesService(s *rulesv2.RuleBackEndService) { RulesSvc = s }

func fireLinkJobToCompetency(c *gin.Context, operation string, link map[string]any, pos any, comp any) {
	if RulesSvc == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := RulesSvc.OnLinkJobToCompetency(ctx, operation, link, pos, comp); err != nil {
		log.Printf("Failed to fire link job to competency trigger (operation=%s, link:%v, jobPosition:%v, competency:%v): %v",
			operation, link, pos, comp, err)
	}
}

func fireCompetencyUpdateTrigger(c *gin.Context, comp any) {
	if RulesSvc == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = RulesSvc.OnCompetency(ctx, "update", comp)
}

// handles adding a new competency requirement to a job position.
func CreateJobMatrixEntryHandler(c *gin.Context) {
	var req models.CreateJobMatrixRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	var jobPositionCount int64
	DB.Model(&models.JobPosition{}).Where("position_matrix_code = ?", req.PositionMatrixCode).Count(&jobPositionCount)
	if jobPositionCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job position with the specified code not found"})
		return
	}
	var competencyCount int64
	DB.Model(&models.CompetencyDefinition{}).Where("competency_id = ?", req.CompetencyID).Count(&competencyCount)
	if competencyCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Competency with the specified ID not found"})
		return
	}

	createdBy, _ := c.Get("email")

	var matrixEntry models.CustomJobMatrix
	if err := DB.Transaction(func(tx *gorm.DB) error {
		matrixEntry = models.CustomJobMatrix{
			PositionMatrixCode: req.PositionMatrixCode,
			CompetencyID:       req.CompetencyID,
			RequirementStatus:  req.RequirementStatus,
			Notes:              req.Notes,
			CreatedBy:          createdBy.(string),
		}
		if err := tx.Create(&matrixEntry).Error; err != nil {
			return err
		}

		var compDef models.CompetencyDefinition
		if err := tx.First(&compDef, "competency_id = ?", req.CompetencyID).Error; err != nil {
			return err
		}

		note := fmt.Sprintf("Auto-assigned because position %s linked to competency %d", req.PositionMatrixCode, req.CompetencyID)

		if err := tx.Exec(`
			INSERT INTO employee_competencies
			 (employee_number, competency_id, achievement_date, expiry_date, granted_by_schedule_id, notes)
			SELECT
			 eh.employee_number,
			 ?,
			 ?,          -- achievement_date (NULL)
			 ?,          -- expiry_date (NULL)
			 NULL,       -- granted_by_schedule_id
			 ?           -- notes
			FROM employment_history eh
			WHERE eh.position_matrix_code = ?
			  AND eh.start_date <= CURRENT_DATE
			  AND (eh.end_date IS NULL OR eh.end_date >= CURRENT_DATE)
			  AND NOT EXISTS (
					SELECT 1 FROM employee_competencies ec
					WHERE ec.employee_number = eh.employee_number
					  AND ec.competency_id = ?
			  )
		`, req.CompetencyID, nil, nil, note, req.PositionMatrixCode, req.CompetencyID).Error; err != nil {
			return err
		}

		var jp models.JobPosition
		_ = tx.First(&jp, "position_matrix_code = ?", req.PositionMatrixCode).Error
		var cd models.CompetencyDefinition
		_ = tx.First(&cd, "competency_id = ?", req.CompetencyID).Error
		link := map[string]any{"State": "active"}
		fireLinkJobToCompetency(c, "add", link, jp, cd)

		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job requirement entry: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, matrixEntry)
}

// returns all job requirements, with optional filtering.
func GetJobMatrixEntriesHandler(c *gin.Context) {
	var entries []models.CustomJobMatrix
	query := DB.Preload("JobPosition").Preload("CompetencyDefinition")

	if positionCode := c.Query("positionMatrixCode"); positionCode != "" {
		query = query.Where("position_matrix_code = ?", positionCode)
	}

	if competencyID := c.Query("competencyId"); competencyID != "" {
		query = query.Where("competency_id = ?", competencyID)
	}

	if err := query.Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch job requirements"})
		return
	}
	c.JSON(http.StatusOK, entries)
}

// updates a job requirement entry.
func UpdateJobMatrixEntryHandler(c *gin.Context) {
	idStr := c.Param("matrixID")
	var req models.UpdateJobMatrixRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	result := DB.Model(&models.CustomJobMatrix{}).Where("custom_matrix_id = ?", idStr).Updates(models.CustomJobMatrix{
		RequirementStatus: req.RequirementStatus,
		Notes:             req.Notes,
	})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update job requirement"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job requirement entry not found"})
		return
	}

	// Fetch and return the updated entry
	var updatedEntry models.CustomJobMatrix
	if err := DB.Preload("JobPosition").Preload("CompetencyDefinition").First(&updatedEntry, idStr).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Could not retrieve updated entry"})
		return
	}

	// fire trigger: competency update (on job requirement change)
	fireCompetencyUpdateTrigger(c, updatedEntry.CompetencyDefinition)

	c.JSON(http.StatusOK, updatedEntry)
}

// deletes a job requirement entry.
func DeleteJobMatrixEntryHandler(c *gin.Context) {
	idStr := c.Param("matrixID")

	// Load row first to emit proper trigger context
	var entry models.CustomJobMatrix
	if err := DB.First(&entry, idStr).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Job requirement entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete job requirement"})
		return
	}

	var jp models.JobPosition
	_ = DB.First(&jp, "position_matrix_code = ?", entry.PositionMatrixCode).Error
	var cd models.CompetencyDefinition
	_ = DB.First(&cd, "competency_id = ?", entry.CompetencyID).Error
	// fire trigger: link_job_to_competency remove
	fireLinkJobToCompetency(c, "remove", map[string]any{"State": "inactive"}, jp, cd)

	// Also remove auto-assigned competencies for employees currently in this position
	note := fmt.Sprintf("Auto-assigned because position %s linked to competency %d", entry.PositionMatrixCode, entry.CompetencyID)

	if err := DB.Transaction(func(tx *gorm.DB) error {
		// Step 1: Find employee_numbers to delete
		var employeeNumbers []string
		if err := tx.Raw(`
			SELECT ec.employee_number
			FROM employee_competencies ec
			JOIN employment_history eh ON ec.employee_number = eh.employee_number
			WHERE eh.position_matrix_code = ?
			  AND eh.start_date <= CURRENT_DATE
			  AND (eh.end_date IS NULL OR eh.end_date >= CURRENT_DATE)
			  AND ec.competency_id = ?
			  AND ec.achievement_date IS NULL
			  AND ec.granted_by_schedule_id IS NULL
			  AND ec.notes = ?
		`, entry.PositionMatrixCode, entry.CompetencyID, note).Scan(&employeeNumbers).Error; err != nil {
			return err
		}

		// Step 2: Delete those employee_competencies
		if len(employeeNumbers) > 0 {
			if err := tx.Where("employee_number IN ? AND competency_id = ? AND achievement_date IS NULL AND granted_by_schedule_id IS NULL AND notes = ?", employeeNumbers, entry.CompetencyID, note).Delete(&models.EmployeeCompetency{}).Error; err != nil {
				return err
			}
		}

		// Finally delete the matrix link
		if err := tx.Delete(&models.CustomJobMatrix{}, idStr).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		log.Printf("Detailed error: %+v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove job requirement: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Job requirement entry deleted successfully"})
}
