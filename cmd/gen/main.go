package main

import (
	"Automated-Scheduling-Project/internal/database"

	"gorm.io/gen"
	"gorm.io/gorm"
)

var dbService database.Service = database.New()
var DB *gorm.DB = dbService.Gorm()

func main() {
	g := gen.NewGenerator(gen.Config{
		OutPath:      "internal/database/gen_models/",
		ModelPkgPath: "internal/database/gen_models", // Prevent folder singularization

		Mode: gen.WithoutContext | gen.WithDefaultQuery | gen.WithQueryInterface, // generate mode
	})

	g.UseDB(DB)

	g.GenerateAllTable()

	// Generate the code for models
	g.Execute()
}
