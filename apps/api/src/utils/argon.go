package utils

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	argonMemory      uint32 = 64 * 1024
	argonIterations  uint32 = 3
	argonParallelism uint8  = 2
	argonSaltLength         = 16
	argonKeyLength          = 32
)

func HashPassword(password string) (string, error) {
	salt := make([]byte, argonSaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate password salt: %w", err)
	}

	key := argon2.IDKey([]byte(password), salt, argonIterations, argonMemory, argonParallelism, argonKeyLength)
	encodedSalt := base64.RawStdEncoding.EncodeToString(salt)
	encodedKey := base64.RawStdEncoding.EncodeToString(key)

	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", argonMemory, argonIterations, argonParallelism, encodedSalt, encodedKey), nil
}

func CheckPassword(encodedHash, password string) error {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" {
		return errors.New("invalid argon2id hash")
	}

	params := strings.Split(parts[3], ",")
	if len(params) != 3 {
		return errors.New("invalid argon2id parameters")
	}

	memory, err := parseArgonParameter(params[0], "m")
	if err != nil {
		return err
	}
	iterations, err := parseArgonParameter(params[1], "t")
	if err != nil {
		return err
	}
	parallelism, err := parseArgonParameter(params[2], "p")
	if err != nil {
		return err
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(salt) == 0 {
		return errors.New("invalid argon2id salt")
	}
	storedKey, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(storedKey) == 0 {
		return errors.New("invalid argon2id key")
	}
	if parallelism > 255 || memory == 0 || iterations == 0 {
		return errors.New("invalid argon2id parameters")
	}

	derivedKey := argon2.IDKey([]byte(password), salt, uint32(iterations), uint32(memory), uint8(parallelism), uint32(len(storedKey)))
	if subtle.ConstantTimeCompare(derivedKey, storedKey) != 1 {
		return errors.New("password does not match")
	}
	return nil
}

func parseArgonParameter(value, name string) (uint64, error) {
	parts := strings.SplitN(value, "=", 2)
	if len(parts) != 2 || parts[0] != name {
		return 0, errors.New("invalid argon2id parameter")
	}
	parsed, err := strconv.ParseUint(parts[1], 10, 32)
	if err != nil {
		return 0, errors.New("invalid argon2id parameter")
	}
	return parsed, nil
}
