//go:build !unit

package profile

import (
    "Automated-Scheduling-Project/internal/database/gen_models"
    "Automated-Scheduling-Project/internal/database/models"
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/require"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

type EmploymentHistory struct {
    EmploymentID       int        `gorm:"primaryKey"`
    EmployeeNumber     string     `gorm:"column:employee_number"`
    PositionMatrixCode string     `gorm:"column:position_matrix_code"`
    StartDate          time.Time  `gorm:"column:start_date"`
    EndDate            *time.Time `gorm:"column:end_date"`
}
func (EmploymentHistory) TableName() string { return "employment_history" }

func setupTestDB(t *testing.T) *gorm.DB {
    t.Helper()
    db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
    require.NoError(t, err)
    require.NoError(t, db.AutoMigrate(&gen_models.Employee{}, &gen_models.User{}, &models.CompetencyDefinition{}, &models.EmployeeCompetency{}, &models.CustomJobMatrix{}, &models.CompetencyPrerequisite{}, &models.JobPosition{}))
    require.NoError(t, db.AutoMigrate(&EmploymentHistory{}))

    DB = db
    return db
}

func setupRouter() *gin.Engine {
    gin.SetMode(gin.TestMode)
    r := gin.New()
    r.Use(func(c *gin.Context) {
        if h := c.GetHeader("X-Test-Email"); h != "" {
            c.Set("email", h)
        }
        c.Next()
    })
    api := r.Group("/api")
    {
        api.GET("/profile/competencies", GetEmployeeCompetencyProfile)
    }
    return r
}

func performRequest(r http.Handler, method, path string, body []byte, email string) *httptest.ResponseRecorder {
    req, _ := http.NewRequest(method, path, bytes.NewBuffer(body))
    if email != "" {
        req.Header.Set("X-Test-Email", email)
    }
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    return w
}

func TestGetEmployeeCompetencyProfile_Integration(t *testing.T) {
    db := setupTestDB(t)

    emp := gen_models.Employee{Employeenumber: "E200", Firstname: "Int", Lastname: "User", Useraccountemail: "int@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "intuser", Password: "x", EmployeeNumber: "E200"}
    require.NoError(t, db.Create(&usr).Error)

    jp := models.JobPosition{PositionMatrixCode: "JP1", JobTitle: "Integrator", IsActive: true}
    require.NoError(t, db.Create(&jp).Error)
    require.NoError(t, db.Exec(`INSERT INTO employment_history (employee_number, position_matrix_code, start_date) VALUES (?, ?, ?)`, emp.Employeenumber, jp.PositionMatrixCode, time.Now()).Error)

    c1 := models.CompetencyDefinition{CompetencyName: "IC1", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    c2 := models.CompetencyDefinition{CompetencyName: "IC2", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    require.NoError(t, db.Create(&c1).Error)
    require.NoError(t, db.Create(&c2).Error)

    ec := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: c1.CompetencyID, AchievementDate: time.Now()}
    require.NoError(t, db.Create(&ec).Error)

    cjm := models.CustomJobMatrix{PositionMatrixCode: jp.PositionMatrixCode, CompetencyID: c2.CompetencyID, RequirementStatus: "Required"}
    require.NoError(t, db.Create(&cjm).Error)

    r := setupRouter()

    w := performRequest(r, http.MethodGet, "/api/profile/competencies", nil, "")
    require.Equal(t, http.StatusUnauthorized, w.Code)

    w = performRequest(r, http.MethodGet, "/api/profile/competencies", nil, emp.Useraccountemail)
    require.Equal(t, http.StatusOK, w.Code, w.Body.String())

    var prof EmployeeCompetencyProfile
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &prof))
    require.Equal(t, emp.Employeenumber, prof.Employee.EmployeeNumber)
    require.Len(t, prof.Completed, 1)
    require.Len(t, prof.Required, 0)

    _ = db
}
