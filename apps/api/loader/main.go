package main

import (
	"fmt"
	"io"
	"os"

	"magic-converter/app/modules/converter"

	"ariga.io/atlas-provider-bun/bunschema"
	_ "ariga.io/atlas/sdk/recordriver"
)

func main() {
	stmts, err := bunschema.New(bunschema.DialectPostgres).Load(
		&converter.Converter{},
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load bun schema: %v\n", err)
		os.Exit(1)
	}
	io.WriteString(os.Stdout, stmts)
}
