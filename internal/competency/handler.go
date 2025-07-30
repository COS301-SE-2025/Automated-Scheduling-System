package competency

import (
	"Automated-Scheduling-Project/internal/database/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

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
	// optional isActive. deaults to true if not provided
	if req.IsActive != nil {
		competency.IsActive = *req.IsActive
	} else {
		competency.IsActive = true
	}


	if err := DB.Create(&competency).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create competency: " + err.Error()})
		return
	}
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
        if err == gorm.ErrRecordNotFound {
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
        c.JSON(http.StatusNotFound, gin.H{"error": "Competency not found"})
        return
    }

    var req models.CreateCompetencyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}
    
    competency.CompetencyName = req.CompetencyName
    competency.Description = req.Description
    competency.CompetencyTypeName = req.CompetencyTypeName
    competency.ExpiryPeriodMonths = req.ExpiryPeriodMonths
    if req.IsActive != nil {
        competency.IsActive = *req.IsActive
    }

    if err := DB.Save(&competency).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update competency"})
        return
    }
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

    // A competency cannot be a prerequisite for itself.
    if competencyID == req.PrerequisiteCompetencyID {
        c.JSON(http.StatusBadRequest, gin.H{"error": "A competency cannot be a prerequisite for itself."})
        return
    }

    prereq := models.CompetencyPrerequisite{
        CompetencyID:           competencyID,
        PrerequisiteCompetencyID: req.PrerequisiteCompetencyID,
    }

    if err := DB.FirstOrCreate(&prereq).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add prerequisite. Ensure both competency IDs exist."})
        return
    }

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

    c.JSON(http.StatusOK, gin.H{"message": "Prerequisite removed successfully"})
}