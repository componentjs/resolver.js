BIN = ./node_modules/.bin/

test tests:
	@${BIN}mocha \
		--require should \
		--reporter spec \
		--harmony-generators \
		--timeout 10000 \
		--bail

.PHONY: test tests