package rulesv2

import "strings"

// DomainFacts resolves straight-through domain objects:
// - jobPosition.*, competencyType.*, role.*, link.*, prerequisite.*, jobMatrix.*
//
// looks up the top-level object in EvalContext.Data and resolves fields under it.
type DomainFacts struct{}

func (DomainFacts) Resolve(evCtx EvalContext, path string) (any, bool, error) {
    prefixes := []string{
        "jobPosition.",
        "competencyType.",
        "role.",
        "link.",
        "prerequisite.",
        "jobMatrix.",
    }

    for _, p := range prefixes {
        if strings.HasPrefix(path, p) {
            top := strings.TrimSuffix(p, ".")
            return resolveUnder(evCtx, top, path)
        }
    }
    return nil, false, nil
}