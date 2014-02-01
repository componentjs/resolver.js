BIN = ./node_modules/.bin/
NODE ?= node

test:
	@$(NODE) $(BIN)mocha \
		--require should \
		--reporter spec \
		--harmony-generators \
		--timeout 10000 \
		--bail

.PHONY: test