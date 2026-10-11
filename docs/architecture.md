# QuickNotes Architecture

QuickNotes is moving from a browser-only app to an online service for 1 million users.

## 1. Requirements

### Functional requirements

- Users can sign up and log in
- Users can create, view, edit and delete their own notes
- Notes have a title (required, max 100 characters) and an optional body
- Users can tag notes and filter or search them
- Notes are available from any device
- Users only ever see their own notes

### Non-functional requirements

- **Availability:** the service should be up at least 99.9% of the time
- **Performance:** listing notes responds in under 300 ms for most requests
- **Scalability:** supports 1 million users and can grow by adding servers
- **Durability:** a saved note is never lost (backups and replication)
- **Security:** passwords are hashed, traffic uses HTTPS, and users are isolated from each other
- **Consistency:** a user sees their own new note immediately after saving it

## 2. Load estimate for 1 million users

**Assumptions:** 1,000,000 registered users; 20% active each day; each active user makes 40 read requests per day (listing and opening notes) and creates 5 notes per day; one note with its metadata is about 3 KB; peak traffic is 5 times the average; a day has 86,400 seconds.

- Daily active users: 1,000,000 x 20% = **200,000**
- Reads per day: 200,000 x 40 = 8,000,000, so **about 93 reads per second** on average and **about 463 per second** at peak
- Writes per day: 200,000 x 5 = 1,000,000, so **about 12 writes per second** on average and **about 58 per second** at peak
- Storage per day: 1,000,000 notes x 3 KB = 3 GB
- **Storage per year:** 3 GB x 365 = about **1.1 TB** (before indexes and replicas)

| Measure | Average | Peak (5x) |
|---|---|---|
| Reads per second | 93 | 463 |
| Writes per second | 12 | 58 |

The system is **read-heavy** (about 8 reads for every write), so the design focuses on caching and read replicas.

## 3. Architecture diagram

```
                         +----------+
                         |  Client  |   (browser / mobile app)
                         +----------+
                               |
                               v
                         +----------+
                         |   DNS    |   (name -> address)
                         +----------+
                               |
                               v
                         +----------+
                         |   CDN    |   (static files: HTML, CSS, JS)
                         +----------+
                               |  (API calls)
                               v
                      +-----------------+
                      |  Load Balancer  |
                      +-----------------+
                         |      |      |
                         v      v      v
                    +-------+ +-------+ +-------+
                    | App   | | App   | | App   |
                    | srv 1 | | srv 2 | | srv 3 |
                    +-------+ +-------+ +-------+
                      |  |                  |
          read first  |  | writes           | background jobs
                      v  |                  v
                 +---------+  |         +---------+       +--------+
                 |  Cache  |  |         |  Queue  | ----> | Worker |
                 +---------+  |         +---------+       +--------+
                      |       |                                |
              (miss)  |       v                                |
                      |  +-----------+                         |
                      |  |  Primary  | <-----------------------+
                      |  |  Database |   (worker saves results)
                      |  +-----------+
                      |       |
                      |       | replication
                      v       v
                    +--------------+
                    | Read Replica |
                    +--------------+
```

## 4. Components (one sentence each)

- **Client:** The browser or mobile app that users see and use, and which sends all requests to the API.
- **DNS:** Turns the readable name (such as quicknotes.example) into the address of our service so users can find it.
- **CDN:** Delivers the app's static files from servers close to each user, which makes pages load faster and removes that traffic from our own servers.
- **Load balancer:** Spreads incoming requests across the app servers and stops sending traffic to any server that has failed.
- **App servers:** Run the API logic (login, create, list, delete) and can be added or removed easily because they keep no data of their own.
- **Cache:** Keeps frequently requested data such as a user's recent notes in fast memory, so most reads never reach the database.
- **Primary database:** Stores all users, notes and tags, and handles every write so the data stays consistent.
- **Read replica:** Holds a live copy of the primary database and answers read queries, reducing the load on the primary and acting as a standby if it fails.
- **Queue:** Holds background jobs (such as updating the search index or sending reminder emails) so a request can finish without waiting for slow work.
- **Worker:** Takes jobs from the queue and runs them in the background, and more workers can be added when the queue grows.

## 5. Request flows

### GET /notes (list notes)

1. The client sends `GET /api/v1/notes` with its login token.
2. DNS resolves the service name and the request reaches the **load balancer**.
3. The load balancer sends it to one healthy **app server**.
4. The app server checks the token to find out who the user is.
5. It looks for that user's notes in the **cache**.
6. **Cache hit:** the notes are returned immediately (go to step 9).
7. **Cache miss:** the app server queries the **read replica** for that user's newest notes.
8. The app server stores the result in the cache for a short time (for example 60 seconds).
9. The app server returns `200 OK` with the JSON list of notes to the client.

### POST /notes (create a note)

1. The client sends `POST /api/v1/notes` with the title, body and token.
2. The request passes through the **load balancer** to an **app server**.
3. The app server checks the token and validates the data (title required, at most 100 characters). Invalid data gets `400 Bad Request`.
4. The app server saves the note in the **primary database** (writes never go to the replica).
5. The app server clears that user's cached note list so the next read is fresh.
6. The app server puts a background job on the **queue** (for example "update search index").
7. The app server returns `201 Created` with the new note, without waiting for the job.
8. A **worker** takes the job from the queue and does the slow work in the background.
9. The primary database copies the new note to the **read replica**.

## 6. Trade-offs

- **Cache: speed vs fresh data.** The cache makes reads fast and protects the database, but cached data can be slightly out of date. We accept this because the cache is cleared when a user writes, so people always see their own latest changes.
- **Read replica: scale vs replication lag.** The replica lets us serve many more reads, but it copies data a moment after the primary, so a read straight after a write could miss it. We solve this by reading a user's own recent data from the primary or the cache.
- **Queue and worker: fast responses vs eventual results.** Background jobs keep requests quick and absorb traffic spikes, but their results (such as search updates) appear a few seconds later and there are more parts to monitor.
- **SQL database: consistency vs write scaling.** A single primary keeps data correct and simple, but all writes go through one machine. At 58 writes per second at peak this is far below its limit, and we can split the data across several databases later if needed.

## 7. Avoiding single points of failure

- **DNS:** use a managed DNS service that runs on many servers worldwide.
- **CDN:** it already runs on many edge locations, so no single location matters.
- **Load balancer:** run it as a managed, redundant pair across availability zones so one failure does not stop traffic.
- **App servers:** run three or more in different availability zones; the load balancer removes any that fail, and the app servers store no data, so none is special.
- **Cache:** run a cluster with a standby copy, and if the cache is down the app still works by reading from the database, only more slowly.
- **Database:** the read replica can be promoted to primary automatically if the primary fails, and regular backups protect against data loss.
- **Queue:** use a managed, replicated queue so waiting jobs are not lost, and run several workers so one failure only slows processing.
