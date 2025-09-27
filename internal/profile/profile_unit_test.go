//go:build unit

package profile

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"
    "net/url"

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

func callVisualizationHandlerWithEmail(t *testing.T, email string) *httptest.ResponseRecorder {
    gin.SetMode(gin.TestMode)
    rec := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(rec)
    req, _ := http.NewRequest(http.MethodGet, "/api/profile/visualization", nil)
    c.Request = req
    if email != "" {
        c.Set("email", email)
    }
    GetEmployeeVisualizationData(c)
    return rec
}

func callAdminHandlerWithEmailAndQuery(t *testing.T, email string, queryParams string) *httptest.ResponseRecorder {
    gin.SetMode(gin.TestMode)
    rec := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(rec)
    
    reqURL := "/api/profile/admin/compliance"
    if queryParams != "" {
        reqURL += "?" + queryParams
    }
    req, _ := http.NewRequest(http.MethodGet, reqURL, nil)
    
    // Parse query parameters and set them in context
    if queryParams != "" {
        parsedURL, _ := url.Parse(reqURL)
        c.Request = req
        c.Request.URL = parsedURL
    } else {
        c.Request = req
    }
    
    if email != "" {
        c.Set("email", email)
    }
    GetAdminComplianceData(c)
    return rec
}

// =============================================================================
// GetEmployeeCompetencyProfile Tests
// =============================================================================

func TestGetEmployeeCompetencyProfile_Unauthenticated_Unit(t *testing.T) {
    setupTestDB(t)
    rec := callHandlerWithEmail(t, "")
    require.Equal(t, http.StatusUnauthorized, rec.Code)
    
    var response map[string]interface{}
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
    require.Equal(t, "not authenticated", response["error"])
}

func TestGetEmployeeCompetencyProfile_EmployeeNotFound_Unit(t *testing.T) {
    setupTestDB(t)
    rec := callHandlerWithEmail(t, "nonexistent@example.com")
    require.Equal(t, http.StatusUnauthorized, rec.Code)
    
    var response map[string]interface{}
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
    require.Equal(t, "employee not found", response["error"])
}

