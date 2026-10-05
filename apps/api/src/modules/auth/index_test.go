package auth

import (
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestRegisterRoutesIncludesPasswordlessEndpoints(t *testing.T) {
	app := fiber.New()
	RegisterRoutes(app.Group("/api/v1"), &AuthController{})

	wanted := map[string]bool{
		"POST /api/v1/auth/request-otp": false,
		"POST /api/v1/auth/verify-otp":  false,
	}
	for _, route := range app.GetRoutes() {
		key := route.Method + " " + route.Path
		if _, ok := wanted[key]; ok {
			wanted[key] = true
		}
	}
	for route, found := range wanted {
		if !found {
			t.Fatalf("route %s was not registered", route)
		}
	}
}
