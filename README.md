# Stocked – Food Management System

> Developed by Eclipse7899 for AUT COMP713 - Individual Project

## Brief

Stocked is a food management system designed to help users keep track of food inventory and expiration dates.
The system allows users to add, update and delete food items and find items that are about to expire.

## Features

### Authentication

- User registration and login
- Password hashing and secure storage

### Food Items

- Adding new food items to the inventory
- Updating existing food items
- Track expiry dates and quantity of food items
- Deleting food items
- Viewing a list of all food items
- Separate users do not have access to each other's food items

### Food Types

- Categorizing food types by categories, fruits, vegetables, dairy, etc.
- Adding custom food types to the system
- Viewing a list of all food types
- Editing user-defined food types
- Deleting user-defined food types
- Separate users do not have access to each other's custom food types

## Tech Stack

### Database/Persistence

- PostgreSQL database
- Prisma ORM

### Backend

- Bun JavaScript/TypeScript runtime
- Hono web framework
- Zod validation library
- gRPC (protobuf) for communication with the Auth service

### Frontend

- React
- TypeScript
- React Router
- Tailwind CSS

### Testing and Development

- Bun's built-in test runner (`bun:test`)
- Testcontainers for integration tests
- Vite development server

### Tooling

- Git for version control
- Docker for containerization
- Oxlint (rust-based eslint drop-in) for code quality
- Oxfmt (rust-based prettier drop-in) for code formatting
- Mise for tooling and runtime management

## Architecture

The application follows a modern web architecture. The frontend is a React single-page application built with Vite and served by nginx, which also reverse-proxies `/api` requests to the backend. The frontend talks to the backend over a RESTful API and receives realtime inventory updates over a WebSocket.

Client → HTTP → Route → Handler → Service → Repository → Database

The backend is split into two services:

- **API** – the Hono REST API. It validates requests with Zod, applies
  authorisation, and handles food and inventory operations. It reads from and
  writes to PostgreSQL directly through Prisma.
- **Auth service** – a gRPC service that owns registration, login, password
  hashing, and JWT issuance. The API calls it over gRPC.

Each service owns its own PostgreSQL database, accessed through Prisma: the API
owns the food catalogue and inventory, while the auth service owns user
accounts. Two short-lived `db-init` containers apply each service's Prisma
migrations and seed the initial user and food catalogue before the other
services start.

Inventory changes (items and food types being created, updated, or deleted) are
pushed to a user's connected clients over a WebSocket, so the UI stays in sync
without polling.

## Installation

### Run Prerequisites

- Docker

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/Eclipse7899/COMP713-DIST.git
   cd COMP713-DIST
   ```

2. Start the application

   ```bash
   docker compose up -d
   ```

3. Open the application in your browser at `http://localhost`

## Tests

### Pre-requisites

- Bun
- Docker
- Protoc (Protobuf Compiler)

### Tests

```
bun generate
bun build:images
bun test
```

## Api

Uses a RESTful API to manage food items and food types, and a WebSocket endpoint for realtime inventory updates.

### Endpoints

The API is served under `/api`. Protected endpoints require:

```http
Authorization: Bearer <jwt>
```

#### Authentication

| Method | Endpoint             | Auth | Description              |
| ------ | -------------------- | ---- | ------------------------ |
| `POST` | `/api/auth/register` | No   | Create a user account    |
| `POST` | `/api/auth/login`    | No   | Log in and receive a JWT |

Register request:

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

Login request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Users

| Method | Endpoint        | Description                          |
| ------ | --------------- | ------------------------------------ |
| `GET`  | `/api/users/me` | Get the currently authenticated user |

#### Food Types

| Method   | Endpoint        | Description                            |
| -------- | --------------- | -------------------------------------- |
| `GET`    | `/api/food`     | List available food types for the user |
| `POST`   | `/api/food`     | Create a custom food type              |
| `PUT`    | `/api/food/:id` | Update a user-created food type        |
| `DELETE` | `/api/food/:id` | Delete a user-created food type        |

Food type request:

```json
{
  "name": "Apple",
  "category": "FRUIT"
}
```

Supported categories are `FRUIT`, `VEGETABLE`, `MEAT`, `DAIRY`,
`GRAINS`, `DRINKS`, `SNACKS`, `SAUCES`, `FROZEN`, and `OTHER`.

#### Food Items

| Method   | Endpoint         | Description                              |
| -------- | ---------------- | ---------------------------------------- |
| `GET`    | `/api/items`     | List the authenticated user's food items |
| `POST`   | `/api/items`     | Add a food item to the inventory         |
| `PUT`    | `/api/items/:id` | Update an inventory item                 |
| `DELETE` | `/api/items/:id` | Delete an inventory item                 |

Food item request:

```json
{
  "foodId": "m5x9w3r1t00000abcd1234ef",
  "quantity": 2,
  "unit": "ITEM",
  "expiryDate": "2026-12-31T00:00:00.000Z"
}
```

`foodId` is the CUID2 identifier of a food the user can access. `expiryDate`
is optional and may be `null`; when provided it must be a full ISO 8601
datetime. Supported units are `ITEM`, `KG`, `G`, `L`, `ML`, and `PACK`.

The item endpoint supports these optional query parameters:

| Parameter    | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| `contains`   | Filter by food name                                                 |
| `categories` | Filter by category; may be supplied multiple times                  |
| `sort`       | Sort by expiry date using `asc` or `desc`                           |
| `expiryDate` | Return items expiring on or before the specified ISO 8601 timestamp |

#### Realtime (WebSocket)

The API also exposes a WebSocket endpoint that streams inventory changes
(`item.created`, `item.updated`, `item.deleted`, `food.created`, `food.updated`,
`food.deleted`) to the authenticated user.

| Method | Endpoint        | Auth | Description                                       |
| ------ | --------------- | ---- | ------------------------------------------------- |
| `GET`  | `/api/ws/token` | Yes  | Issue a short-lived connection token              |
| `GET`  | `/api/ws`       | No*  | Open the WebSocket connection with `?token=<jwt>` |

\* The WebSocket handshake authenticates with the `token` query parameter
instead of the `Authorization` header, because browsers cannot set custom
headers on WebSocket connections.

## Known Issues or Limitations

- JWT tokens are basic, do not offer refresh tokens or revocation
- Integration tests rely on docker to create test containers

## Future Features

- Notifications for items nearing expiration
- Barcode scanning for easier item addition
- Visualization of inventory data such as charts or graphs

## AI usage disclaimer

This project was developed with the assistance of AI tools, including ChatGPT and GitHub Copilot

All generated artifacts were reviewed and modified to ensure standard and correctness.

### AI Assisted

- Unit and integration tests
- Readme elements
- UI components
- General code snippets and boilerplate code
- Debugging and troubleshooting

### Solely Human authored

- App idea
- Validation and error handling
- System architecture and design
- Core business logic
- Data modeling
- Database schema
- UI Concepts and Branding
