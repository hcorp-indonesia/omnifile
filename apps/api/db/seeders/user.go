package seeders

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"magic-converter/src/modules/auth"

	"github.com/uptrace/bun"
)

func seedAuthUsers(ctx context.Context, db *bun.DB) error {
	users := []struct {
		name  string
		email string
	}{
		{name: "Admin", email: "developer@gmail.com"},
		{name: "Rais Hannan Rizanto", email: "rizantohannan@gmail.com"},
	}

	for _, seed := range users {
		storedUser := new(auth.User)
		err := db.NewSelect().Model(storedUser).Where("LOWER(email) = ?", seed.email).Scan(ctx)
		if err == nil {
			fmt.Printf("User %s already exists, skipping\n", seed.email)
			continue
		}
		if err != sql.ErrNoRows {
			return fmt.Errorf("failed to check seed user %s: %w", seed.email, err)
		}

		now := time.Now()
		user := &auth.User{
			Name: seed.name, Email: seed.email, Provider: "email_otp", CreatedAt: now, UpdatedAt: now,
		}
		if _, err := db.NewInsert().Model(user).Exec(ctx); err != nil {
			return fmt.Errorf("failed to insert seed user %s: %w", seed.email, err)
		}
		fmt.Printf("Seeded user: %s\n", seed.email)
	}
	return nil
}
