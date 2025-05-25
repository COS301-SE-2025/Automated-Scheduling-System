package auth

import (
	"time"
	"github.com/golang-jwt/jwt/v5"
)


func GenerateJWT(email string)(string, error){
    claims := jwt.MapClaims{
        "email" : email,
        "exp" : time.Now().Add(24 * time.Hour).Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtKey)
}
