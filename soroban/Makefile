.PHONY: check fmt test build-wasm update-snapshots diff-snapshots

check:
	cargo check --workspace

fmt:
	cargo fmt --all

test:
	cargo test --workspace

build-wasm:
	cargo build --workspace --target wasm32-unknown-unknown --release

# ---------------------------------------------------------------------------
# Snapshot management — QA-201 (#798)
# ---------------------------------------------------------------------------

## update-snapshots: Intentionally regenerate all soroban-sdk test snapshots.
##
## Usage:
##   make update-snapshots                  # update all contracts
##   make update-snapshots CONTRACT=core_game  # update one contract
##
## When to run:
##   Run ONLY after a deliberate change to contract storage layout, event
##   payloads, or type definitions. Never run just to make a failing test pass
##   without understanding why the snapshot changed.
##
## After running:
##   1. Review every changed .json file with `git diff soroban/contracts/`.
##   2. Confirm each change matches the intended contract modification.
##   3. Include the updated snapshots in the same commit as the contract change.
##
## See docs/SNAPSHOT_UPDATE_POLICY.md for the full review checklist.
update-snapshots:
ifdef CONTRACT
	SOROBAN_TEST_SNAPSHOT_UPDATE=1 cargo test -p $(CONTRACT) -- --include-ignored 2>&1 | tee /tmp/snapshot-update-$(CONTRACT).log
	@echo ""
	@echo "Snapshots updated for contract: $(CONTRACT)"
	@echo "Review changes with: git diff soroban/contracts/$(CONTRACT)/test_snapshots/"
else
	SOROBAN_TEST_SNAPSHOT_UPDATE=1 cargo test --workspace -- --include-ignored 2>&1 | tee /tmp/snapshot-update-all.log
	@echo ""
	@echo "All snapshots updated."
	@echo "Review changes with: git diff soroban/contracts/*/test_snapshots/"
endif

## diff-snapshots: Show a summary of which snapshot files have changed.
##
## Use this before committing to get a quick audit of which tests were affected.
diff-snapshots:
	@git diff --stat -- 'soroban/contracts/*/test_snapshots/' | grep -E '\.(json)' || echo "(no snapshot changes)"
	@echo ""
	@git diff --name-only -- 'soroban/contracts/*/test_snapshots/' | while read f; do \
	  echo "--- Changed snapshot: $$f"; \
	done
