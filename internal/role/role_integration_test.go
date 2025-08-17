//go:build !unit

package role

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// --- Test setup helpers ---

func setupRoleTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)

	err = db.AutoMigrate(
		&gen_models.Employee{},
		&gen_models.User{},
		&models.Role{},
		&models.RolePermission{},
		&models.UserHasRole{},
	)
	require.NoError(t, err)

	DB = db
	return db
}

type seedBundle struct {
	AdminEmp  gen_models.Employee
	AdminUser gen_models.User
	UserEmp   gen_models.Employee
	UserUser  gen_models.User
}

func seedCoreUsers(t *testing.T, db *gorm.DB) seedBundle {
	t.Helper()
	adminEmp := gen_models.Employee{Employeenumber: "E001", Firstname: "Admin", Lastname: "User", Useraccountemail: "admin@example.com", Employeestatus: "Active"}
	userEmp := gen_models.Employee{Employeenumber: "E002", Firstname: "Regular", Lastname: "User", Useraccountemail: "user@example.com", Employeestatus: "Active"}
	require.NoError(t, db.Create(&adminEmp).Error)
	require.NoError(t, db.Create(&userEmp).Error)

	pwd, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	adminUser := gen_models.User{EmployeeNumber: adminEmp.Employeenumber, Username: "admin", Password: string(pwd), Role: "Admin"}
	userUser := gen_models.User{EmployeeNumber: userEmp.Employeenumber, Username: "user", Password: string(pwd), Role: "User"}
	require.NoError(t, db.Create(&adminUser).Error)
	require.NoError(t, db.Create(&userUser).Error)

	return seedBundle{AdminEmp: adminEmp, AdminUser: adminUser, UserEmp: userEmp, UserUser: userUser}
}

func setupRoleRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Mock auth: set email from header for handlers/middleware to consume
	mockAuth := func() gin.HandlerFunc {
		return func(c *gin.Context) {
			if email := c.GetHeader("X-Test-Email"); email != "" {
				c.Set("email", email)
			}
			c.Next()
		}
	}

	api := r.Group("/api")
	api.Use(mockAuth())
	{
		api.GET("/roles/permissions", GetMyPermissionsHandler)
	}

	rolesAPI := r.Group("/api")
	rolesAPI.Use(mockAuth(), RequirePage("roles"))
	{
		rolesAPI.GET("/roles", GetAllRolesHandler)
		rolesAPI.POST("/roles", CreateRoleHandler)
		rolesAPI.PATCH("/roles/:roleID", UpdateRoleHandler)
		rolesAPI.DELETE("/roles/:roleID", DeleteRoleHandler)
	}
	return r
}

func doReq(r http.Handler, method, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
	var buf *bytes.Buffer
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewBuffer(b)
	} else {
		buf = bytes.NewBuffer(nil)
	}
	req, _ := http.NewRequest(method, path, buf)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// --- Permissions endpoint tests ---

func TestGetMyPermissionsHandler_AdminIncludesBaseAndRoles(t *testing.T) {
	db := setupRoleTestDB(t)
	seed := seedCoreUsers(t, db)
	_ = seed

	r := setupRoleRouter()
	w := doReq(r, http.MethodGet, "/api/roles/permissions", nil, map[string]string{"X-Test-Email": "admin@example.com"})
	require.Equal(t, http.StatusOK, w.Code)

	var pages []string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &pages))

	// Base pages always present + roles for Admin
	require.Contains(t, pages, "dashboard")
	require.Contains(t, pages, "main-help")
	require.Contains(t, pages, "calendar")
	require.Contains(t, pages, "events")
	require.Contains(t, pages, "roles")
}

func TestGetMyPermissionsHandler_NonAdminWithMappedRoles(t *testing.T) {
	db := setupRoleTestDB(t)
	seeds := seedCoreUsers(t, db)

	// Create a custom role and grant permissions, then link to regular user
	manager := models.Role{RoleName: "Manager", Description: "Manages things"}
	require.NoError(t, db.Create(&manager).Error)
	perms := []models.RolePermission{
		{RoleID: manager.RoleID, Page: "users"},
		{RoleID: manager.RoleID, Page: "competencies"},
	}
	require.NoError(t, db.Create(&perms).Error)
	link := models.UserHasRole{UserID: int64(seeds.UserUser.ID), RoleID: manager.RoleID}
	require.NoError(t, db.Create(&link).Error)

	r := setupRoleRouter()
	w := doReq(r, http.MethodGet, "/api/roles/permissions", nil, map[string]string{"X-Test-Email": seeds.UserEmp.Useraccountemail})
	require.Equal(t, http.StatusOK, w.Code)

	var pages []string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &pages))
	require.Contains(t, pages, "users")
	require.Contains(t, pages, "competencies")
	// Base pages always
	require.Contains(t, pages, "dashboard")
	require.Contains(t, pages, "main-help")
	require.Contains(t, pages, "calendar")
	require.Contains(t, pages, "events")
	// Regular user should not implicitly get roles access
	require.NotContains(t, pages, "roles")
}

