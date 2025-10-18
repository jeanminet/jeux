PYTHON ?= python3
BUILD := scripts/build.py
DIST_DIR := dist

CONFIGS := $(wildcard games/*/config.mk)
GAMES := $(patsubst games/%/config.mk,%,$(CONFIGS))

all: $(GAMES:%=$(DIST_DIR)/%.html)

$(DIST_DIR)/%.html: games/%/config.mk $(BUILD) lib/base.css lib/runtime.js lib/template.html
	@mkdir -p $(DIST_DIR)
	$(PYTHON) $(BUILD) $< $@

clean:
	rm -rf $(DIST_DIR)

.PHONY: all clean
