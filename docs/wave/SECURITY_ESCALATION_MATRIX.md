# Security Escalation Matrix

This document defines the escalation process for security-sensitive findings in the DeWordle project.

## Purpose

Ensure contributors know exactly who to notify and how to route sensitive findings without public disclosure leaks.

## Severity Classification

| Severity | Examples | Response Time |
|---|---|---|
| Critical | Active exploitation, data breach, key leak | Immediate (< 1 hour) |
| High | Authentication bypass, contract exploit, secret exposure | < 24 hours |
| Medium | Privilege escalation, injection, replay attack | < 72 hours |
| Low | Information disclosure, misconfiguration, verbose errors | < 7 days |

## Escalation Contacts

| Role | Responsibility |
|---|---|
| Repository Owner | Final escalation for all critical/high findings |
| Backend Track Maintainer | Backend API, indexer, and auth security issues |
| Soroban Track Maintainer | Smart contract and on-chain logic vulnerabilities |
| DevOps Track Maintainer | CI/CD, secrets management, infrastructure issues |

## Escalation Flow

1. **Discoverer** identifies a security-sensitive finding.
2. **Do not** create a public issue, comment, or PR referencing the vulnerability.
3. Open a [GitHub Security Advisory](https://github.com/kike-alt/DeWordle/security/advisories/new) with full details.
4. The advisory automatically notifies repository owners.
5. For urgent critical findings, additionally notify the relevant track maintainer through a private channel.
6. Maintain confidentiality until a fix is merged and disclosed.

## Rules of Engagement

- Never open a public issue for security vulnerabilities
- Never commit exploit code to a public branch
- Never discuss specific vulnerabilities in public PR comments
- Never disclose details before a fix is available
- Follow the principle of minimal disclosure

## Related Documentation

- [Security Policy](../../SECURITY.md)
- [Environment Variables Security](../security/ENVIRONMENT_VARIABLES.md)
- [Database Roles Security](../security/DATABASE_ROLES.md)
