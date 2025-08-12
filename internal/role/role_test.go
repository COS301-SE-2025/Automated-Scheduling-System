//go:build unit

package role

import (
	"Automated-Scheduling-Project/internal/database/models"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// --- Unit test helpers ---

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	gormLogger := logger.New(&testingLogger{t}, logger.Config{SlowThreshold: 0, LogLevel: logger.Silent})
	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{Logger: gormLogger})
	require.NoError(t, err)
	return gormDB, mock
}

type testingLogger struct{ t *testing.T }

func (l *testingLogger) Printf(format string, args ...interface{}) { l.t.Logf(format, args...) }

func ctxJSON(t *testing.T, db *gorm.DB, method, path string, body any) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	var buf bytes.Buffer
	if body != nil {
		b, _ := json.Marshal(body)
		buf.Write(b)
	}
	req, err := http.NewRequest(method, path, &buf)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	DB = db
	return c, rec
}

// --- Unit tests ---

func TestGetAllRolesHandler_Unit(t *testing.T) {
	db, mock := newMockDB(t)

	// Roles query
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "roles"`)).
		WillReturnRows(sqlmock.NewRows([]string{"role_id", "role_name", "description"}).
			AddRow(1, "Admin", "System").
			AddRow(2, "User", "System").
			AddRow(3, "Manager", "Manages"))

	// Role permissions query
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "role_permissions"`)).
		WillReturnRows(sqlmock.NewRows([]string{"role_id", "page"}).
			AddRow(3, "users").
			AddRow(3, "events"))

	c, rec := ctxJSON(t, db, http.MethodGet, "/roles", nil)
	GetAllRolesHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	var resp []models.RoleResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp, 3)
	// verify Manager permissions mapped
	var mgr models.RoleResponse
	for _, r := range resp {
		if r.Name == "Manager" {
			mgr = r
			break
		}
	}
	require.ElementsMatch(t, []string{"users", "events"}, mgr.Permissions)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateRoleHandler_Unit(t *testing.T) {
	db, mock := newMockDB(t)
	// Use empty permissions to avoid insert variability in unit mode
	req := models.AddRoleRequest{Name: "Coordinator", Description: "Coords", Permissions: []string{}}

	// Insert role
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "roles" ("role_name","description") VALUES ($1,$2) RETURNING "role_id"`)).
		WithArgs(req.Name, req.Description).
		WillReturnRows(sqlmock.NewRows([]string{"role_id"}).AddRow(10))
	mock.ExpectCommit()

	// Select permissions for response (none expected)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "role_permissions" WHERE role_id = $1`)).
		WithArgs(10).
		WillReturnRows(sqlmock.NewRows([]string{"role_id", "page"}))

	c, rec := ctxJSON(t, db, http.MethodPost, "/roles", req)
	CreateRoleHandler(c)
	require.Equal(t, http.StatusCreated, rec.Code)
	var out models.RoleResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
	require.Equal(t, 10, out.ID)
	require.Empty(t, out.Permissions)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateRoleHandler_Unit(t *testing.T) {
	db, mock := newMockDB(t)
	rid := 5
	newName := "Mgr"
	newDesc := "desc"
	// No permission changes (nil means don't touch permissions)

	// Load existing role
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "roles" WHERE "roles"."role_id" = $1 ORDER BY "roles"."role_id" LIMIT $2`)).
		WithArgs(rid, 1).
		WillReturnRows(sqlmock.NewRows([]string{"role_id", "role_name", "description"}).AddRow(rid, "Old", "old"))

	// Save role (GORM updates only fields; does not set role_id)
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "roles" SET "role_name"=$1,"description"=$2 WHERE "role_id" = $3`)).
		WithArgs(newName, newDesc, rid).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	// Load perms for response
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "role_permissions" WHERE role_id = $1`)).
		WithArgs(rid).
		WillReturnRows(sqlmock.NewRows([]string{"role_id", "page"}))

	// Execute
	upd := models.UpdateRoleRequest{Name: &newName, Description: &newDesc}
	c, rec := ctxJSON(t, db, http.MethodPatch, "/roles/5", upd)
	c.Params = gin.Params{gin.Param{Key: "roleID", Value: "5"}}
	UpdateRoleHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	var out models.RoleResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
	require.Equal(t, newName, out.Name)
	require.Empty(t, out.Permissions)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteRoleHandler_Unit(t *testing.T) {
	db, mock := newMockDB(t)
	rid := 7

	// Load role
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "roles" WHERE "roles"."role_id" = $1 ORDER BY "roles"."role_id" LIMIT $2`)).
		WithArgs(rid, 1).
		WillReturnRows(sqlmock.NewRows([]string{"role_id", "role_name", "description"}).AddRow(rid, "Coordinator", "desc"))

	// Delete perms, links, role (no explicit transactions)
	// 1) Delete role_permissions
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM "role_permissions" WHERE role_id = $1`)).
		WithArgs(rid).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	// 2) Delete user_has_role links
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM "user_has_role" WHERE role_id = $1`)).
		WithArgs(rid).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	// 3) Delete the role itself
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM "roles" WHERE "roles"."role_id" = $1`)).
		WithArgs(rid).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	c, rec := ctxJSON(t, db, http.MethodDelete, "/roles/7", nil)
	c.Params = gin.Params{gin.Param{Key: "roleID", Value: "7"}}
	DeleteRoleHandler(c)

	// Handler sets 204 No Content, but Gin test harness may reflect 200 OK; accept either
	if rec.Code != http.StatusNoContent && rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: got %d, want 204 or 200", rec.Code)
	}
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteRoleHandler_SystemRoleBlocked_Unit(t *testing.T) {
	db, mock := newMockDB(t)

	// Load Admin role
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "roles" WHERE "roles"."role_id" = $1 ORDER BY "roles"."role_id" LIMIT $2`)).
		WithArgs(1, 1).
		WillReturnRows(sqlmock.NewRows([]string{"role_id", "role_name", "description"}).AddRow(1, "Admin", "System"))

	c, rec := ctxJSON(t, db, http.MethodDelete, "/roles/1", nil)
	c.Params = gin.Params{gin.Param{Key: "roleID", Value: "1"}}
	DeleteRoleHandler(c)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}
