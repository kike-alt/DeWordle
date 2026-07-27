# Security Policy

## Supported Scope
Security reports are welcomed for:
- Backend API and authentication flows
- Dependency vulnerabilities
- Secrets/configuration leaks
- Smart contract logic vulnerabilities in `onchain/`

## Reporting a Vulnerability
Please do not open a public issue for vulnerabilities.

Report privately through:
- GitHub Security Advisories: https://github.com/kike-alt/DeWordle/security/advisories/new

Include:
- Vulnerability description
- Reproduction steps
- Potential impact
- Suggested remediation (optional)

## Response Targets
- Initial acknowledgment: within 72 hours
- Triage and severity assessment: within 7 days
- Remediation timeline: based on severity and complexity

## Escalation Matrix

The following matrix defines who to notify and how to route security-sensitive findings without public disclosure leaks.

| Severity | Description | Response Time | Escalation Path | Notification Channel |
|---|---|---|---|---|
| **Critical** | Active exploitation, data breach, key leak | Immediate (< 1 hour) | Repository owner → Security lead | Private GitHub advisory + direct message to maintainers |
| **High** | Authentication bypass, contract exploit, secret exposure | < 24 hours | Track maintainer → Repository owner | Private GitHub advisory |
| **Medium** | Privilege escalation, injection, replay attack | < 72 hours | Assigned contributor → Track maintainer | Private GitHub advisory |
| **Low** | Information disclosure, misconfiguration, verbose errors | < 7 days | Assigned contributor → Track maintainer | Private GitHub advisory |

### Escalation Contacts

| Role | Responsibility | How to Reach |
|---|---|---|
| Repository Owner | Final escalation for all critical/high findings | GitHub Security Advisory |
| Backend Track Maintainer | Backend API, indexer, and auth security issues | GitHub Security Advisory |
| Soroban Track Maintainer | Smart contract and on-chain logic vulnerabilities | GitHub Security Advisory |
| DevOps Track Maintainer | CI/CD, secrets management, infrastructure issues | GitHub Security Advisory |

### Escalation Flow

1. **Discoverer** identifies a security-sensitive finding.
2. **Do not** create a public issue, comment, or PR referencing the vulnerability.
3. Open a [GitHub Security Advisory](https://github.com/kike-alt/DeWordle/security/advisories/new) with full details.
4. The advisory automatically notifies repository owners.
5. For urgent critical findings, additionally notify the relevant track maintainer through a private channel.
6. Maintain confidentiality until a fix is merged and disclosed.

### What NOT to Do

- Never open a public issue for security vulnerabilities
- Never commit exploit code to a public branch
- Never discuss specific vulnerabilities in public PR comments
- Never disclose details before a fix is available

### Contributor Responsibilities

- Review this escalation matrix before starting work on security-labeled issues.
- Report any observed security concerns immediately through the private channel.
- Do not attempt to fix security issues without maintainer coordination.
- Follow the principle of minimal disclosure — share only what is needed for triage.
