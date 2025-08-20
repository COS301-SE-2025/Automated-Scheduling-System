package competency

import (
	"Automated-Scheduling-Project/internal/database/models"
	rulesv2 "Automated-Scheduling-Project/internal/rulesV2" // add
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

// RulesSvc is set at startup so handlers can dispatch triggers.
var RulesSvc *rulesv2.RuleBackEndService

// SetRulesService allows main/bootstrap to inject the rules service.
func SetRulesService(s *rulesv2.RuleBackEndService) { RulesSvc = s }

// fireCompetencyTrigger is a non-blocking helper to dispatch the trigger
func fireCompetencyTrigger(c *gin.Context, operation string, comp models.CompetencyDefinition) {
	if RulesSvc == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := RulesSvc.OnCompetency(ctx, operation, comp); err != nil {
		log.Printf("Failed to fire competency trigger (operation=%s, competency:%v): %v",
			operation, comp, err)
	}
}
func fireCompetencyPrereq(c *gin.Context, operation string, parentID, requiredID int) {
	if RulesSvc == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// Match metadata field names for facts: ParentCompetencyID, RequiredCompetencyID
	prereq := map[string]any{
		"ParentCompetencyID":   parentID,
		"RequiredCompetencyID": requiredID,
	}
	// Also include parent competency under "competency" so competency.* facts can be used with this trigger
	var parent models.CompetencyDefinition
	_ = DB.First(&parent, parentID).Error
	if err := RulesSvc.OnCompetencyPrerequisite(ctx, operation, prereq, parent); err != nil {
		log.Printf("Failed to fire competency prerequisite trigger (operation=%s, prerequisite:%v, competency:%v): %v",
			operation, prereq, parent, err)
	}
}

// Handles creating a new competency.
func CreateCompetencyDefinitionHandler(c *gin.Context) {
	var req models.CreateCompetencyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	competency := models.CompetencyDefinition{
		CompetencyName:     req.CompetencyName,
		Description:        req.Description,
		CompetencyTypeName: req.CompetencyTypeName,
		Source:             req.Source,
		ExpiryPeriodMonths: req.ExpiryPeriodMonths,
	}
	if req.IsActive != nil {
		competency.IsActive = *req.IsActive
	} else {
		competency.IsActive = true
	}

	if err := DB.Create(&competency).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create competency: The competency may already exisit"})
		return
	}

	// Trigger: competency create
	fireCompetencyTrigger(c, "create", competency)

	c.JSON(http.StatusCreated, competency)
}

// Returns all competencies.
func GetCompetencyDefinitionsHandler(c *gin.Context) {
	var competencies []models.CompetencyDefinition
	if err := DB.Preload("Prerequisites").Find(&competencies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch competencies"})
		return
	}
	c.JSON(http.StatusOK, competencies)
}

// Gets a single competency by its ID.
func GetCompetencyDefinitionByIDHandler(c *gin.Context) {
	idStr := c.Param("competencyID")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid competency ID"})
		return
	}

	var competency models.CompetencyDefinition
	if err := DB.Preload("Prerequisites").First(&competency, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Competency not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch competency"})
		}
		return
	}

	c.JSON(http.StatusOK, competency)
}

// Updates a competency.
func UpdateCompetencyDefinitionHandler(c *gin.Context) {
	idStr := c.Param("competencyID")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid competency ID"})
		return
	}

	var competency models.CompetencyDefinition
	if err := DB.First(&competency, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Competency not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not retrieve competency for update"})
		}
		return
	}

	var req models.UpdateCompetencyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	competency.CompetencyName = req.CompetencyName
	competency.Description = req.Description
	competency.CompetencyTypeName = req.CompetencyTypeName
	if req.ExpiryPeriodMonths != nil {
		competency.ExpiryPeriodMonths = req.ExpiryPeriodMonths
	}
	if req.IsActive != nil {
		competency.IsActive = *req.IsActive
	}

	if err := DB.Save(&competency).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update competency: The competency may already exisit"})
		return
	}

	// Trigger: competency update
	fireCompetencyTrigger(c, "update", competency)

	c.JSON(http.StatusOK, competency)
}

// Sets the competency to inactive
func DeleteCompetencyDefinitionHandler(c *gin.Context) {
	idStr := c.Param("competencyID")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid competency ID"})
		return
	}

	result := DB.Model(&models.CompetencyDefinition{}).Where("competency_id = ?", id).Update("is_active", false)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deactivate competency"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Competency not found"})
		return
	}

	// Trigger: competency deactivate
	var comp models.CompetencyDefinition
	_ = DB.First(&comp, "competency_id = ?", id).Error
	fireCompetencyTrigger(c, "deactivate", comp)

	c.JSON(http.StatusOK, gin.H{"message": "Competency deactivated successfully"})
}

// Adds a prerequisite to a competency.
func AddPrerequisiteHandler(c *gin.Context) {
	competencyIDStr := c.Param("competencyID")
	competencyID, _ := strconv.Atoi(competencyIDStr)

	var req models.AddPrerequisiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	if competencyID == req.PrerequisiteCompetencyID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A competency cannot be a prerequisite for itself."})
		return
	}

	prereq := models.CompetencyPrerequisite{
		CompetencyID:             competencyID,
		PrerequisiteCompetencyID: req.PrerequisiteCompetencyID,
	}

	if err := DB.FirstOrCreate(&prereq).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add prerequisite. Ensure both competency IDs exist."})
		return
	}

	// Trigger: competency_prerequisite add
	fireCompetencyPrereq(c, "add", competencyID, req.PrerequisiteCompetencyID)

	c.JSON(http.StatusCreated, prereq)
}

// Removes a prerequisite from a competency.
func RemovePrerequisiteHandler(c *gin.Context) {
	competencyIDStr := c.Param("competencyID")
	prerequisiteIDStr := c.Param("prerequisiteID")

	result := DB.Where("competency_id = ? AND prerequisite_competency_id = ?", competencyIDStr, prerequisiteIDStr).Delete(&models.CompetencyPrerequisite{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove prerequisite"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Prerequisite relationship not found"})
		return
	}

	// Trigger: competency_prerequisite remove
	// competencyIDStr/prereqID are strings; convert to ints for payload
	cid, _ := strconv.Atoi(competencyIDStr)
	rid, _ := strconv.Atoi(prerequisiteIDStr)
	fireCompetencyPrereq(c, "remove", cid, rid)

	c.JSON(http.StatusOK, gin.H{"message": "Prerequisite removed successfully"})
}
