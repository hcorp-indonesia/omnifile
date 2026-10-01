package utils

import (
	"fmt"
	"os"
)

func ConnectionString() string {
	url := fmt.Sprintf(
		"%s:%s",
		os.Getenv("APP_HOST"),
		os.Getenv("APP_PORT"),
	)

	return url
}

func DatabaseConnectionString() string {
	if ds := os.Getenv("DATABASE_URL"); ds != "" {
		return ds
	}

	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_SSL_MODE"),
	)
}
