package role

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"Automated-Scheduling-Project/internal/rulesV2" // added
	"context"                                       // added
	"net/http"
	"strconv"
	"time" // added

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

// added: rules service wiring
var RulesSvc *rulesv2.RuleBackEndService
func SetRulesService(s *rulesv2.RuleBackEndService) { RulesSvc = s }

func fireRolesTrigger(c *gin.Context, operation, updateKind string) {
    if RulesSvc == nil { return }
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    _ = RulesSvc.OnRoles(ctx, operation, updateKind)
}

// Helpers
func toResponse(r models.Role, perms []models.RolePermission) models.RoleResponse {
	out := models.RoleResponse{ID: r.RoleID, Name: r.RoleName, Description: r.Description, Permissions: []string{}, IsSystem: r.RoleName == "Admin" || r.RoleName == "User"}
	for _, p := range perms {
		out.Permissions = append(out.Permissions, p.Page)
	}
	return out
}

// GET /api/roles
func GetAllRolesHandler(c *gin.Context) {
	var roles []models.Role
	if err := DB.Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch roles"})
		return
	}
	// load permissions
	var allPerms []models.RolePermission
	if err := DB.Find(&allPerms).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch role permissions"})
		return
	}
	// group perms by role
	permsByRole := map[int][]models.RolePermission{}
	for _, rp := range allPerms {
		permsByRole[rp.RoleID] = append(permsByRole[rp.RoleID], rp)
	}
	// map
	var resp []models.RoleResponse
	for _, r := range roles {
		resp = append(resp, toResponse(r, permsByRole[r.RoleID]))
	}
	c.JSON(http.StatusOK, resp)
}

// POST /api/roles
func CreateRoleHandler(c *gin.Context) {
	var req models.AddRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	role := models.Role{RoleName: req.Name, Description: req.Description}
	if err := DB.Create(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
		return
	}

	// permissions
	for _, p := range req.Permissions {
		_ = DB.Create(&models.RolePermission{RoleID: role.RoleID, Page: p}).Error
	}

	// fire trigger: roles create
	fireRolesTrigger(c, "create", "general")

	var perms []models.RolePermission
	_ = DB.Where("role_id = ?", role.RoleID).Find(&perms).Error
	c.JSON(http.StatusCreated, toResponse(role, perms))
}

