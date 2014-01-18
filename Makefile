BIN = ./node_modules/.bin/
SRC = $(shell find lib -name "*.js")
BUILD = $(subst lib,build,$(SRC))
NODE ?= node

build:
	@mkdir -p build
	@$(MAKE) $(BUILD)

build/%.js: lib/%.js
	@$(BIN)regenerator --include-runtime $< > $@

clean:
	@rm -rf build

test tests:
	@$(NODE) $(BIN)mocha \
		--require should \
		--reporter spec \
		--harmony-generators \
		--timeout 10000 \
		--bail

.PHONY: test tests build clean