func TestGetMyPermissionsHandler_MissingAuthIdentity(t *testing.T) {
	_ = setupRoleTestDB(t)
	_ = seedCoreUsers(t, DB)
	r := setupRoleRouter()

	w := doReq(r, http.MethodGet, "/api/roles/permissions", nil, nil)
	require.Equal(t, http.StatusInternalServerError, w.Code)
}

// --- Role management CRUD via middleware gating (legacy Admin passes) ---

func TestRoleCRUD_Integration(t *testing.T) {
	db := setupRoleTestDB(t)
	seed := seedCoreUsers(t, db)

	// Seed system roles for list + system-protect checks
	adminRole := models.Role{RoleName: "Admin", Description: "System Admin"}
	userRole := models.Role{RoleName: "User", Description: "Regular user"}
	require.NoError(t, db.Create(&adminRole).Error)
	require.NoError(t, db.Create(&userRole).Error)

	r := setupRoleRouter()
	adminHdr := map[string]string{"X-Test-Email": seed.AdminEmp.Useraccountemail}

	// List roles (should include system roles)
	w := doReq(r, http.MethodGet, "/api/roles", nil, adminHdr)
	require.Equal(t, http.StatusOK, w.Code)
	var list []models.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &list))
	// Expect at least Admin and User present
	names := map[string]bool{}
	for _, rr := range list {
		names[rr.Name] = true
	}
	require.True(t, names["Admin"])
	require.True(t, names["User"])

	// Create role without permissions
	createReq := models.AddRoleRequest{Name: "Coordinator", Description: "Coordinates", Permissions: []string{}}
	w = doReq(r, http.MethodPost, "/api/roles", createReq, adminHdr)
	require.Equal(t, http.StatusCreated, w.Code, "body: %s", w.Body.String())
	var created models.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	require.Equal(t, "Coordinator", created.Name)
	require.Empty(t, created.Permissions)

	// Create with permissions
	createReq2 := models.AddRoleRequest{Name: "Scheduler", Description: "Schedules events", Permissions: []string{"events", "event-definitions"}}
	w = doReq(r, http.MethodPost, "/api/roles", createReq2, adminHdr)
	require.Equal(t, http.StatusCreated, w.Code, "body: %s", w.Body.String())
	var created2 models.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created2))
	require.ElementsMatch(t, []string{"events", "event-definitions"}, created2.Permissions)

	// Update role: rename + replace permissions
	newName := "Coord-2"
	newDesc := "Updated desc"
	newPerms := []string{"users"}
	upd := models.UpdateRoleRequest{Name: &newName, Description: &newDesc, Permissions: &newPerms}
	w = doReq(r, http.MethodPatch, fmt.Sprintf("/api/roles/%d", created.ID), upd, adminHdr)
	require.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())
	var updated models.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
	require.Equal(t, newName, updated.Name)
	require.ElementsMatch(t, newPerms, updated.Permissions)

	// Update with invalid ID
	w = doReq(r, http.MethodPatch, "/api/roles/not-a-number", upd, adminHdr)
	require.Equal(t, http.StatusBadRequest, w.Code)

	// Update not found
	w = doReq(r, http.MethodPatch, "/api/roles/99999", upd, adminHdr)
	require.Equal(t, http.StatusNotFound, w.Code)

	// Delete system role should be blocked
	w = doReq(r, http.MethodDelete, fmt.Sprintf("/api/roles/%d", adminRole.RoleID), nil, adminHdr)
	require.Equal(t, http.StatusBadRequest, w.Code)

	// Delete role success (also test cascading deletes of perms/links)
	// Link Scheduler to a user, add an extra perm, then delete
	require.NoError(t, db.Create(&models.RolePermission{RoleID: created2.ID, Page: "users"}).Error)
	require.NoError(t, db.Create(&models.UserHasRole{UserID: int64(seed.UserUser.ID), RoleID: created2.ID}).Error)
	w = doReq(r, http.MethodDelete, fmt.Sprintf("/api/roles/%d", created2.ID), nil, adminHdr)
	require.Equal(t, http.StatusNoContent, w.Code, "body: %s", w.Body.String())

	var rpCount int64
	require.NoError(t, db.Model(&models.RolePermission{}).Where("role_id = ?", created2.ID).Count(&rpCount).Error)
	require.Zero(t, rpCount)
	var linkCount int64
	require.NoError(t, db.Model(&models.UserHasRole{}).Where("role_id = ?", created2.ID).Count(&linkCount).Error)
	require.Zero(t, linkCount)

	// Delete not found
	w = doReq(r, http.MethodDelete, "/api/roles/99999", nil, adminHdr)
	require.Equal(t, http.StatusNotFound, w.Code)
}

func TestRequirePageMiddleware_DeniesWithoutPermission(t *testing.T) {
	db := setupRoleTestDB(t)
	seeds := seedCoreUsers(t, db)
	_ = seeds

	// Regular user has no roles granting "roles"; requests should be 403
	r := setupRoleRouter()
	w := doReq(r, http.MethodGet, "/api/roles", nil, map[string]string{"X-Test-Email": "user@example.com"})
	require.Equal(t, http.StatusForbidden, w.Code)
}
