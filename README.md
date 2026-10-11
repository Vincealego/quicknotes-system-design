# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two halves: a small API client that proves the front end can talk to an API (using the JSONPlaceholder practice API), and three design documents the backend team will use to build the real service.

## What the API client does

- **Load notes (GET):** fetches 10 notes and shows each title and body
- **Create a note (POST):** validates the title (required, max 100 characters), sends the note and adds the result to the top of the list
- **Delete a note (DELETE):** removes a note after the server confirms
- Shows loading, success, error and empty states, and disables buttons while a request is running
- All user text is inserted with `textContent`, never `innerHTML`

JSONPlaceholder is a practice API: it accepts create and delete requests but does not store anything, so created and deleted notes are not remembered after you reload the notes.

## How to run the API client

1. Clone the repository:
   ```
   git clone https://github.com/Vincealego/quicknotes-system-design
   cd quicknotes-system-design
   ```
2. Open the folder in VS Code.
3. Right-click `index.html` and choose **Open with Live Server** (or double-click `index.html`).
4. Click **Load notes**. An internet connection is needed because the client calls `https://jsonplaceholder.typicode.com/posts`.

No installation or build step is needed.

## Design documents

- [API design](docs/api-design.md): endpoints, request and response examples, and error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, queries, indexes and the SQL vs NoSQL decision
- [Architecture](docs/architecture.md): requirements, load estimates, diagram, request flows, trade-offs and failure handling

## What I learned

- How to talk to an API with `fetch`, `async / await` and `try / catch / finally`, and why every request should check `response.ok`.
- How to show loading, success, error and empty states and disable buttons during a request so users get clear feedback and cannot send duplicate requests.
- How to design a REST API with plural nouns, the right HTTP methods and the right status codes (such as 201, 204, 400, 401, 403 and 404).
- How a many-to-many relationship needs a join table, and how an index speeds up the queries that matter most.
- How to estimate load (reads and writes per second, storage per year) and use it to justify a CDN, cache, read replica and queue, and how to avoid single points of failure.
