
const API = "";

// Load and display all events
async function loadEvents() {
    try {
        const response = await fetch(`${API}/events`);
        const events = await response.json();

        document.getElementById("totalEvents").textContent = events.length;

        displayEvents(events, "eventsContainer");
    } catch (error) {
        document.getElementById("eventsContainer").innerHTML =
            "<p>Unable to connect to ChromaDB. Please start the backend.</p>";
    }
}


// Display event cards
function displayEvents(events, containerId) {
    const container = document.getElementById(containerId);

    if (!events || events.length === 0) {
        container.innerHTML = "<p>No events found.</p>";
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="event-card">
            <span class="event-tag">${event.event_id}</span>
            <h3>${escapeHTML(event.name)}</h3>
            <p>📍 ${escapeHTML(event.location)}</p>
            <p>${escapeHTML(event.description)}</p>
            <div class="event-price">₹${event.price}</div>

            <div class="card-actions">
                <button class="edit-button"
                    onclick="editEvent('${event.event_id}')">
                    Edit
                </button>

                <button class="delete-button"
                    onclick="deleteEvent('${event.event_id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join("");
}


// Prevent event text from being treated as HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// Show the add event form
function showAddForm() {
    document.getElementById("eventForm").classList.remove("hidden");
    document.getElementById("formTitle").textContent = "Add New Event";

    document.getElementById("eventId").disabled = false;

    document.getElementById("eventId").value = "";
    document.getElementById("eventName").value = "";
    document.getElementById("eventLocation").value = "";
    document.getElementById("eventPrice").value = "";
    document.getElementById("eventDescription").value = "";

    document.getElementById("eventForm").dataset.mode = "add";
}


// Hide the event form
function hideForm() {
    document.getElementById("eventForm").classList.add("hidden");
}


// Save a new event or update an existing one
async function saveEvent() {
    const event = {
        event_id: document.getElementById("eventId").value.trim(),
        name: document.getElementById("eventName").value.trim(),
        location: document.getElementById("eventLocation").value.trim(),
        price: Number(document.getElementById("eventPrice").value),
        description: document.getElementById("eventDescription").value.trim()
    };

    if (!event.event_id || !event.name || !event.location ||
        !event.description || document.getElementById("eventPrice").value === "" ||
        !Number.isFinite(event.price) || event.price < 0) {
        alert("Please enter valid details in all fields.");
        return;
    }

    const mode = document.getElementById("eventForm").dataset.mode;

    const editingId = document.getElementById("eventForm").dataset.editId;

    const url = mode === "edit"
        ? `${API}/events/${encodeURIComponent(editingId)}`
        : `${API}/events`;

    const method = mode === "edit" ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(event)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Operation failed");
        }

        alert(result.message);
        hideForm();
        loadEvents();

    } catch (error) {
        alert(error.message);
    }
}


// Load event details into the form for editing
async function editEvent(eventId) {
    try {
        const response = await fetch(`${API}/events`);
        const events = await response.json();

        const event = events.find(item => item.event_id === eventId);

        if (!event) {
            alert("Event not found");
            return;
        }

        document.getElementById("eventForm").classList.remove("hidden");
        document.getElementById("formTitle").textContent = "Update Event";

        document.getElementById("eventId").value = event.event_id;
        document.getElementById("eventId").disabled = true;

        document.getElementById("eventName").value = event.name;
        document.getElementById("eventLocation").value = event.location;
        document.getElementById("eventPrice").value = event.price;
        document.getElementById("eventDescription").value = event.description;

        document.getElementById("eventForm").dataset.mode = "edit";
        document.getElementById("eventForm").dataset.editId = eventId;

        document.getElementById("manage").scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {
        alert("Unable to load event details");
    }
}


// Delete an event
async function deleteEvent(eventId) {
    if (!confirm("Are you sure you want to delete this event?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API}/events/${encodeURIComponent(eventId)}`,
            { method: "DELETE" }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Delete failed");
        }

        alert(result.message);
        loadEvents();

    } catch (error) {
        alert(error.message);
    }
}


// Search events by meaning using ChromaDB
async function searchEvents() {
    const query = document.getElementById("searchInput").value.trim();

    if (!query) {
        alert("Please enter something to search.");
        return;
    }

    try {
        const response = await fetch(`${API}/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ query: query })
        });

        const results = await response.json();

        if (!response.ok) {
            throw new Error(results.detail || "Search failed");
        }

        displayEvents(results, "searchResults");

    } catch (error) {
        alert(error.message);
    }
}


// Filter events using ChromaDB metadata
async function filterEvents() {
    const maxPrice = document.getElementById("maxPrice").value;

    if (maxPrice === "" || !Number.isFinite(Number(maxPrice)) ||
        Number(maxPrice) < 0) {
        alert("Enter a valid maximum price.");
        return;
    }

    try {
        const response = await fetch(
            `${API}/filter?max_price=${encodeURIComponent(maxPrice)}`
        );

        const results = await response.json();

        if (!response.ok) {
            throw new Error(results.detail || "Filter failed");
        }

        displayEvents(results, "filterResults");

    } catch (error) {
        alert(error.message);
    }
}


// Load events when the page opens
loadEvents();
