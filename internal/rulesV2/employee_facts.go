package rulesv2

import (
	"strings"
)

// EmployeeFacts resolves fields under "employee." and a few derived facts:
// - employee.EmployeeStatus                 (string)
// - employee.EmployeeNumber                 (string)
// - employee.ManagerEmployeeNumber          (string)
// - employee.Role                           (string / optional)
// - employee.Active                         (bool) – convenience alias for EmployeeStatus=="Active"
// - employee.HasCompetencyPrerequisites[ID] (bool) – derived, needs context data:
//
// Required context keys (examples of shapes you can pass in EvCtx.Data):
//   "employee": map[string]any{
//       "EmployeeStatus": "Active",
//       "EmployeeNumber": "E-001",
//       "ManagerEmployeeNumber": "M-123",
//       "Role": "driver",
//       "HireDate": "2023-02-01",
//   }
//   "employeeCompetencyIDs": []string{"A1","B2","C3"}  // the employee’s achieved competency IDs
//   "competencyPrereqs": map[string][]string{          // map: competencyID -> required prereq IDs
//       "COMP_X": {"A1","B2"},
//   }
type EmployeeFacts struct{}

func (EmployeeFacts) Resolve(evCtx EvalContext, path string) (any, bool, error) {
	if !strings.HasPrefix(path, "employee.") {
		return nil, false, nil
	}
	seg := getPathSegments(path)
	// Handle derived selector like HasCompetencyPrerequisites[COMP123]
	if len(seg) == 2 && strings.HasPrefix(seg[1], "HasCompetencyPrerequisites") {
		return employeeHasPrereqs(evCtx, path, seg[1])
	}

	// Shortcut: employee.Active (bool)
	if len(seg) == 2 && strings.EqualFold(seg[1], "Active") {
		top, ok := fetchTop(evCtx, "employee")
		if !ok {
			return nil, false, nil
		}
		v, ok2 := resolveFromMapOrStruct(top, []string{"EmployeeStatus"})
		if !ok2 {
			return false, true, nil
		}
		s, _ := v.(string)
		return strings.EqualFold(s, "Active"), true, nil
	}

	// Default: resolve leaf field under employee.*
	top, ok := fetchTop(evCtx, "employee")
	if !ok {
		return nil, false, nil
	}
	v, ok := resolveFromMapOrStruct(top, seg[1:])
	return v, ok, nil
}

// employeeHasPrereqs implements employee.HasCompetencyPrerequisites[<compID>]
func employeeHasPrereqs(evCtx EvalContext, fullPath string, selector string) (any, bool, error) {
	compID, ok := parseBracketArg(selector)
	if !ok || strings.TrimSpace(compID) == "" {
		return nil, true, factErr(fullPath, "missing bracketed competency ID, expected HasCompetencyPrerequisites[ID]")
	}

	// get employee competency ids
	eci, _ := evCtx.Data["employeeCompetencyIDs"].([]string)
	if len(eci) == 0 {
		// Try []any → []string conversion
		if raw, ok2 := evCtx.Data["employeeCompetencyIDs"].([]any); ok2 {
			for _, r := range raw {
				if s, ok3 := r.(string); ok3 {
					eci = append(eci, s)
				}
			}
		}
	}
	// get prereqs for compID
	prMap, _ := evCtx.Data["competencyPrereqs"].(map[string][]string)
	var prereqs []string
	if prMap != nil {
		prereqs = prMap[compID]
	} else {
		// Optional alternative: map[string][]any or map[string]any
		if alt, ok := evCtx.Data["competencyPrereqs"].(map[string]any); ok {
			if raw, ok2 := alt[compID]; ok2 {
				switch t := raw.(type) {
				case []string:
					prereqs = t
				case []any:
					for _, r := range t {
						if s, ok3 := r.(string); ok3 {
							prereqs = append(prereqs, s)
						}
					}
				}
			}
		}
	}
	if len(prereqs) == 0 {
		// No prereqs means trivially satisfied
		return true, true, nil
	}

	// membership check
	have := map[string]struct{}{}
	for _, id := range eci {
		have[strings.TrimSpace(id)] = struct{}{}
	}
	for _, p := range prereqs {
		if _, ok := have[strings.TrimSpace(p)]; !ok {
			return false, true, nil
		}
	}
	return true, true, nil
}

// Optional helper fact: employee.TenureDays (derived from HireDate)
func EmployeeTenureDays(evCtx EvalContext) (int, bool) {
	top, ok := fetchTop(evCtx, "employee")
	if !ok {
		return 0, false
	}
	v, ok := resolveFromMapOrStruct(top, []string{"HireDate"})
	if !ok {
		return 0, false
	}
	tm, ok := asTime(v)
	if !ok {
		return 0, false
	}
	days := int(evCtx.Now.Sub(tm).Hours() / 24)
	return days, true
}
