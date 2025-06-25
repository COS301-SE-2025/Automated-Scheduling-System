package rules

import (
	"fmt"

	"github.com/google/cel-go/cel"
	"github.com/google/cel-go/common/types"
)

// celEnv is built once at start-up.  We can’t ignore the second return
// value from cel.NewEnv, so we do the assignment inside init().
var celEnv *cel.Env

func init() {
	var err error
	celEnv, err = cel.NewEnv(
		cel.Variable("user",  cel.MapType(cel.StringType, cel.DynType)),
		cel.Variable("check", cel.MapType(cel.StringType, cel.DynType)),
	)
	if err != nil {
		// Fail fast on configuration errors.
		panic(fmt.Errorf("rules: cannot create CEL environment: %w", err))
	}
}

// Eval evaluates a CEL expression such as
//   "user.role == 'driver' && check.checkType == 'vision'"
// returning the boolean result.
func Eval(expr string, user any, check any) (bool, error) {
	// 1 – parse
	ast, iss := celEnv.Parse(expr)
	if iss.Err() != nil {
		return false, iss.Err()
	}

	// 2 – type-check & compile
	prg, err := celEnv.Program(ast)
	if err != nil {
		return false, err
	}

	// 3 – run
	out, _, err := prg.Eval(map[string]any{
		"user":  user,  // typically a struct → map via encoding/json or mapstructure
		"check": check, // ditto
	})
	if err != nil {
		return false, err
	}

	// 4 – enforce boolean result
	b, ok := out.(types.Bool)
	if !ok {
		return false, fmt.Errorf("expression did not return a boolean (got %v)", out.Type())
	}
	return bool(b), nil
}
