package matrix

import (
	"Automated-Scheduling-Project/internal/database/models"
	"net/http"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

// handles adding a new entry to the job matrix.
func CreateJobMatrixEntryHandler(c *gin.Context) {
	var req models.CreateJobMatrixRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	// check if the referenced CompetencyID exists.
	var competency models.CompetencyDefinition
	if err := DB.First(&competency, req.CompetencyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Competency with the specified ID not found"})
		return
	}
    
	createdBy, _ := c.Get("email")

	matrixEntry := models.CustomJobMatrix{
		EmployeeNumber:     req.EmployeeNumber,
		PositionMatrixCode: req.PositionMatrixCode,
		CompetencyID:       req.CompetencyID,
		RequirementStatus:  req.RequirementStatus,
		Notes:              req.Notes,
		CreatedBy:          createdBy.(string),
	}

	if err := DB.Create(&matrixEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job matrix entry: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, matrixEntry)
}

// Returns all job matrix entries.
func GetJobMatrixEntriesHandler(c *gin.Context) {
	var entries []models.CustomJobMatrix

    query := DB

    // Filtering by query parameters
    if employeeNumber := c.Query("employeeNumber"); employeeNumber != "" {
        query = query.Where("employee_number = ?", employeeNumber)
    }
    if positionCode := c.Query("positionMatrixCode"); positionCode != "" {
        query = query.Where("position_matrix_code = ?", positionCode)
    }

	if err := query.Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch job matrix entries"})
		return
	}
	c.JSON(http.StatusOK, entries)
}

// Updates a job matrix entry.
func UpdateJobMatrixEntryHandler(c *gin.Context) {
    idStr := c.Param("matrixID") // Assuming the route is /matrix/:matrixID
    
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
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update matrix entry"})
        return
    }
    if result.RowsAffected == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Matrix entry not found"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Matrix entry updated successfully"})
}

// Deletes a job matrix entry.
func DeleteJobMatrixEntryHandler(c *gin.Context) {
    idStr := c.Param("matrixID")

    result := DB.Delete(&models.CustomJobMatrix{}, idStr)
    
    if result.Error != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete matrix entry"})
        return
    }
    if result.RowsAffected == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Matrix entry not found"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Matrix entry deleted successfully"})
}