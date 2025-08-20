package rulesv2

import (
	"strings"
	"time"
)

// CompetencyFacts resolves fields under "competency." plus common derived flags:
//   - competency.IsRequiredForCurrentJob (bool) – expects context to provide:
//     "competency": map[string]any{ "ID": "COMP_X", "ExpiryDate": "2025-01-31", ... }
//     "jobRequiredCompetencyIDs": []string{"COMP_X","COMP_Y"}
//   - competency.DaysUntilExpiry (int) – derived from ExpiryDate
//
// You can extend with more derived metrics as your UI/conditions need.
type CompetencyFacts struct{}

func (CompetencyFacts) Resolve(evCtx EvalContext, path string) (any, bool, error) {
	// Accept case-insensitive prefix so "Competency.*" also works
	if !strings.HasPrefix(strings.ToLower(path), "competency.") {
		return nil, false, nil
	}

	seg := getPathSegments(path)
	if len(seg) == 2 {
		switch strings.ToLower(seg[1]) {
		case "isrequiredforcurrentjob":
			return competencyRequiredForJob(evCtx)
		case "daysuntilexpiry":
			return competencyDaysUntilExpiry(evCtx)
		}
	}

	// default: read field under "competency.*"
	top, ok := fetchTop(evCtx, "competency")
	if !ok {
		return nil, false, nil
	}
	v, ok := resolveFromMapOrStruct(top, seg[1:])
	return v, ok, nil
}

func competencyRequiredForJob(evCtx EvalContext) (any, bool, error) {
	compTop, ok := fetchTop(evCtx, "competency")
	if !ok {
		return false, true, nil
	}
	idv, ok := resolveFromMapOrStruct(compTop, []string{"ID"})
	if !ok {
		return false, true, nil
	}
	compID, _ := idv.(string)
	if strings.TrimSpace(compID) == "" {
		return false, true, nil
	}

	reqIDs, _ := evCtx.Data["jobRequiredCompetencyIDs"].([]string)
	if len(reqIDs) == 0 {
		// try []any -> []string
		if raw, ok2 := evCtx.Data["jobRequiredCompetencyIDs"].([]any); ok2 {
			for _, r := range raw {
				if s, ok3 := r.(string); ok3 {
					reqIDs = append(reqIDs, s)
				}
			}
		}
	}
	for _, id := range reqIDs {
		if strings.EqualFold(strings.TrimSpace(id), compID) {
			return true, true, nil
		}
	}
	return false, true, nil
}

func competencyDaysUntilExpiry(evCtx EvalContext) (any, bool, error) {
	compTop, ok := fetchTop(evCtx, "competency")
	if !ok {
		// No competency in context → this fact is not handled
		return nil, false, nil
	}
	v, ok := resolveFromMapOrStruct(compTop, []string{"ExpiryDate"})
	if !ok {
		// No ExpiryDate available on competency → not handled
		return nil, false, nil
	}
	exp, ok := asTime(v)
	if !ok {
		// ExpiryDate present but unparsable → not handled to avoid operator errors
		return nil, false, nil
	}
	days := int(exp.Sub(evCtx.Now).Hours() / 24)
	return days, true, nil
}

// Optional helper: IsExpiringWithin[n] can be implemented via operator with DaysUntilExpiry.
func IsExpiringWithin(evCtx EvalContext, n int) (bool, bool) {
	compTop, ok := fetchTop(evCtx, "competency")
	if !ok {
		return false, false
	}
	v, ok := resolveFromMapOrStruct(compTop, []string{"ExpiryDate"})
	if !ok {
		return false, false
	}
	exp, ok := asTime(v)
	if !ok {
		return false, false
	}
	diff := exp.Sub(evCtx.Now)
	return diff <= time.Duration(n)*24*time.Hour, true
}