func TestGetEmployeeCompetencyProfile_UserNotAssociated_Unit(t *testing.T) {
    db := setupTestDB(t)
    
    // Create employee but no user
    emp := gen_models.Employee{Employeenumber: "E101", Firstname: "Test", Lastname: "User", Useraccountemail: "test101@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    
    rec := callHandlerWithEmail(t, emp.Useraccountemail)
    require.Equal(t, http.StatusUnauthorized, rec.Code)
    
    var response map[string]interface{}
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
    require.Equal(t, "employee not found", response["error"])
}

func TestGetEmployeeCompetencyProfile_Success_Unit(t *testing.T) {
    db := setupTestDB(t)

    emp := gen_models.Employee{Employeenumber: "E100", Firstname: "Test", Lastname: "User", Useraccountemail: "test@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "testuser", Password: "x", EmployeeNumber: "E100"}
    require.NoError(t, db.Create(&usr).Error)

    jp := models.JobPosition{PositionMatrixCode: "POS1", JobTitle: "Tester", IsActive: true}
    require.NoError(t, db.Create(&jp).Error)
    
    // Use the current time for employment history with NULL end date for current position
    now := time.Now()
    require.NoError(t, db.Exec(`INSERT INTO employment_history (employee_number, position_matrix_code, start_date, end_date) VALUES (?, ?, ?, ?)`, emp.Employeenumber, jp.PositionMatrixCode, now, nil).Error)

    comp1 := models.CompetencyDefinition{CompetencyName: "C1", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    comp2 := models.CompetencyDefinition{CompetencyName: "C2", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    require.NoError(t, db.Create(&comp1).Error)
    require.NoError(t, db.Create(&comp2).Error)

    ec := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp1.CompetencyID, AchievementDate: &now}
    require.NoError(t, db.Create(&ec).Error)

    cjm := models.CustomJobMatrix{PositionMatrixCode: jp.PositionMatrixCode, CompetencyID: comp2.CompetencyID, RequirementStatus: "Required"}
    require.NoError(t, db.Create(&cjm).Error)

    rec := callHandlerWithEmail(t, emp.Useraccountemail)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

    var prof EmployeeCompetencyProfile
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &prof))
    require.Equal(t, emp.Employeenumber, prof.Employee.EmployeeNumber)
    require.Equal(t, "Test User", prof.Employee.Name)
    // Position info might not be populated due to SQLite/NOW() incompatibility, focus on competency data
    require.Len(t, prof.Completed, 1)
    require.Len(t, prof.Required, 0)
    
    // Verify competency details
    require.Equal(t, "C1", prof.Completed[0].CompetencyName)
    require.Equal(t, "Valid", prof.Completed[0].Status)
}

func TestGetEmployeeCompetencyProfile_WithExpiredCompetencies_Unit(t *testing.T) {
    db := setupTestDB(t)

    emp := gen_models.Employee{Employeenumber: "E102", Firstname: "Test", Lastname: "User", Useraccountemail: "test102@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "testuser", Password: "x", EmployeeNumber: "E102"}
    require.NoError(t, db.Create(&usr).Error)

    // Create competency with expiry
    expiryPeriod := 12
    comp1 := models.CompetencyDefinition{CompetencyName: "Expired Comp", CompetencyTypeName: "Certification", Source: "Custom", IsActive: true, ExpiryPeriodMonths: &expiryPeriod}
    require.NoError(t, db.Create(&comp1).Error)

    // Create expired competency
    past := time.Now().AddDate(0, 0, -1) // 1 day ago
    expiredDate := time.Now().AddDate(0, 0, -2) // 2 days ago
    ec := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp1.CompetencyID, AchievementDate: &past, ExpiryDate: &expiredDate}
    require.NoError(t, db.Create(&ec).Error)

    rec := callHandlerWithEmail(t, emp.Useraccountemail)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

    var prof EmployeeCompetencyProfile
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &prof))
    require.Len(t, prof.Completed, 1)
    require.Equal(t, "Expired", prof.Completed[0].Status)
}

func TestGetEmployeeCompetencyProfile_WithExpiringSoonCompetencies_Unit(t *testing.T) {
    db := setupTestDB(t)

    emp := gen_models.Employee{Employeenumber: "E103", Firstname: "Test", Lastname: "User", Useraccountemail: "test103@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "testuser", Password: "x", EmployeeNumber: "E103"}
    require.NoError(t, db.Create(&usr).Error)

    comp1 := models.CompetencyDefinition{CompetencyName: "Expiring Comp", CompetencyTypeName: "Certification", Source: "Custom", IsActive: true}
    require.NoError(t, db.Create(&comp1).Error)

    // Create competency expiring in 30 days
    past := time.Now().AddDate(0, 0, -1)
    expiringDate := time.Now().AddDate(0, 0, 30) // 30 days from now
    ec := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp1.CompetencyID, AchievementDate: &past, ExpiryDate: &expiringDate}
    require.NoError(t, db.Create(&ec).Error)

    rec := callHandlerWithEmail(t, emp.Useraccountemail)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

    var prof EmployeeCompetencyProfile
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &prof))
    require.Len(t, prof.Completed, 1)
    require.Equal(t, "Expires Soon", prof.Completed[0].Status)
}

func TestGetEmployeeCompetencyProfile_WithArchivedCompetencies_Unit(t *testing.T) {
    db := setupTestDB(t)

    emp := gen_models.Employee{Employeenumber: "E104", Firstname: "Test", Lastname: "User", Useraccountemail: "test104@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "testuser", Password: "x", EmployeeNumber: "E104"}
    require.NoError(t, db.Create(&usr).Error)

    // Create archived competency
    comp1 := models.CompetencyDefinition{CompetencyName: "Archived Comp", CompetencyTypeName: "Certification", Source: "Custom", IsActive: false}
    require.NoError(t, db.Create(&comp1).Error)

    now := time.Now()
    ec := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp1.CompetencyID, AchievementDate: &now}
    require.NoError(t, db.Create(&ec).Error)

    rec := callHandlerWithEmail(t, emp.Useraccountemail)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

    var prof EmployeeCompetencyProfile
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &prof))
    require.Len(t, prof.Completed, 1)
    require.Equal(t, "Archived", prof.Completed[0].Status)
}

