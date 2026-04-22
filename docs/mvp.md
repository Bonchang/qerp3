# QERP Current Product Scope

This document captures the current public-facing product scope.

## What QERP is today

QERP is a paper-trading web application foundation with a working end-to-end slice across frontend, backend, and database.

It currently supports:
- instrument search
- quote snapshots
- deterministic daily candle charts
- paper order create / get / list / cancel via the backend API
- portfolio summary and open positions
- a simple dashboard for order entry and portfolio visibility

## Current Product Characteristics

| Area | Current state |
| --- | --- |
| Product mode | Paper trading only |
| Market data | Small built-in demo market catalog |
| Persistence | PostgreSQL with Flyway migrations |
| Backend | Spring Boot 3 / Java 21 |
| Frontend | Next.js App Router / TypeScript |
| Quant worker | Placeholder only |
| Account model | Single shared portfolio state |

## What is not implemented yet

The following are intentionally outside the implemented product state today:
- authentication and user ownership
- real broker integration
- live market data streaming
- automated quant execution or signal generation
- production operations hardening beyond the current foundation

## Product Positioning

The current QERP codebase is best viewed as:
- a clean portfolio project for a deployable paper-trading app
- a strong vertical slice for future product expansion
- a transparent implementation that avoids overclaiming live-trading capability

## Related Docs

- [Architecture](architecture.md)
- [Runtime lifecycle](runtime-lifecycle.md)
- [Core ERD](erd.md)