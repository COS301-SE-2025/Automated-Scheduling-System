//go:build unit

package competency_type

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
)

// --- Test Setup & Helpers ---

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}))
	require.NoError(t, err)
	return gormDB, mock
}

func ctxWithJSON(t *testing.T, db *gorm.DB, method string, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	var jsonBody []byte
	if body != nil {
		var err error
		jsonBody, err = json.Marshal(body)
		require.NoError(t, err)
	} else {
		jsonBody = []byte{}
	}

	req, err := http.NewRequest(method, path, bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	DB = db
	return c, rec
}

// --- Tests ---

func TestGetAllCompetencyTypesHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	// Expect a SELECT on competency_types (ordered by type_name)
	mock.ExpectQuery(`SELECT .* FROM "competency_types".*`).
		WillReturnRows(sqlmock.NewRows([]string{"type_name", "description", "is_active"}).
			AddRow("Programming", "Programming related skills", true).
			AddRow("Soft Skills", "Interpersonal skills", true))

	c, rec := ctxWithJSON(t, db, http.MethodGet, "/api/competency-types", nil)
	GetAllCompetencyTypesHandler(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var got []models.CompetencyType
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &got))
	require.Len(t, got, 2)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateCompetencyTypeHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	reqBody := TypeRequest{
		TypeName:    "Compliance",
		Description: "Mandatory compliance training",
	}

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`INSERT INTO "competency_types" ("type_name","description","is_active") VALUES ($1,$2,$3)`)).
		WithArgs(reqBody.TypeName, reqBody.Description, true).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	c, rec := ctxWithJSON(t, db, http.MethodPost, "/api/competency-types", reqBody)
	CreateCompetencyTypeHandler(c)

	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
	var got models.CompetencyType
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &got))
	require.Equal(t, reqBody.TypeName, got.TypeName)
	require.Equal(t, reqBody.Description, got.Description)
	require.True(t, got.IsActive)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateCompetencyTypeHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	typeName := "Programming"
	reqBody := TypeRequest{
		TypeName:    typeName, // name in body isn't used for update
		Description: "Updated description",
	}

	// Update description
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "competency_types" SET "description"=$1 WHERE type_name = $2`)).
		WithArgs(reqBody.Description, typeName).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	// Fetch updated row
	mock.ExpectQuery(`SELECT .* FROM "competency_types" WHERE type_name = \$1 .* LIMIT \$2`).
		WithArgs(typeName, 1).
		WillReturnRows(sqlmock.NewRows([]string{"type_name", "description", "is_active"}).
			AddRow(typeName, reqBody.Description, true))

	c, rec := ctxWithJSON(t, db, http.MethodPut, "/api/competency-types/"+typeName, reqBody)
	c.Params = gin.Params{gin.Param{Key: "typeName", Value: typeName}}
	UpdateCompetencyTypeHandler(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var got models.CompetencyType
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &got))
	require.Equal(t, typeName, got.TypeName)
	require.Equal(t, reqBody.Description, got.Description)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateTypeStatusHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	typeName := "Soft Skills"
	newStatus := false
	reqBody := UpdateStatusRequest{IsActive: &newStatus}

	// Update is_active
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "competency_types" SET "is_active"=$1 WHERE type_name = $2`)).
		WithArgs(newStatus, typeName).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	// Fetch updated row
	mock.ExpectQuery(`SELECT .* FROM "competency_types" WHERE type_name = \$1 .* LIMIT \$2`).
		WithArgs(typeName, 1).
		WillReturnRows(sqlmock.NewRows([]string{"type_name", "description", "is_active"}).
			AddRow(typeName, "Some desc", newStatus))

	c, rec := ctxWithJSON(t, db, http.MethodPut, "/api/competency-types/"+typeName+"/status", reqBody)
	c.Params = gin.Params{gin.Param{Key: "typeName", Value: typeName}}
	UpdateTypeStatusHandler(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var got models.CompetencyType
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &got))
	require.Equal(t, typeName, got.TypeName)
	require.Equal(t, newStatus, got.IsActive)
	require.NoError(t, mock.ExpectationsWereMet())
}
