# QuickNotes API Design

The REST API the backend team should build for the real QuickNotes service. All requests and responses use JSON.

**Base URL:** `/api/v1`

**Authentication:** every endpoint except login requires the header `Authorization: Bearer <token>`. A user can only access their own notes and tags.

**Design rules**

- Resources are plural nouns (`/notes`, `/tags`); the HTTP method says the action.
- List endpoints are paginated with `?page=` and `?pageSize=`.
- Errors use the same JSON shape and a correct HTTP status code.

## Endpoints

| # | Method | Path | Description | Success status |
|---|---|---|---|---|
| 1 | POST | `/auth/login` | Log in with email and password and receive a token | 200 OK |
| 2 | GET | `/notes` | List the logged-in user's notes (supports `?page`, `?pageSize`, `?tag`, `?q`) | 200 OK |
| 3 | GET | `/notes/{id}` | Get one note by id | 200 OK |
| 4 | POST | `/notes` | Create a new note | 201 Created |
| 5 | PUT | `/notes/{id}` | Replace the title, body and tags of a note | 200 OK |
| 6 | DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| 7 | GET | `/tags` | List the logged-in user's tags | 200 OK |
| 8 | POST | `/notes/{id}/tags` | Add an existing tag to a note | 201 Created |

## Examples

### Create a note: `POST /notes`

Request body:

```json
{
  "title": "Team meeting",
  "body": "Agenda: roadmap, hiring, budget.",
  "tags": ["work"]
}
```

Response: `201 Created`, with the header `Location: /api/v1/notes/42`

```json
{
  "id": 42,
  "title": "Team meeting",
  "body": "Agenda: roadmap, hiring, budget.",
  "tags": ["work"],
  "userId": 7,
  "createdAt": "2026-10-12T09:30:00Z",
  "updatedAt": "2026-10-12T09:30:00Z"
}
```

Rules: `title` is required and at most 100 characters; `body` is optional.

### List notes: `GET /notes?page=1&pageSize=2`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": 42,
      "title": "Team meeting",
      "body": "Agenda: roadmap, hiring, budget.",
      "tags": ["work"],
      "createdAt": "2026-10-12T09:30:00Z"
    },
    {
      "id": 41,
      "title": "Buy milk",
      "body": "",
      "tags": ["personal"],
      "createdAt": "2026-10-11T18:05:00Z"
    }
  ],
  "page": 1,
  "pageSize": 2,
  "total": 134
}
```

## Error format

Every error returns the same body shape:

```json
{
  "error": {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "Note 9999 does not exist"
  }
}
```

## Error status codes

| Status | Meaning | When it happens (example) |
|---|---|---|
| 400 Bad Request | The request is invalid | `POST /notes` with an empty title or a title over 100 characters |
| 401 Unauthorized | Not logged in, or the token is missing, invalid or expired | `GET /notes` with no `Authorization` header |
| 403 Forbidden | Logged in, but not allowed to access this resource | `GET /notes/57` when note 57 belongs to a different user |
| 404 Not Found | The resource does not exist | `GET /notes/9999` when no note has that id |
| 500 Internal Server Error | An unexpected failure on the server | The database is unreachable while saving a note |

### Example error bodies

400 Bad Request:

```json
{
  "error": {
    "status": 400,
    "code": "VALIDATION_ERROR",
    "message": "title is required and must be 100 characters or fewer"
  }
}
```

401 Unauthorized:

```json
{
  "error": {
    "status": 401,
    "code": "UNAUTHORIZED",
    "message": "Missing or expired token"
  }
}
```

403 Forbidden:

```json
{
  "error": {
    "status": 403,
    "code": "FORBIDDEN",
    "message": "You do not have access to this note"
  }
}
```

404 Not Found:

```json
{
  "error": {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "Note 9999 does not exist"
  }
}
```

500 Internal Server Error:

```json
{
  "error": {
    "status": 500,
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong on our side. Please try again later."
  }
}
```
