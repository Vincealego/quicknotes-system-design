# QuickNotes Data Model

## Entities

### users

| Column | Type | Key / rules |
|---|---|---|
| id | INTEGER | Primary key |
| email | TEXT | Required, unique |
| password_hash | TEXT | Required (never store the plain password) |
| name | TEXT | Required |
| created_at | TEXT (timestamp) | Required, defaults to now |

### notes

| Column | Type | Key / rules |
|---|---|---|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users(id), required |
| title | TEXT | Required, max 100 characters |
| body | TEXT | Optional |
| created_at | TEXT (timestamp) | Required, defaults to now |
| updated_at | TEXT (timestamp) | Required, defaults to now |

### tags

| Column | Type | Key / rules |
|---|---|---|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users(id), required |
| name | TEXT | Required; unique for each user |

### note_tags (join table)

| Column | Type | Key / rules |
|---|---|---|
| note_id | INTEGER | Foreign key to notes(id), part of the primary key |
| tag_id | INTEGER | Foreign key to tags(id), part of the primary key |

The primary key of `note_tags` is the pair `(note_id, tag_id)`, which also stops the same tag being added to a note twice.

## Relationships

- **users to notes: one-to-many.** One user owns many notes; each note belongs to exactly one user (`notes.user_id`).
- **users to tags: one-to-many.** One user creates many tags; each tag belongs to one user (`tags.user_id`).
- **notes to tags: many-to-many.** A note can have many tags (work, urgent), and a tag can be on many notes. A table cannot hold a list in one cell, so the join table `note_tags` turns this into two one-to-many links: one note has many `note_tags` rows, and one tag has many `note_tags` rows.

## CREATE TABLE statements

Written in SQLite syntax so they can be run in an online SQLite playground.

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    title      TEXT NOT NULL CHECK (length(title) <= 100),
    body       TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name    TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id INTEGER NOT NULL,
    tag_id  INTEGER NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)  REFERENCES tags (id)  ON DELETE CASCADE
);
```

## Example queries

**1. A user's notes, newest first (the main list screen):**

```sql
SELECT id, title, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 20;
```

**2. All of a user's notes that have the tag "work" (uses JOINs):**

```sql
SELECT n.id, n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 1 AND t.name = 'work';
```

**3. How many notes each tag has (uses LEFT JOIN and GROUP BY):**

```sql
SELECT t.name, COUNT(nt.note_id) AS note_count
FROM tags t
LEFT JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 1
GROUP BY t.id, t.name;
```

## Indexes

```sql
CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);
CREATE INDEX idx_note_tags_tag_id ON note_tags (tag_id);
```

**Reason for `idx_notes_user_created`:** almost every request lists one user's newest notes (query 1). Without an index the database would scan every note of every user. With this index it jumps straight to that user's rows, already in date order, which matters when there are hundreds of millions of notes.

**Reason for `idx_note_tags_tag_id`:** the primary key `(note_id, tag_id)` is fast for "tags of a note" but not for "notes with a tag" (queries 2 and 3), which look up by `tag_id`.

## SQL or NoSQL?

I choose **SQL** (for example PostgreSQL). QuickNotes data is clearly structured and relational: users own notes and tags, and notes and tags link many-to-many, which is exactly what joins and foreign keys are built for. A relational database enforces the rules directly (unique emails, valid owners, no duplicate tags on a note) and supports transactions, so creating a note and its tags either fully succeeds or fully fails. The access patterns are simple and known in advance, so indexes handle them well, and a primary database with read replicas can serve 1 million users. A NoSQL document store would suit loosely structured data or a need to spread writes over many servers, but QuickNotes needs neither, and it would make tag queries and consistency harder.
