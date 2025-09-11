//go:build unit

package profile

import (
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
    "Automated-Scheduling-Project/internal/database/gen_models"
    "Automated-Scheduling-Project/internal/database/models"
)

type employmentHistory struct {
    EmploymentID       int        `gorm:"primaryKey"`
    EmployeeNumber     string     `gorm:"column:employee_number"`
    PositionMatrixCode string     `gorm:"column:position_matrix_code"`
    StartDate          time.Time  `gorm:"column:start_date"`
    EndDate            *time.Time `gorm:"column:end_date"`
}
func (employmentHistory) TableName() string { return "employment_history" }

func setupTestDB(t *testing.T) *gorm.DB {
    t.Helper()
    db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
    require.NoError(t, err)
    require.NoError(t, db.AutoMigrate(&gen_models.Employee{}, &gen_models.User{}, &models.EmployeeCompetency{}, &models.CompetencyDefinition{}, &models.CompetencyPrerequisite{}, &models.CustomJobMatrix{}, &models.JobPosition{}))
    require.NoError(t, db.AutoMigrate(&employmentHistory{}))

    DB = db
    return db
}

func callHandlerWithEmail(t *testing.T, email string) *httptest.ResponseRecorder {
    gin.SetMode(gin.TestMode)
    rec := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(rec)
    req, _ := http.NewRequest(http.MethodGet, "/api/profile/competencies", nil)
    c.Request = req
    if email != "" {
        c.Set("email", email)
    }
    GetEmployeeCompetencyProfile(c)
    return rec
}

func TestGetEmployeeCompetencyProfile_Unauthenticated_Unit(t *testing.T) {
    rec := callHandlerWithEmail(t, "")
    require.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestGetEmployeeCompetencyProfile_Success_Unit(t *testing.T) {
    db := setupTestDB(t)

    emp := gen_models.Employee{Employeenumber: "E100", Firstname: "Test", Lastname: "User", Useraccountemail: "test@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "testuser", Password: "x", EmployeeNumber: "E100"}
    require.NoError(t, db.Create(&usr).Error)

    jp := models.JobPosition{PositionMatrixCode: "POS1", JobTitle: "Tester", IsActive: true}
    require.NoError(t, db.Create(&jp).Error)
    require.NoError(t, db.Exec(`INSERT INTO employment_history (employee_number, position_matrix_code, start_date) VALUES (?, ?, ?)`, emp.Employeenumber, jp.PositionMatrixCode, time.Now()).Error)

    comp1 := models.CompetencyDefinition{CompetencyName: "C1", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    comp2 := models.CompetencyDefinition{CompetencyName: "C2", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    require.NoError(t, db.Create(&comp1).Error)
    require.NoError(t, db.Create(&comp2).Error)

    ec := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp1.CompetencyID, AchievementDate: time.Now()}
    require.NoError(t, db.Create(&ec).Error)

    cjm := models.CustomJobMatrix{PositionMatrixCode: jp.PositionMatrixCode, CompetencyID: comp2.CompetencyID, RequirementStatus: "Required"}
    require.NoError(t, db.Create(&cjm).Error)

    rec := callHandlerWithEmail(t, emp.Useraccountemail)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

    var prof EmployeeCompetencyProfile
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &prof))
    require.Equal(t, emp.Employeenumber, prof.Employee.EmployeeNumber)
    require.Len(t, prof.Completed, 1)
    require.Len(t, prof.Required, 0)
}
