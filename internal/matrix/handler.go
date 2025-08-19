package matrix

import (
	"Automated-Scheduling-Project/internal/database/models"
	"Automated-Scheduling-Project/internal/rulesV2" // added
	"context"                                       // added
	"errors"
	"net/http"
	"time" // added

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

// added: rules service wiring
var RulesSvc *rulesv2.RuleBackEndService
func SetRulesService(s *rulesv2.RuleBackEndService) { RulesSvc = s }

func fireLinkJobToCompetency(c *gin.Context, operation string, link map[string]any, pos any, comp any) {
    if RulesSvc == nil { return }
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    _ = RulesSvc.OnLinkJobToCompetency(ctx, operation, link, pos, comp)
}

func fireCompetencyUpdateTrigger(c *gin.Context, comp any) {
    if RulesSvc == nil { return }
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

    matrixEntry := models.CustomJobMatrix{
        PositionMatrixCode: req.PositionMatrixCode,
        CompetencyID:       req.CompetencyID,
        RequirementStatus:  req.RequirementStatus,
        Notes:              req.Notes,
        CreatedBy:          createdBy.(string),
    }

    if err := DB.Create(&matrixEntry).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job requirement entry: " + err.Error()})
        return
    }

    // prepare domain objects
    var jp models.JobPosition
    _ = DB.First(&jp, "position_matrix_code = ?", req.PositionMatrixCode).Error
    var cd models.CompetencyDefinition
    _ = DB.First(&cd, "competency_id = ?", req.CompetencyID).Error
    link := map[string]any{"State": "active"}
    // fire trigger: link_job_to_competency add
    fireLinkJobToCompetency(c, "add", link, jp, cd)

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
    // fire trigger: link_job_to_competency deactivate
    fireLinkJobToCompetency(c, "deactivate", map[string]any{"State": "inactive"}, jp, cd)

    result := DB.Delete(&models.CustomJobMatrix{}, idStr)
    if result.Error != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete job requirement"})
        return
    }
    if result.RowsAffected == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Job requirement entry not found"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Job requirement entry deleted successfully"})
}