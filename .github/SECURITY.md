# Security Policy

## Supported Versions

Odi.Pet actively maintains and provides security updates for the current production release and the default branch. Older, unreleased, or custom development branches do not receive security backports.

| Version / Branch | Supported | Notes |
| :--- | :--- | :--- |
| `main` (Latest Production) | :white_check_mark: Yes | Current production release (`0.1.x`) and mainline branch |
| Older releases / Feature branches | :x: No | Please upgrade or rebase onto `main` |

---

## Reporting a Vulnerability

We take the security of Odi.Pet and our users' data with utmost seriousness. If you discover a potential security vulnerability, please report it responsibly.

### Primary Channel: GitHub Private Vulnerability Reporting

The preferred and most secure way to submit a vulnerability report is through GitHub's built-in **Private Vulnerability Reporting** mechanism:

1. Navigate to the repository's **[Security](https://github.com/tufantabak-cloud/odi-pet/security)** tab.
2. Under **Vulnerabilities**, click **"Report a vulnerability"** to open a private draft advisory.
3. Provide the details of the issue following the guidelines below.

> **Warning**  
> **Do NOT file a public issue or create a public discussion for suspected security vulnerabilities.** All reports must remain confidential until triage and remediation are completed.

### Alternative Channel

If you are unable to use GitHub Private Vulnerability Reporting, you can reach out via our official support channel:
- **Support Email**: `destek@odi.pet` *(Please specify `[SECURITY VULNERABILITY]` in the subject line)*

---

## What to Include in Your Report

To help us investigate and triage your report efficiently, please include as much relevant detail as possible:

- **Summary**: A clear, concise explanation of the nature and severity of the vulnerability.
- **Affected Component**: The specific URL, endpoint, page, or service affected.
- **Steps to Reproduce**: Step-by-step instructions that allow our team to reproduce the behavior.
- **Proof of Concept (PoC)**: Minimal code, script, or screenshots demonstrating the issue.
- **Impact Analysis**: An assessment of what an attacker could achieve (e.g., unauthorized data access, privilege escalation).
- **Suggested Remediation**: Any recommended fix or workaround, if available (optional).

> **Important**  
> **Never include actual user data, private medical records, live production tokens, or sensitive credentials in your report or PoC.** Use test accounts and synthetic data exclusively.

---

## Response & Triage Timeline

Our security and engineering team is committed to addressing reported issues in a timely and structured manner:

- **Initial Acknowledgment**: We strive to review and acknowledge all legitimate reports within a reasonable timeframe (typically within 48 to 72 business hours).
- **Triage & Validation**: We will assess the severity, verify the proof of concept, and keep you informed of our findings.
- **Remediation & Patching**: Once validated, we will develop, test, and deploy a fix to the production environment.
- **Coordinated Disclosure**: We will collaborate with the reporter to agree upon a coordinated disclosure date after the fix has been successfully deployed and verified.

---

## Responsible Disclosure & Research Guidelines

To ensure the safety of our users and the stability of the platform, we ask security researchers to adhere to the following rules:

1. **Do not access, modify, or delete user data**: Only perform tests on accounts you own or synthetic test data created specifically for testing.
2. **Do not disrupt availability**: Refrain from executing attacks that could degrade service performance or cause outages for other users.
3. **Maintain confidentiality**: Give us a reasonable amount of time to remediate the vulnerability before sharing details publicly or with third parties.
4. **Comply with applicable laws**: Always act in good faith and avoid violating relevant data protection and privacy regulations.

---

## Safe Harbor

We consider security research conducted in accordance with this policy to be authorized and beneficial to our community. If you make a good-faith effort to comply with this policy during your security research:

- We will not pursue legal action against you regarding your discovery and research.
- We will work with you collaboratively to understand, validate, and resolve the reported issue.

---

## Out of Scope

The following findings and activities are strictly out of scope and do not qualify for security review:

- Denial of Service (DoS / DDoS) attacks or rate-limiting tests.
- Social engineering, phishing, or vishing attacks directed at Odi.Pet employees, veterinarians, or users.
- Physical attacks against infrastructure, offices, or data centers.
- Automated vulnerability scanner reports without a validated, actionable Proof of Concept.
- Best-practice recommendations without a demonstrated, exploitable security vulnerability (e.g., missing optional HTTP headers that do not lead to a direct exploit).
- Issues related to third-party services, dependencies, or external hosting providers unless they directly impact Odi.Pet application code.
- Intentional data corruption or mass spamming of forms and notification channels.
