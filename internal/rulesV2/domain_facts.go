package rulesv2

import "strings"

// DomainFacts resolves straight-through domain objects:
// - jobPosition.*, competencyType.*, role.*, link.*, prerequisite.*, jobMatrix.*
//
// looks up the top-level object in EvalContext.Data and resolves fields under it.
type DomainFacts struct{}

func (DomainFacts) Resolve(evCtx EvalContext, path string) (any, bool, error) {
	// Accept case-insensitive prefixes
	lp := strings.ToLower(path)
	prefixes := []string{
		"competency.",
		"jobposition.",
		"competencytype.",
		"role.",
		"link.",
		"prerequisite.",
		"jobmatrix.",
	}

	for _, p := range prefixes {
		if strings.HasPrefix(lp, p) {
			var top string
			switch p {
			case "competency.":
				top = "competency"
			case "jobposition.":
				top = "jobPosition"
			case "competencytype.":
				top = "competencyType"
			case "role.":
				top = "role"
			case "link.":
				top = "link"
			case "prerequisite.":
				top = "prerequisite"
			case "jobmatrix.":
				top = "jobMatrix"
			}
			return resolveUnder(evCtx, top, path)
		}
	}
	return nil, false, nil
}
