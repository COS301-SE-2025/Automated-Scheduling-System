// internal/competency_type/handler.go
package competency_type

import (
	"Automated-Scheduling-Project/internal/database/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

// struct for creating/updating a type
type TypeRequest struct {
	TypeName    string `json:"typeName" binding:"required"`
	Description string `json:"description"`
}

type UpdateStatusRequest struct {
	IsActive *bool `json:"isActive" binding:"required"`
}

// returns a list of all competency types.
func GetAllCompetencyTypesHandler(c *gin.Context) {
	var competencyTypes []models.CompetencyType
	if err := DB.Order("type_name").Find(&competencyTypes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch competency types"})
		return
	}
	c.JSON(http.StatusOK, competencyTypes)
}

// adds a new competency type.
func CreateCompetencyTypeHandler(c *gin.Context) {
	var req TypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	newType := models.CompetencyType{
		TypeName:    req.TypeName,
		Description: req.Description,
		IsActive:    true,
	}

	if err := DB.Create(&newType).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create competency type. It may already exist."})
		return
	}
	c.JSON(http.StatusCreated, newType)
}

// updates an existing competency type's description.
// NB: cannot change type name.
func UpdateCompetencyTypeHandler(c *gin.Context) {
	typeName := c.Param("typeName")
	var req TypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	result := DB.Model(&models.CompetencyType{}).Where("type_name = ?", typeName).Update("description", req.Description)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update competency type"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Competency type not found"})
		return
	}

	var updatedType models.CompetencyType
	DB.First(&updatedType, "type_name = ?", typeName)
	c.JSON(http.StatusOK, updatedType)
}

// updates the active status of a competency type.
func UpdateTypeStatusHandler(c *gin.Context) {
	typeName := c.Param("typeName")
	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	result := DB.Model(&models.CompetencyType{}).Where("type_name = ?", typeName).Update("is_active", *req.IsActive)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update competency type status"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Competency type not found"})
		return
	}

	var updatedType models.CompetencyType
	DB.First(&updatedType, "type_name = ?", typeName)
	c.JSON(http.StatusOK, updatedType)
}