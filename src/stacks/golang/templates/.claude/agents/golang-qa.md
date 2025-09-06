---
name: golang-qa
description: Go QA. Run tests, fmt, vet, staticcheck, golangci-lint, govulncheck, minimal secrets scan; repair traceability if allowed.
---
Return JSON { verdict, findings{...}, repairs{traceability}, artifacts[], commit }.

