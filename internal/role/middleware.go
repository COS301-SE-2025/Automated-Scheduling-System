package role

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequirePage ensures the authenticated user has permission to the given page.
func RequirePage(page string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// email was set by auth middleware
		emailVal, ok := c.Get("email")
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		email, _ := emailVal.(string)

		// find user by email via extended employee
		var ext models.ExtendedEmployee
		if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("Useraccountemail = ?", email).First(&ext).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		allowed, err := UserHasPagePermission(ext.User.ID, page)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
			return
		}
		if !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied. Page not permitted."})
			return
		}
		c.Next()
	}
}