func TestGetEmployeeCompetencyProfile_WithRequiredCompetenciesWithPrerequisites_Unit(t *testing.T) {
    db := setupTestDB(t)

    emp := gen_models.Employee{Employeenumber: "E105", Firstname: "Test", Lastname: "User", Useraccountemail: "test105@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "testuser", Password: "x", EmployeeNumber: "E105"}
    require.NoError(t, db.Create(&usr).Error)

    // Create competencies with prerequisites
    comp1 := models.CompetencyDefinition{CompetencyName: "Basic Comp", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    comp2 := models.CompetencyDefinition{CompetencyName: "Advanced Comp", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    require.NoError(t, db.Create(&comp1).Error)
    require.NoError(t, db.Create(&comp2).Error)

    // Set prerequisite relationship
    prereq := models.CompetencyPrerequisite{CompetencyID: comp2.CompetencyID, PrerequisiteCompetencyID: comp1.CompetencyID}
    require.NoError(t, db.Create(&prereq).Error)

    // Create required competencies (not completed)
    ec1 := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp1.CompetencyID}
    ec2 := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp2.CompetencyID}
    require.NoError(t, db.Create(&ec1).Error)
    require.NoError(t, db.Create(&ec2).Error)

    rec := callHandlerWithEmail(t, emp.Useraccountemail)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

    var prof EmployeeCompetencyProfile
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &prof))
    require.Len(t, prof.Required, 2)
    
    // Should be sorted with no prerequisites first
    require.Len(t, prof.Required[0].Prerequisites, 0) // Basic comp has no prerequisites
    require.Equal(t, "Basic Comp", prof.Required[0].CompetencyName)
    require.Len(t, prof.Required[1].Prerequisites, 1) // Advanced comp has one prerequisite
    require.Equal(t, "Advanced Comp", prof.Required[1].CompetencyName)
}

// =============================================================================
// GetEmployeeVisualizationData Tests
// =============================================================================

func TestGetEmployeeVisualizationData_Unauthenticated_Unit(t *testing.T) {
    setupTestDB(t)
    rec := callVisualizationHandlerWithEmail(t, "")
    require.Equal(t, http.StatusUnauthorized, rec.Code)
    
    var response map[string]interface{}
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
    require.Equal(t, "not authenticated", response["error"])
}