// PATCH /api/roles/:roleID
func UpdateRoleHandler(c *gin.Context) {
	idStr := c.Param("roleID")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	var role models.Role
	if err := DB.First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	var req models.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// track permission changes (before overwrite)
	var oldPerms []models.RolePermission
	_ = DB.Where("role_id = ?", role.RoleID).Find(&oldPerms).Error
	oldSet := map[string]struct{}{}
	for _, p := range oldPerms {
		oldSet[p.Page] = struct{}{}
	}

	if req.Name != nil {
		role.RoleName = *req.Name
	}
	if req.Description != nil {
		role.Description = *req.Description
	}

	if err := DB.Save(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	var added, removed bool
	if req.Permissions != nil {
		// replace perms
		if err := DB.Where("role_id = ?", role.RoleID).Delete(&models.RolePermission{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update permissions"})
			return
		}
		newSet := map[string]struct{}{}
		for _, p := range *req.Permissions {
			newSet[p] = struct{}{}
			_ = DB.Create(&models.RolePermission{RoleID: role.RoleID, Page: p}).Error
			if _, ok := oldSet[p]; !ok {
				added = true
			}
		}
		for p := range oldSet {
			if _, ok := newSet[p]; !ok {
				removed = true
			}
		}
	}

	// fire trigger: roles update
	// emit specific kinds if we detected permission changes; otherwise general
	switch {
    case added && removed:
        fireRolesTrigger(c, "update", "permission_added")
        fireRolesTrigger(c, "update", "permission_removed")
    case added:
        fireRolesTrigger(c, "update", "permission_added")
    case removed:
        fireRolesTrigger(c, "update", "permission_removed")
    default:
        fireRolesTrigger(c, "update", "general")
	}

	var perms []models.RolePermission
	_ = DB.Where("role_id = ?", role.RoleID).Find(&perms).Error
	c.JSON(http.StatusOK, toResponse(role, perms))
}

// DELETE /api/roles/:roleID
func DeleteRoleHandler(c *gin.Context) {
	idStr := c.Param("roleID")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	var role models.Role
	if err := DB.First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	if role.RoleName == "Admin" || role.RoleName == "User" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "System roles cannot be deleted"})
		return
	}

	if err := DB.Where("role_id = ?", role.RoleID).Delete(&models.RolePermission{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove permissions"})
		return
	}
	if err := DB.Where("role_id = ?", role.RoleID).Delete(&models.UserHasRole{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlink users"})
		return
	}
	if err := DB.Delete(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
		return
	}

	c.Status(http.StatusNoContent)
}

// Utility: ensure a user has permission to a page.
func UserHasPagePermission(userID int64, page string) (bool, error) {
	// Check explicit legacy role on users table (Admin shortcut)
	var u gen_models.User
	if err := DB.First(&u, userID).Error; err == nil && u.Role == "Admin" {
		return true, nil
	}

	// Load role ids for user
	var links []models.UserHasRole
	if err := DB.Where("user_id = ?", userID).Find(&links).Error; err != nil {
		return false, err
	}
	if len(links) == 0 {
		return false, nil
	}
	var roleIDs []int
	for _, l := range links {
		roleIDs = append(roleIDs, l.RoleID)
	}

	// Check if any role grants the page
	var count int64
	if err := DB.Model(&models.RolePermission{}).Where("role_id IN ? AND page = ?", roleIDs, page).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// GET /api/roles/permissions
// Returns the list of pages the authenticated user can access.
func GetMyPermissionsHandler(c *gin.Context) {
	emailVal, ok := c.Get("email")
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Missing auth identity"})
		return
	}
	email, _ := emailVal.(string)

	// Resolve user by email
	var emp gen_models.Employee
	if err := DB.Where("useraccountemail = ?", email).First(&emp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve user"})
		return
	}
	var user gen_models.User
	if err := DB.Where("employee_number = ?", emp.Employeenumber).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve user account"})
		return
	}

	// If legacy Admin, return all pages from role_permissions for the Admin role
	// Otherwise aggregate distinct pages from the user's roles.
	type row struct{ Page string }
	var pages []row

	if user.Role == "Admin" {
		// Use role_permissions of Admin role (seeded)
		err := DB.Raw(`
			SELECT DISTINCT rp.page
			FROM roles r
			JOIN role_permissions rp ON rp.role_id = r.role_id
			WHERE r.role_name = ?
		`, "Admin").Scan(&pages).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load permissions"})
			return
		}
	} else {
		// Join user_has_role -> role_permissions
		err := DB.Raw(`
			SELECT DISTINCT rp.page
			FROM user_has_role uhr
			JOIN role_permissions rp ON rp.role_id = uhr.role_id
			WHERE uhr.user_id = ?
		`, user.ID).Scan(&pages).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load permissions"})
			return
		}
	}

	var result []string
	exists := func(list []string, v string) bool {
		for _, s := range list {
			if s == v {
				return true
			}
		}
		return false
	}
	for _, p := range pages {
		if !exists(result, p.Page) {
			result = append(result, p.Page)
		}
	}
	// Always include dashboard and help for all users
	if !exists(result, "dashboard") {
		result = append(result, "dashboard")
	}
	if !exists(result, "main-help") {
		result = append(result, "main-help")
	}
	// Also include calendar and events for view-only access
	if !exists(result, "calendar") {
		result = append(result, "calendar")
	}
	if !exists(result, "events") {
		result = append(result, "events")
	}
	// Ensure Admin can access roles management regardless of role definition changes
	if user.Role == "Admin" && !exists(result, "roles") {
		result = append(result, "roles")
	}
	c.JSON(http.StatusOK, result)
}

// UserHasRoleName checks if the user has a role by name via user_has_role mapping or legacy users.role
func UserHasRoleName(userID int64, roleName string) (bool, error) {
	// Check mapping
	type cnt struct{ C int64 }
	var c cnt
	err := DB.Raw(`
		SELECT COUNT(*) AS c
		FROM user_has_role uhr
		JOIN roles r ON r.role_id = uhr.role_id
		WHERE uhr.user_id = ? AND r.role_name = ?
	`, userID, roleName).Scan(&c).Error
	if err != nil {
		return false, err
	}
	if c.C > 0 { return true, nil }
	// Fallback to legacy users table
	var u gen_models.User
	if err := DB.First(&u, userID).Error; err == nil && u.Role == roleName {
		return true, nil
	}
	return false, nil
}
