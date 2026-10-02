package config

import (
	"fmt"
	"os"
)

func ConnectionString() string {
	host := os.Getenv("APP_HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8000"
	}

	return fmt.Sprintf("%s:%s", host, port)
}

func DatabaseConnectionString() string {
	if ds := os.Getenv("DATABASE_URL"); ds != "" {
		return ds
	}

	user := os.Getenv("DB_USER")
	if user == "" {
		user = "postgres"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "password"
	}
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "magic_converter"
	}
	sslMode := os.Getenv("DB_SSL_MODE")
	if sslMode == "" {
		sslMode = "disable"
	}

	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		user,
		password,
		host,
		port,
		dbName,
		sslMode,
	)
}
