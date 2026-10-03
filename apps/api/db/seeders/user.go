package seeders

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"magic-converter/src/modules/auth"
	"magic-converter/src/utils"

	"github.com/uptrace/bun"
)

func seedAuthUsers(ctx context.Context, db *bun.DB) error {
	users := []struct {
		name     string
		email    string
		password string
	}{
		{name: "Admin", email: "developer@gmail.com", password: "Password123!"},
		{name: "Rais Hannan Rizanto", email: "rizantohannan@gmail.com", password: "Password123!"},
	}

	for _, seed := range users {
		storedUser := new(auth.User)
		err := db.NewSelect().Model(storedUser).Where("LOWER(email) = ?", seed.email).Scan(ctx)
		if err == nil {
			if storedUser.Password != nil && strings.HasPrefix(*storedUser.Password, "$argon2id$") {
				fmt.Printf("User %s already exists, skipping\n", seed.email)
				continue
			}
			hashedPassword, hashErr := utils.HashPassword(seed.password)
			if hashErr != nil {
				return fmt.Errorf("failed to hash seed user %s password: %w", seed.email, hashErr)
			}
			storedUser.Password = &hashedPassword
			storedUser.UpdatedAt = time.Now()
			if _, updateErr := db.NewUpdate().Model(storedUser).Column("password", "updated_at").WherePK().Exec(ctx); updateErr != nil {
				return fmt.Errorf("failed to upgrade seed user %s password: %w", seed.email, updateErr)
			}
			fmt.Printf("Upgraded user password to Argon2id: %s\n", seed.email)
			continue
		}
		if err != sql.ErrNoRows {
			return fmt.Errorf("failed to check seed user %s: %w", seed.email, err)
		}

		hashedPassword, err := utils.HashPassword(seed.password)
		if err != nil {
			return fmt.Errorf("failed to hash seed user %s password: %w", seed.email, err)
		}
		now := time.Now()
		user := &auth.User{Name: seed.name, Email: seed.email, Password: &hashedPassword, Provider: "local", CreatedAt: now, UpdatedAt: now}
		if _, err := db.NewInsert().Model(user).Exec(ctx); err != nil {
			return fmt.Errorf("failed to insert seed user %s: %w", seed.email, err)
		}
		fmt.Printf("Seeded user: %s\n", seed.email)
	}
	return nil
}
