
import os
import chromadb
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="EventSphere")

# Create persistent ChromaDB storage
client = chromadb.PersistentClient(path="./chroma_data")
events = client.get_or_create_collection(name="events")


# Event data format
class Event(BaseModel):
    event_id: str
    name: str
    location: str
    price: float
    description: str


# Add sample events only when the database is empty
if events.count() == 0:
    events.add(
        ids=["E101", "E102", "E103"],
        documents=[
            "Live music concert in Chennai featuring popular singers",
            "Artificial Intelligence technology conference for students",
            "Traditional cultural dance and music festival"
        ],
        metadatas=[
            {"name": "Music Concert", "location": "Chennai", "price": 800},
            {"name": "AI Conference", "location": "VIT Chennai", "price": 500},
            {"name": "Cultural Festival", "location": "Chennai", "price": 300}
        ]
    )


# GET: Display all events
@app.get("/events")
def get_events():
    data = events.get()
    result = []

    for i, event_id in enumerate(data["ids"]):
        result.append({
            "event_id": event_id,
            "name": data["metadatas"][i]["name"],
            "location": data["metadatas"][i]["location"],
            "price": data["metadatas"][i]["price"],
            "description": data["documents"][i]
        })

    return result


# POST: Add a new event
@app.post("/events")
def add_event(event: Event):
    if event.event_id in events.get()["ids"]:
        raise HTTPException(status_code=400, detail="Event ID already exists")

    events.add(
        ids=[event.event_id],
        documents=[event.description],
        metadatas=[{
            "name": event.name,
            "location": event.location,
            "price": event.price
        }]
    )

    return {"message": "Event added successfully"}


# PUT: Update an event
@app.put("/events/{event_id}")
def update_event(event_id: str, event: Event):
    if event_id not in events.get()["ids"]:
        raise HTTPException(status_code=404, detail="Event not found")

    events.update(
        ids=[event_id],
        documents=[event.description],
        metadatas=[{
            "name": event.name,
            "location": event.location,
            "price": event.price
        }]
    )

    return {"message": "Event updated successfully"}


# DELETE: Remove an event
@app.delete("/events/{event_id}")
def delete_event(event_id: str):
    if event_id not in events.get()["ids"]:
        raise HTTPException(status_code=404, detail="Event not found")

    events.delete(ids=[event_id])
    return {"message": "Event deleted successfully"}


# Semantic search using ChromaDB
@app.post("/search")
def search_events(data: dict):
    query = data.get("query", "")

    if not query.strip():
        raise HTTPException(status_code=400, detail="Enter a search query")

    results = events.query(
        query_texts=[query],
        n_results=min(5, events.count())
    )

    output = []
    for i, event_id in enumerate(results["ids"][0]):
        output.append({
            "event_id": event_id,
            "name": results["metadatas"][0][i]["name"],
            "location": results["metadatas"][0][i]["location"],
            "price": results["metadatas"][0][i]["price"],
            "description": results["documents"][0][i]
        })

    return output


# Metadata filtering
@app.get("/filter")
def filter_events(max_price: float = 1000):
    data = events.get(
        where={"price": {"$lte": max_price}}
    )

    output = []
    for i, event_id in enumerate(data["ids"]):
        output.append({
            "event_id": event_id,
            "name": data["metadatas"][i]["name"],
            "location": data["metadatas"][i]["location"],
            "price": data["metadatas"][i]["price"],
            "description": data["documents"][i]
        })

    return output


# Serve the frontend
app.mount("/", StaticFiles(directory="static", html=True), name="static")
