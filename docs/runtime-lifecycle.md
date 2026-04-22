# QERP Runtime Lifecycle

This document describes how the current QERP runtime behaves today.

## 1. Startup Lifecycle

### Backend startup
1. Spring Boot starts the application.
2. Flyway applies the schema migration for orders and portfolio tables.
3. The backend exposes REST endpoints for portfolio, orders, instruments, quotes, and candles.
4. The deterministic market-data service is available in memory for supported symbols.

### Frontend startup
1. Next.js starts the web application.
2. The browser loads the dashboard.
3. Browser requests for backend data go through the frontend proxy route at `/api/backend/*`.

## 2. Dashboard Load Lifecycle

On initial page load, the frontend requests the current portfolio and recent trading state.

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Next.js frontend
    participant Proxy as /api/backend proxy
    participant Backend as Spring Boot backend
    participant DB as PostgreSQL

    User->>Frontend: Open dashboard
    Frontend->>Proxy: GET /portfolio
    Frontend->>Proxy: GET /portfolio/positions
    Frontend->>Proxy: GET /orders?limit=10
    Proxy->>Backend: Forward requests
    Backend->>DB: Read portfolio and orders
    DB-->>Backend: Persisted state
    Backend-->>Proxy: JSON responses
    Proxy-->>Frontend: JSON responses
    Frontend-->>User: Render summary, positions, recent orders
```

## 3. Instrument Discovery Lifecycle

The current market exploration flow is deterministic and request-driven.

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Next.js frontend
    participant Proxy as /api/backend proxy
    participant Backend as Spring Boot backend
    participant Market as In-memory market data

    User->>Frontend: Search for symbol or company name
    Frontend->>Proxy: GET /instruments/search?q=...
    Proxy->>Backend: Forward request
    Backend->>Market: Search supported catalog
    Market-->>Backend: Matching instruments
    Backend-->>Frontend: Search results

    User->>Frontend: Select instrument
    Frontend->>Proxy: GET /market/quotes/{symbol}
    Frontend->>Proxy: GET /market/candles/{symbol}?interval=1D&limit=30
    Proxy->>Backend: Forward requests
    Backend->>Market: Load quote snapshot and candle series
    Market-->>Backend: Deterministic market data
    Backend-->>Frontend: Quote + candles
    Frontend-->>User: Render quote panel and chart panel
```

### Client-visible request rules

These are useful public constraints for anyone integrating with or evaluating the current API surface:
- instrument search requires a non-blank `q` parameter and currently supports `limit` values from `1` to `20`
- quote and candle endpoints return `404 NOT_FOUND` for unsupported symbols
- candle requests currently support only the `1D` interval and `limit` values from `1` to `60`

## 4. Order Submission Lifecycle

Order placement is handled synchronously inside the backend request path.

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Next.js frontend
    participant Proxy as /api/backend proxy
    participant Backend as Spring Boot backend
    participant Market as Market data service
    participant DB as PostgreSQL

    User->>Frontend: Submit paper order
    Frontend->>Proxy: POST /orders
    Proxy->>Backend: Forward request
    Backend->>Backend: Validate order payload
    Backend->>Market: Get reference price for symbol
    Market-->>Backend: Deterministic reference price
    Backend->>Backend: Simulate execution
    Backend->>DB: Save order record
    Backend->>DB: Update portfolio state and positions
    DB-->>Backend: Transaction committed
    Backend-->>Frontend: Created order response
    Frontend->>Proxy: Reload portfolio and orders
    Proxy->>Backend: GET portfolio + orders
    Backend->>DB: Read updated state
    Backend-->>Frontend: Updated JSON state
    Frontend-->>User: Show refreshed portfolio and recent orders
```

### Current execution behavior
- **Market orders** fill immediately at the current reference price.
- **Limit orders** are checked once when they are submitted.
- If a limit order crosses the reference price at submission time, it fills immediately.
- If it does not cross, it remains **`PENDING`**.
- A background market replay or auto-repricing loop is **not** implemented yet.

## 5. Order Cancellation Lifecycle

Pending orders can be cancelled through the backend API.

```mermaid
sequenceDiagram
    participant Client
    participant Backend as Spring Boot backend
    participant DB as PostgreSQL

    Client->>Backend: POST /orders/{orderId}/cancel
    Backend->>DB: Load existing order
    DB-->>Backend: Order record
    Backend->>Backend: Verify order is cancellable
    Backend->>DB: Update status to CANCELLED
    DB-->>Backend: Updated record
    Backend-->>Client: Cancellation response
```

## 6. Data Ownership by Runtime Stage

| Runtime stage | Source of truth |
| --- | --- |
| Supported instruments | In-memory market-data service |
| Quote snapshot | In-memory market-data service |
| Candle series | In-memory market-data service |
| Order lifecycle | PostgreSQL `orders` table |
| Portfolio headline state | PostgreSQL `portfolio_state` table |
| Open positions | PostgreSQL `portfolio_positions` table |

## 7. What Is Deliberately Missing Today

The current lifecycle does **not** include:
- login or user-specific sessions
- external broker order routing
- streaming market data subscriptions
- automated worker-triggered position changes
- background filling of pending orders based on later price moves

That keeps the present product slice small, deterministic, and easy to understand.