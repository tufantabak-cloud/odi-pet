# OPOS Phase 5 — Governance Overview

## Executive Purpose
This document defines the official governance framework for the **Odi.Pet Corporate Illustration & Design System (OPOS)**. The objective is to enforce architectural purity, zero-regression asset protection, strict design token compliance, and automated CI/CD guardrails.

## Core Governance Pillars
1. **Permanent Read-Only Frozen Assets:** `/public/brand/`, `/public/brand/logos/`, `/public/brand/illustrations/` are immutable.
2. **Single Component Entry Point:** All illustration rendering must strictly use `<Illustration id="..." />` or `<EmptyState illustrationId="..." />`.
3. **Automated CI Enforcement:** GitHub Actions and architecture guards block unapproved asset modifications or non-compliant inline graphics.
4. **Design Token Hierarchy:** Montserrat font, official color tokens, 16px corner radius, and glassmorphism styling are non-negotiable.
