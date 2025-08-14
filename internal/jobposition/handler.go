package jobposition

import (
	"Automated-Scheduling-Project/internal/database/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

type CreateJobPositionRequest struct {
	PositionMatrixCode string `json:"positionMatrixCode" binding:"required"`
	JobTitle           string `json:"jobTitle" binding:"required"`
	Description        string `json:"description"`
}

type UpdateJobPositionRequest struct {
	JobTitle    string `json:"jobTitle" binding:"required"`
	Description string `json:"description"`
}

type UpdateStatusRequest struct {
	IsActive *bool `json:"isActive" binding:"required"`
}

// returns all job positions.
func GetAllJobPositionsHandler(c *gin.Context) {
	var positions []models.JobPosition
	if err := DB.Order("job_title").Find(&positions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch job positions"})
		return
	}
	c.JSON(http.StatusOK, positions)
}

// creates a new job position.
func CreateJobPositionHandler(c *gin.Context) {
	var req CreateJobPositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}
	newPosition := models.JobPosition{
		PositionMatrixCode: req.PositionMatrixCode,
		JobTitle:           req.JobTitle,
		Description:        req.Description,
		IsActive:           true,
	}
	if err := DB.Create(&newPosition).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job position. The code may already exist."})
		return
	}
	c.JSON(http.StatusCreated, newPosition)
}

// updates a job position's details.
func UpdateJobPositionHandler(c *gin.Context) {
	code := c.Param("positionCode")
	var req UpdateJobPositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}
	result := DB.Model(&models.JobPosition{}).Where("position_matrix_code = ?", code).Updates(models.JobPosition{
		JobTitle:    req.JobTitle,
		Description: req.Description,
	})
	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job position not found or failed to update"})
		return
	}
	var updatedPos models.JobPosition
	DB.First(&updatedPos, "position_matrix_code = ?", code)
	c.JSON(http.StatusOK, updatedPos)
}

// updates the active status of a job position.
func UpdateJobPositionStatusHandler(c *gin.Context) {
	code := c.Param("positionCode")
	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	result := DB.Model(&models.JobPosition{}).Where("position_matrix_code = ?", code).Update("is_active", *req.IsActive)
	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job position not found or failed to update status"})
		return
	}

	var updatedPos models.JobPosition
	DB.First(&updatedPos, "position_matrix_code = ?", code)
	c.JSON(http.StatusOK, updatedPos)
}