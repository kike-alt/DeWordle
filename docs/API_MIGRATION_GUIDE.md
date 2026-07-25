# API Migration Guide

## Overview

This guide provides a template for migrating from one API version to another in the DeWordle monorepo.

## Migration Checklist

### Phase 1: Preparation

- [ ] Identify endpoints to deprecate
- [ ] Create new version directory/controller structure
- [ ] Document breaking changes
- [ ] Set sunset dates

### Phase 2: Implementation

- [ ] Implement successor endpoints in new version
- [ ] Add `@Deprecated(version, sunsetDate)` to old endpoints
- [ ] Update API documentation
- [ ] Add migration headers via `DeprecationInterceptor`

### Phase 3: Client Migration

- [ ] Notify API consumers of deprecation
- [ ] Provide migration examples
- [ ] Update frontend client code
- [ ] Update SDK/client libraries

### Phase 4: Cleanup

- [ ] Monitor deprecated endpoint usage
- [ ] Remove deprecated endpoints after sunset
- [ ] Update versioning module
- [ ] Archive old documentation

## Breaking Changes Policy

Breaking changes require a new major version:

1. Removing fields from response objects
2. Changing field types
3. Modifying authentication requirements
4. Changing URL structure
5. Removing endpoints

## Non-Breaking Changes

These can be added to the current version:

1. Adding new optional request fields
2. Adding new response fields
3. Adding new endpoints
4. Adding new query parameters

## Example: Migrating from v1 to v2

```typescript
// backend/src/v1/auth/v1-auth.controller.ts (deprecated)
@Deprecated('v1', '2026-12-31')
@Post('login')
async loginV1(@Body() dto: LoginDto) {
  // Old implementation
}

// backend/src/v2/auth/v2-auth.controller.ts (new)
@Post('login')
async loginV2(@Body() dto: LoginDtoV2) {
  // New implementation with wallet-based auth
}
```

## Rollback Strategy

If issues arise with v2:

1. Keep v1 endpoints available until sunset
2. Add monitoring for error rates
3. Maintain backward compatibility layer
4. Document rollback procedures
