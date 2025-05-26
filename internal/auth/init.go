package auth

import (
	"log"

	"gorm.io/gorm"
)

var DB *gorm.DB

func Init(db *gorm.DB){
    DB = db

    err := DB.AutoMigrate(&User{})
    if err != nil {
        log.Fatal("Failed to migrate database:", err)
    }
    log.Println("Database migration successfull")
}
