package seeders

import (
	"context"
	"fmt"
	"strings"

	"github.com/uptrace/bun"
)

func Run(ctx context.Context, db *bun.DB, module string) error {
	fmt.Println("Running seeders...")

	switch strings.ToLower(strings.TrimSpace(module)) {
	case "", "all", "auth", "user", "users":
		if err := seedAuthUsers(ctx, db); err != nil {
			return err
		}
	default:
		return fmt.Errorf("unknown seeder module %q", module)
	}

	fmt.Println("Seeding completed")
	return nil
}
