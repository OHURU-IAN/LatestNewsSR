# Shepherd's Rod Study Hub

A learning platform prototype. It serves ordered courses (course → module → lesson) with video, audio and slide media. It adds **real-time chat** for each lesson and community channel, and a live-stream page an admin can switch on and off.

![Node.js](https://img.shields.io/badge/Node.js_18+-339933?logo=nodedotjs&logoColor=fff)
![Express](https://img.shields.io/badge/Express-000?logo=express&logoColor=fff)
![WebSockets](https://img.shields.io/badge/WebSockets-ws-010101)
![JavaScript](https://img.shields.io/badge/JavaScript_(ESM)-F7DF1E?logo=javascript&logoColor=000)

## Features

- **Structured courses:** content lives in `data/courses.json`, so the course outline can change without code changes.
- **Lesson player:** plays uploaded MP4 files or embedded players (such as YouTube).
- **Real-time chat:** a WebSocket room for each lesson, for community channels and for the live page. New joiners receive recent history.
- **Live streaming:** an admin page toggles "live now" and sets an HLS or embed URL. The change is pushed straight to connected viewers over WebSockets.
- **XSS protection:** all user-supplied chat text and media URLs are HTML-escaped before rendering.

## Architecture

```
Browser (static HTML + vanilla JS)
   │  REST: GET /api/courses, GET /api/live/status, POST /api/live/update
   │  WS:   /ws  { type: "join" | "message" }  →  { type: "history" | "message" | "live_status" }
   ▼
server.js (Express + ws on one HTTP server)
   ├── data/courses.json   course catalogue (read on request)
   ├── data/live.json      live-stream state (persisted to disk)
   └── in-memory Map       per-room chat history, capped at 200 messages per room
```

A single `http.Server` serves the Express app and the WebSocket server, so both use the same port.
Messages are routed by room. `broadcast()` sends only to clients that joined that room, except live-status updates, which go to every client.

## Quick start

```bash
npm install
npm start          # http://localhost:3000  (set PORT to change)
```

| Page | Path |
| --- | --- |
| Home | `/` |
| Presentations library | `/presentations.html` |
| Course / lesson | `/course.html?course=<id>`, `/lesson.html?course=<id>&…` |
| Live | `/live.html` |
| Community chat | `/community.html` |
| Admin (live controls) | `/admin.html` |

### Editing content

- Courses, modules and lessons: edit `data/courses.json`.
- Local media: put files in `public/media/` and reference them as `/media/<file>`.

## Known limitations

This is a prototype. These are deliberate gaps, listed so they can be tracked:

- `/admin.html` and `POST /api/live/update` have **no authentication** yet.
- Chat history is in memory and is lost on restart. Usernames are self-declared.
- Content storage is JSON on disk rather than a database.

## Roadmap

- Accounts and roles (admin, presenter, moderator, member), with auth on the admin endpoints
- Persist chat and content in PostgreSQL
- Rate limiting and moderation tools for chat
- RTMP ingest from OBS with HLS output for native "Go Live"
- Automated tests for the WebSocket protocol and REST endpoints