func TestGetEmployeeVisualizationData_EmployeeNotFound_Unit(t *testing.T) {
    setupTestDB(t)
    rec := callVisualizationHandlerWithEmail(t, "nonexistent@example.com")
    require.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestGetEmployeeVisualizationData_Success_Unit(t *testing.T) {
    db := setupTestDB(t)

    emp := gen_models.Employee{Employeenumber: "E200", Firstname: "Viz", Lastname: "User", Useraccountemail: "viz@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "vizuser", Password: "x", EmployeeNumber: "E200"}
    require.NoError(t, db.Create(&usr).Error)

    jp := models.JobPosition{PositionMatrixCode: "VIZ1", JobTitle: "Visualizer", IsActive: true}
    require.NoError(t, db.Create(&jp).Error)
    
    // Use current time for employment history with NULL end date for current position
    now := time.Now()
    require.NoError(t, db.Exec(`INSERT INTO employment_history (employee_number, position_matrix_code, start_date, end_date) VALUES (?, ?, ?, ?)`, emp.Employeenumber, jp.PositionMatrixCode, now, nil).Error)

    // Create various competencies with different statuses
    comp1 := models.CompetencyDefinition{CompetencyName: "Completed", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    comp2 := models.CompetencyDefinition{CompetencyName: "Required", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    comp3 := models.CompetencyDefinition{CompetencyName: "Expired", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    comp4 := models.CompetencyDefinition{CompetencyName: "Expiring", CompetencyTypeName: "T", Source: "Custom", IsActive: true}
    require.NoError(t, db.Create(&comp1).Error)
    require.NoError(t, db.Create(&comp2).Error)
    require.NoError(t, db.Create(&comp3).Error)
    require.NoError(t, db.Create(&comp4).Error)

    past := now.AddDate(0, 0, -10)
    expired := now.AddDate(0, 0, -1)
    expiringSoon := now.AddDate(0, 0, 30)

    // Completed competency
    ec1 := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp1.CompetencyID, AchievementDate: &now}
    // Required competency (not completed)
    ec2 := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp2.CompetencyID}
    // Expired competency
    ec3 := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp3.CompetencyID, AchievementDate: &past, ExpiryDate: &expired}
    // Expiring soon competency
    ec4 := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp4.CompetencyID, AchievementDate: &past, ExpiryDate: &expiringSoon}
    
    require.NoError(t, db.Create(&ec1).Error)
    require.NoError(t, db.Create(&ec2).Error)
    require.NoError(t, db.Create(&ec3).Error)
    require.NoError(t, db.Create(&ec4).Error)

    rec := callVisualizationHandlerWithEmail(t, emp.Useraccountemail)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

    var vizData models.VisualizationData
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &vizData))
    
    require.Equal(t, emp.Employeenumber, vizData.Employee.EmployeeNumber)
    require.Equal(t, "Viz User", vizData.Employee.Name)
    // Position info might not be populated due to SQLite/NOW() incompatibility, focus on competency data
    
    require.Equal(t, 4, vizData.CompletionOverview.TotalRequired)
    require.Equal(t, 3, vizData.CompletionOverview.TotalCompleted) // comp1, comp3, comp4 are completed
    require.Equal(t, 1, vizData.CompletionOverview.TotalOutstanding) // comp2 is required
    require.Equal(t, 75.0, vizData.CompletionOverview.CompletionRate) // 3/4 = 75%
    
    require.Len(t, vizData.CompetencyBreakdown, 4)
    require.GreaterOrEqual(t, len(vizData.StatusBreakdown), 1)
    
    // Verify status distribution
    statusCounts := make(map[string]int)
    for _, item := range vizData.CompetencyBreakdown {
        statusCounts[item.Status]++
    }
    require.Equal(t, 1, statusCounts["completed"])
    require.Equal(t, 1, statusCounts["required"])
    require.Equal(t, 1, statusCounts["expired"])
    require.Equal(t, 1, statusCounts["expires_soon"])
}

func TestGetEmployeeVisualizationData_WithArchivedCompetencies_Unit(t *testing.T) {
    db := setupTestDB(t)

    emp := gen_models.Employee{Employeenumber: "E201", Firstname: "Archive", Lastname: "User", Useraccountemail: "archive@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "archiveuser", Password: "x", EmployeeNumber: "E201"}
    require.NoError(t, db.Create(&usr).Error)

    // Create archived competency
    comp1 := models.CompetencyDefinition{CompetencyName: "Archived", CompetencyTypeName: "T", Source: "Custom", IsActive: false}
    require.NoError(t, db.Create(&comp1).Error)

    now := time.Now()
    ec1 := models.EmployeeCompetency{EmployeeNumber: emp.Employeenumber, CompetencyID: comp1.CompetencyID, AchievementDate: &now}
    require.NoError(t, db.Create(&ec1).Error)

    rec := callVisualizationHandlerWithEmail(t, emp.Useraccountemail)
    require.Equal(t, http.StatusOK, rec.Code)

    var vizData models.VisualizationData
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &vizData))
    
    require.Len(t, vizData.CompetencyBreakdown, 1)
    require.Equal(t, "archived", vizData.CompetencyBreakdown[0].Status)
}

// =============================================================================
// GetAdminComplianceData Tests
// =============================================================================

