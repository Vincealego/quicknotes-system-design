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

// ---------- Events ----------
loadBtn.addEventListener("click", loadNotes);
