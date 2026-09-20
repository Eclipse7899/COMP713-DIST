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
- Bun ts/js runtime
- Hono web framework
- Zod validation library

### Frontend
- React
- Typescript
- React Router
- Tailwind CSS

### Testing and Development
- Vitest testing framework
- Vite development server

### Tooling
- Git for version control
- Docker for containerization
- Oxlint (rust-based eslint drop-in) for code quality
- Oxfmt (rust-based prettier drop-in) for code formatting
- Mise for tooling and runtime management

## Architecture
The application follows a modern web architecture, with frontend and backend components communicating via a RESTful API.

Client → HTTP → Route → Handler → Service → Repository → Database

## Installation

### Prerequisites
- Bun
- Git
- Docker

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/Eclipse7899/COMP713-DIST.git
   cd COMP713-DIST
   ```
2. Install the required dependencies:
   ```bash
   bun install
   ```
   
3. Start the application
   ```bash
   docker-compose up -d
   ```

## Tests

### Backend Tests

```
cd backend
bun run test
```

## Api

Uses a RESTful API to manage food items and food types.

### Endpoints

The API is served under `/api`. Protected endpoints require:

```http
Authorization: Bearer <jwt>
```

#### Authentication

| Method | Endpoint             | Auth | Description              |
|--------|----------------------|------|--------------------------|
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
|--------|-----------------|--------------------------------------|
| `GET`  | `/api/users/me` | Get the currently authenticated user |

#### Food Types

| Method   | Endpoint        | Description                            |
|----------|-----------------|----------------------------------------|
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
|----------|------------------|------------------------------------------|
| `GET`    | `/api/items`     | List the authenticated user's food items |
| `POST`   | `/api/items`     | Add a food item to the inventory         |
| `PUT`    | `/api/items/:id` | Update an inventory item                 |
| `DELETE` | `/api/items/:id` | Delete an inventory item                 |

Food item request:

```json
{
  "foodId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "quantity": 2,
  "unit": "ITEM",
  "expiryDate": "2026-12-31"
}
```

`expiryDate` is optional and may be `null`. Supported units are `ITEM`,
`KG`, `G`, `L`, `ML`, and `PACK`.

The item endpoint supports these optional query parameters:

| Parameter    | Description                                         |
|--------------|-----------------------------------------------------|
| `contains`   | Filter by food name                                 |
| `categories` | Filter by category; may be supplied multiple times  |
| `sort`       | Sort by expiry date using `asc` or `desc`           |
| `expiryDate` | Return items expiring before the specified ISO date |

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