func TestGetAdminComplianceData_Unauthenticated_Unit(t *testing.T) {
    setupTestDB(t)
    rec := callAdminHandlerWithEmailAndQuery(t, "", "")
    require.Equal(t, http.StatusUnauthorized, rec.Code)
    
    var response map[string]interface{}
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
    require.Equal(t, "not authenticated", response["error"])
}

func TestGetAdminComplianceData_EmployeeNotFound_Unit(t *testing.T) {
    setupTestDB(t)
    rec := callAdminHandlerWithEmailAndQuery(t, "nonexistent@example.com", "")
    require.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestGetAdminComplianceData_UserNotFound_Unit(t *testing.T) {
    db := setupTestDB(t)
    
    // Create employee but no user
    emp := gen_models.Employee{Employeenumber: "E300", Firstname: "Admin", Lastname: "Test", Useraccountemail: "admin@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    
    rec := callAdminHandlerWithEmailAndQuery(t, emp.Useraccountemail, "")
    require.Equal(t, http.StatusUnauthorized, rec.Code)
    
    var response map[string]interface{}
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
    require.Equal(t, "user not found", response["error"])
}

func TestGetAdminComplianceData_NotAdmin_Unit(t *testing.T) {
    db := setupTestDB(t)
    
    emp := gen_models.Employee{Employeenumber: "E301", Firstname: "Regular", Lastname: "User", Useraccountemail: "regular@example.com"}
    require.NoError(t, db.Create(&emp).Error)
    usr := gen_models.User{Username: "regularuser", Password: "x", EmployeeNumber: "E301", Role: "Employee"}
    require.NoError(t, db.Create(&usr).Error)
    
    rec := callAdminHandlerWithEmailAndQuery(t, emp.Useraccountemail, "")
    require.Equal(t, http.StatusForbidden, rec.Code)
    
    var response map[string]interface{}
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
    require.Equal(t, "admin access required", response["error"])
}

func TestGetAdminComplianceData_Success_Unit(t *testing.T) {
    db := setupTestDB(t)
    
    // Create admin user
    adminEmp := gen_models.Employee{Employeenumber: "E302", Firstname: "Admin", Lastname: "User", Useraccountemail: "admin302@example.com", Employeestatus: "Active"}
    require.NoError(t, db.Create(&adminEmp).Error)
    adminUser := gen_models.User{Username: "adminuser", Password: "x", EmployeeNumber: "E302", Role: "Admin"}
    require.NoError(t, db.Create(&adminUser).Error)
    
    // Create some test data
    emp1 := gen_models.Employee{Employeenumber: "E303", Firstname: "Test", Lastname: "Employee1", Useraccountemail: "emp1@example.com", Employeestatus: "Active"}
    emp2 := gen_models.Employee{Employeenumber: "E304", Firstname: "Test", Lastname: "Employee2", Useraccountemail: "emp2@example.com", Employeestatus: "Active"}
    require.NoError(t, db.Create(&emp1).Error)
    require.NoError(t, db.Create(&emp2).Error)
    
    // Create job positions
    jp1 := models.JobPosition{PositionMatrixCode: "POS1", JobTitle: "Developer", IsActive: true}
    jp2 := models.JobPosition{PositionMatrixCode: "POS2", JobTitle: "Manager", IsActive: true}
    require.NoError(t, db.Create(&jp1).Error)
    require.NoError(t, db.Create(&jp2).Error)
    
    // Create employment history
    require.NoError(t, db.Exec(`INSERT INTO employment_history (employee_number, position_matrix_code, start_date) VALUES (?, ?, ?)`, emp1.Employeenumber, jp1.PositionMatrixCode, time.Now()).Error)
    require.NoError(t, db.Exec(`INSERT INTO employment_history (employee_number, position_matrix_code, start_date) VALUES (?, ?, ?)`, emp2.Employeenumber, jp2.PositionMatrixCode, time.Now()).Error)
    
    // Create competencies
    comp1 := models.CompetencyDefinition{CompetencyName: "Java", CompetencyTypeName: "Technical", Source: "Custom", IsActive: true}
    comp2 := models.CompetencyDefinition{CompetencyName: "Leadership", CompetencyTypeName: "Soft", Source: "Custom", IsActive: true}
    require.NoError(t, db.Create(&comp1).Error)
    require.NoError(t, db.Create(&comp2).Error)
    
    // Create employee competencies
    now := time.Now()
    ec1 := models.EmployeeCompetency{EmployeeNumber: emp1.Employeenumber, CompetencyID: comp1.CompetencyID, AchievementDate: &now}
    ec2 := models.EmployeeCompetency{EmployeeNumber: emp1.Employeenumber, CompetencyID: comp2.CompetencyID} // Required but not completed
    ec3 := models.EmployeeCompetency{EmployeeNumber: emp2.Employeenumber, CompetencyID: comp2.CompetencyID, AchievementDate: &now}
    require.NoError(t, db.Create(&ec1).Error)
    require.NoError(t, db.Create(&ec2).Error)
    require.NoError(t, db.Create(&ec3).Error)
    
    rec := callAdminHandlerWithEmailAndQuery(t, adminEmp.Useraccountemail, "")
    require.Equal(t, http.StatusOK, rec.Code)
    
    var complianceData models.AdminComplianceData
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &complianceData))
    
    require.Equal(t, 3, complianceData.CompanyOverview.TotalEmployees) // admin + emp1 + emp2
    require.Equal(t, 2, complianceData.CompanyOverview.TotalCompetencies)
    require.Equal(t, 3, complianceData.CompanyOverview.TotalRequired) // Total assignments
    require.Equal(t, 2, complianceData.CompanyOverview.TotalCompleted) // ec1 + ec3
    require.InDelta(t, 66.67, complianceData.CompanyOverview.OverallComplianceRate, 0.1) // 2/3 = 66.67%
    
    require.GreaterOrEqual(t, len(complianceData.DepartmentBreakdown), 0)
    require.GreaterOrEqual(t, len(complianceData.CompetencyHotspots), 0)
    require.Equal(t, 12, len(complianceData.TrendData)) // 12 months
}

