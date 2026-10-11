// ---------- Select elements ----------
const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");
const notesList = document.querySelector("#notes-list");

const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;

let notes = [];
let nextKey = 1; // unique key for each note shown on the page
let busy = false;

// ---------- Helpers ----------
function makeNote(data) {
  return { key: nextKey++, id: data.id, title: data.title, body: data.body };
}

function setStatus(message, type) {
  statusText.textContent = message;
  statusText.className = type || "";
}

// Disables every button while a request is running
function setBusy(isBusy) {
  busy = isBusy;
  loadBtn.disabled = isBusy;
  submitBtn.disabled = isBusy;
  document.querySelectorAll(".delete-btn").forEach(function (button) {
    button.disabled = isBusy;
  });
}

// ---------- One reusable request function ----------
async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { status: response.status, data: data };
}

// ---------- Draw the list (title and body use textContent only) ----------
function render() {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.classList.add("empty");
    empty.textContent = "No notes to show yet. Load notes or add a new one.";
    notesList.appendChild(empty);
    return;
  }

  notes.forEach(function (note) {
    const item = document.createElement("li");
    item.classList.add("note");

    const title = document.createElement("h3");
    title.textContent = note.title;

    const body = document.createElement("p");
    body.textContent = note.body ? note.body : "(no body)";

    item.append(title, body);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.textContent = "Delete";
    deleteBtn.disabled = busy;
    deleteBtn.addEventListener("click", function () {
      deleteNote(note.key);
    });
    item.appendChild(deleteBtn);

    notesList.appendChild(item);
  });
}

// ---------- GET: load 10 notes ----------
async function loadNotes() {
  setBusy(true);
  setStatus("Loading notes...", "loading");

  try {
    const result = await request(`${API_URL}?_limit=10`);
    notes = result.data.map(makeNote);
    render();
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    setStatus(
      "Sorry, we couldn't load your notes. Please check your connection and try again.",
      "error"
    );
  } finally {
    setBusy(false);
  }
}

// ---------- POST: create a note ----------
async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation: title required, max 100 characters, body optional
  if (title === "") {
    setStatus("A title is required.", "error");
    return;
  }
  if (title.length > MAX_TITLE_LENGTH) {
    setStatus(
      `Title must be ${MAX_TITLE_LENGTH} characters or fewer (currently ${title.length}).`,
      "error"
    );
    return;
  }

  setBusy(true);
  setStatus("Creating note...", "loading");

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title: title, body: body, userId: 1 }),
    });

    notes.unshift(makeNote(result.data)); // newest note goes to the top
    render();
    titleInput.value = "";
    bodyInput.value = "";
    setStatus(
      `Note created (status ${result.status}, id ${result.data.id}).`,
      "success"
    );
  } catch (error) {
    setStatus("Sorry, we couldn't create your note. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

// ---------- DELETE: remove a note ----------
// JSONPlaceholder is a practice API: it ACCEPTS create and delete requests and
// replies with a success status, but it does NOT store anything. So:
//  - every note we create comes back with the same id (101), which is why each
//    note on the page also has its own unique "key" (a delete removes only the
//    note whose button was clicked, never every note with id 101);
//  - the page's own notes array is our working copy. We send the DELETE request,
//    and only when the server says OK do we remove the note from that array and
//    redraw the list;
//  - clicking "Load notes" again fetches the original 10 notes, so notes created
//    or deleted here are not remembered. A real backend would remember them.
async function deleteNote(key) {
  const note = notes.find(function (item) {
    return item.key === key;
  });
  if (!note) {
    return;
  }

  setBusy(true);
  setStatus("Deleting note...", "loading");

  try {
    const result = await request(`${API_URL}/${note.id}`, { method: "DELETE" });

    notes = notes.filter(function (item) {
      return item.key !== key;
    });
    render();
    setStatus(`Note ${note.id} deleted (status ${result.status}).`, "success");
  } catch (error) {
    setStatus("Sorry, we couldn't delete that note. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

// ---------- Events ----------
loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
