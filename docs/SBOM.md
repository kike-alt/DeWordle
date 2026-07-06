# DeWordle Software Bill of Materials (SBOM)
## Release Candidate: v1.0.0-rc1

## Table of Contents
1. [Overview](#overview)
2. [Maintained Surfaces Inventory](#maintained-surfaces-inventory)
3. [Backend Dependencies](#backend-dependencies)
4. [Frontend Dependencies](#frontend-dependencies)
5. [Soroban Smart Contract Dependencies](#soroban-smart-contract-dependencies)
6. [Infrastructure Dependencies](#infrastructure-dependencies)
7. [Development Toolchain](#development-toolchain)
8. [Provenance Notes](#provenance-notes)
9. [Refresh Process for Future Releases](#refresh-process-for-future-releases)

## Overview
This Software Bill of Materials (SBOM) provides a comprehensive inventory of all third-party software components used in DeWordle release candidates. It covers all maintained surfaces including backend, frontend, and smart contract layers.

## Maintained Surfaces Inventory
| Surface | Path | Primary Language | Package Manager | Lock File |
|---------|------|------------------|-----------------|-----------|
| Backend API | `/backend` | TypeScript/NestJS | npm | `backend/package-lock.json` |
| Documentation | `/docs` | Markdown | N/A | N/A |
| Infrastructure | Root | Docker/Compose | N/A | N/A |

*Note: Frontend and Soroban directories may be in separate repositories or not present in this working tree.*

## Backend Dependencies
### Production Dependencies (npm)
| Package Name | Version | License | Purpose |
|--------------|---------|---------|---------|
| @nestjs/common | ^11.0.1 | MIT | Core NestJS framework |
| @nestjs/config | ^4.0.2 | MIT | Configuration management |
| @nestjs/core | ^11.0.1 | MIT | NestJS core runtime |
| @nestjs/event-emitter | ^3.0.1 | MIT | Event-driven architecture |
| @nestjs/jwt | ^11.0.0 | MIT | JWT authentication |
| @nestjs/mapped-types | * | MIT | Type mapping utilities |
| @nestjs/passport | ^11.0.5 | MIT | Authentication strategies |
| @nestjs/platform-express | ^11.0.1 | MIT | HTTP server adapter |
| @nestjs/schedule | ^6.0.0 | MIT | Task scheduling |
| @nestjs/swagger | ^11.2.0 | MIT | API documentation generation |
| @nestjs/typeorm | ^11.0.0 | MIT | ORM integration |
| axios | ^1.18.1 | MIT | HTTP client |
| bcrypt | ^6.0.0 | MIT | Password hashing |
| class-transformer | ^0.5.1 | MIT | Object transformation |
| class-validator | ^0.14.2 | MIT | Input validation |
| date-fns | ^4.1.0 | MIT | Date manipulation |
| moment-timezone | ^0.6.0 | MIT | Timezone handling |
| nodemailer | ^9.0.1 | MIT | Email delivery |
| opossum | ^9.0.0 | Apache-2.0 | Circuit breaker pattern |
| passport | ^0.7.0 | MIT | Authentication framework |
| passport-jwt | ^4.0.1 | MIT | JWT authentication strategy |
| pg | ^8.16.3 | MIT | PostgreSQL driver |
| prom-client | ^15.1.3 | Apache-2.0 | Prometheus metrics |
| reflect-metadata | ^0.2.2 | Apache-2.0 | TypeScript decorator support |
| rxjs | ^7.8.1 | Apache-2.0 | Reactive programming |
| typeorm | ^0.3.29 | MIT | Object-relational mapper |
| validator | ^13.15.35 | MIT | String validation |

### Development Dependencies (npm)
| Package Name | Version | License | Purpose |
|--------------|---------|---------|---------|
| @eslint/eslintrc | ^3.2.0 | MIT | ESLint configuration |
| @eslint/js | ^9.18.0 | MIT | ESLint JavaScript support |
| @nestjs/cli | ^11.0.0 | MIT | NestJS CLI tools |
| @nestjs/schematics | ^11.0.0 | MIT | NestJS code generation |
| @nestjs/testing | ^11.0.1 | MIT | Testing utilities |
| @swc/cli | ^0.6.0 | Apache-2.0 | SWC compiler |
| @swc/core | ^1.10.7 | Apache-2.0 | SWC core |
| @types/bcrypt | ^5.0.2 | MIT | TypeScript definitions |
| @types/express | ^5.0.0 | MIT | TypeScript definitions |
| @types/jest | ^29.5.14 | MIT | TypeScript definitions |
| @types/moment-timezone | ^0.5.13 | MIT | TypeScript definitions |
| @types/node | ^22.10.7 | MIT | TypeScript definitions |
| @types/opossum | ^8.1.9 | MIT | TypeScript definitions |
| @types/passport-jwt | ^4.0.1 | MIT | TypeScript definitions |
| @types/supertest | ^6.0.2 | MIT | TypeScript definitions |
| eslint | ^9.18.0 | MIT | Linting |
| eslint-config-prettier | ^10.0.1 | MIT | Prettier integration |
| eslint-plugin-prettier | ^5.2.2 | MIT | Prettier plugin |
| globals | ^16.0.0 | MIT | Global constants |
| jest | ^29.7.0 | MIT | Testing framework |
| prettier | ^3.4.2 | MIT | Code formatting |
| source-map-support | ^0.5.21 | MIT | Source map support |
| supertest | ^7.0.0 | MIT | HTTP testing |
| ts-jest | ^29.2.5 | MIT | Jest TypeScript support |
| ts-loader | ^9.5.2 | MIT | Webpack loader |
| ts-node | ^10.9.2 | MIT | TypeScript runtime |
| tsconfig-paths | ^4.2.0 | MIT | Path mapping |
| typescript | ^5.7.3 | Apache-2.0 | TypeScript compiler |
| typescript-eslint | ^8.20.0 | MIT | TypeScript ESLint support |

## Frontend Dependencies
*Frontend directory not present in current working tree. When present, this section will include:
- React/Vue/Next.js dependencies
- Wallet integration libraries
- Stellar/Soroban SDKs
- UI component libraries*

## Soroban Smart Contract Dependencies
*Soroban directory not present in current working tree. When present, this section will include:
- Soroban SDK versions
- Stellar dependency versions
- Rust crate dependencies from Cargo.lock*

## Infrastructure Dependencies
### Docker Images
| Image | Purpose |
|-------|---------|
| node:20-alpine | Backend runtime |
| postgres:15-alpine | Database |
| redis:7-alpine | Caching/queue backend |

### Docker Compose
- Version: 3.8
- Services: backend, postgres, redis

## Development Toolchain
| Tool | Minimum Version | Purpose |
|------|-----------------|---------|
| Node.js | 20.x | JavaScript runtime |
| npm | 10.x | Package manager |
| TypeScript | 5.7.x | TypeScript compiler |
| Docker | 24.x | Containerization |
| Docker Compose | 2.x | Multi-container orchestration |
| git | 2.x | Version control |

## Provenance Notes
### Source Code Provenance
- **Primary Repository**: DeWordle monorepo
- **License**: MIT (see LICENSE file in root)
- **Maintainers**: DeWordle core team
- **Package Sources**: All npm packages are pulled from the official npm registry (https://registry.npmjs.org/)
- **Trust Model**: Dependencies are pinned to specific versions in package-lock.json for reproducible builds

### Build Provenance
Release candidates are built using:
1. Clean dependency installation: `npm ci` (not `npm install`)
2. Verified lockfile integrity: `npm audit`
3. TypeScript compilation: `npm run build`
4. Container image building with verified base images

### Supply Chain Security
- Dependabot enabled for dependency updates
- npm audit runs on CI for vulnerability scanning
- Snyk integration (if configured) for continuous monitoring
- All commits signed with verified GPG keys

## Refresh Process for Future Releases
### How to Update This SBOM
Maintainers should refresh this SBOM for every release candidate using the following process:

1. **Update Dependency Lists**
   ```bash
   # From backend directory, generate updated package list
   cd backend
   npm list --prod --json > ../docs/backend-prod-deps.json
   npm list --dev --json > ../docs/backend-dev-deps.json
   ```

2. **Check for New Dependencies**
   Compare the generated JSON files with the previous versions to identify:
   - New added dependencies
   - Version upgrades
   - Removed dependencies

3. **Update This Document**
   - Add any new packages to the appropriate tables
   - Update version numbers for upgraded packages
   - Verify license information remains correct
   - Add any new infrastructure or toolchain requirements

4. **Validate All Lock Files**
   Ensure all lock files are up to date and committed:
   - `backend/package-lock.json`
   - `frontend/package-lock.json` (if present)
   - `soroban/Cargo.lock` (if present)

5. **Run Security Checks**
   ```bash
   # Run npm audit for backend
   cd backend
   npm audit --production
   
   # Check for outdated packages
   npm outdated
   ```

6. **Update Provenance Notes**
   - Document any changes to the build process
   - Update trust model or supply chain security measures
   - Add any new verification steps

7. **Commit Changes**
   Commit the updated SBOM along with the release candidate tag:
   ```bash
   git add docs/SBOM.md docs/*-deps.json
   git commit -m "Update SBOM for vX.Y.Z-rcN"
   ```

### Automated Refresh (Optional)
For future automation, consider:
- Using `cyclonedx-npm` to generate machine-readable SBOMs
- Integrate SBOM generation into CI pipeline
- Export to SPDX format for industry-standard compatibility
- Use GitHub's dependency graph to automate updates

## References
- [npm SBOM generation](https://docs.npmjs.com/generating-a-software-bill-of-materials-sbom)
- [CycloneDX](https://cyclonedx.org/)
- [SPDX License List](https://spdx.org/licenses/)
- [Supply Chain Levels for Software Artifacts (SLSA)](https://slsa.dev/)