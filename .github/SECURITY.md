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

### Reporting Channels

1. **GitHub Private Vulnerability Reporting (Preferred when enabled)**:
   - If Private Vulnerability Reporting is active on this repository, navigate to the repository's **[Security](https://github.com/tufantabak-cloud/odi-pet/security)** tab.
   - If visible under **Vulnerabilities**, click **"Report a vulnerability"** to submit a private draft advisory directly to the maintainers.

2. **Official Support Channel (Direct Email Fallback)**:
   - If Private Vulnerability Reporting is not currently enabled, unavailable, or not visible in your GitHub view, please send your report directly to our official support email:
   - **Contact Email**: `destek@odi.pet`
   - **Subject Line**: Please include `[SECURITY VULNERABILITY]` in the subject line to ensure proper routing and prioritization.

> **Warning**  
> **Do NOT file a public issue or create a public discussion for suspected security vulnerabilities.** All reports must remain confidential until triage, validation, and remediation are completed.

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

- **Initial Acknowledgment**: We strive to review and acknowledge legitimate reports within a reasonable timeframe (typically within 48 to 72 business hours).
- **Triage & Validation**: We will assess the severity, verify the proof of concept, and keep you informed of our findings.
- **Remediation & Patching**: Once validated, we will develop, test, and deploy a fix to the production environment.
- **Coordinated Disclosure**: We will collaborate with the reporter to agree upon a coordinated disclosure timeline after the fix has been successfully deployed and verified.

---

## Responsible Disclosure & Research Guidelines

To ensure the safety of our users and the stability of the platform, security researchers must adhere to the following rules:

1. **Do not access, modify, or delete user data**: Only perform tests on accounts you own or synthetic test data created specifically for testing.
2. **Do not disrupt availability**: Refrain from executing attacks that could degrade service performance or cause outages for other users.
3. **Maintain confidentiality**: Give us a reasonable amount of time to remediate the vulnerability before sharing details publicly or with third parties.
4. **Comply with applicable laws**: Always act in good faith and comply with all applicable local and international laws.

---

## Safe Harbor

We support security research conducted in good faith and in full compliance with this policy. 

If your research satisfies all of the following conditions:
- It is strictly conducted in good faith and solely for the purpose of identifying and reporting vulnerabilities;
- It strictly adheres to the rules set out in this Security Policy (including avoiding privacy violations, destruction of data, and service disruption);
- It does not access, modify, exfiltrate, or retain any user or sensitive data;
- It complies with applicable laws and does not target third-party systems or infrastructure;

Then Odi.Pet will consider your research authorized, will not initiate civil litigation against you for your research activities, and will work collaboratively with you to resolve the reported issue. This policy does not grant blanket immunity or authorize activities outside the scope of good-faith vulnerability research.

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