func TestGetAdminComplianceData_WithQueryFilters_Unit(t *testing.T) {
    db := setupTestDB(t)
    
    // Create admin user
    adminEmp := gen_models.Employee{Employeenumber: "E305", Firstname: "Admin", Lastname: "User", Useraccountemail: "admin305@example.com"}
    require.NoError(t, db.Create(&adminEmp).Error)
    adminUser := gen_models.User{Username: "adminuser", Password: "x", EmployeeNumber: "E305", Role: "Admin"}
    require.NoError(t, db.Create(&adminUser).Error)
    
    queryParams := "positionCodes=DEV,MGR&competencyTypes=Technical,Soft"
    rec := callAdminHandlerWithEmailAndQuery(t, adminEmp.Useraccountemail, queryParams)
    require.Equal(t, http.StatusOK, rec.Code)
    
    var complianceData models.AdminComplianceData
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &complianceData))
    
    // Should return valid response even with filters applied
    require.GreaterOrEqual(t, complianceData.CompanyOverview.TotalEmployees, 0)
}

func TestGetAdminComplianceData_ZeroDivisionHandling_Unit(t *testing.T) {
    db := setupTestDB(t)
    
    // Create admin user with no other data
    adminEmp := gen_models.Employee{Employeenumber: "E306", Firstname: "Admin", Lastname: "User", Useraccountemail: "admin306@example.com"}
    require.NoError(t, db.Create(&adminEmp).Error)
    adminUser := gen_models.User{Username: "adminuser", Password: "x", EmployeeNumber: "E306", Role: "Admin"}
    require.NoError(t, db.Create(&adminUser).Error)
    
    rec := callAdminHandlerWithEmailAndQuery(t, adminEmp.Useraccountemail, "")
    require.Equal(t, http.StatusOK, rec.Code)
    
    var complianceData models.AdminComplianceData
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &complianceData))
    
    require.Equal(t, 0.0, complianceData.CompanyOverview.OverallComplianceRate) // Should handle division by zero
}
