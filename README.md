# Shepherd's Rod Study Hub (Prototype)

This is a starter website you can run locally. It includes:
- Presentations hub (Courses in order + library view like gadsda: Videos / Audios / Downloads)
- Course pages (Modules + Lessons)
- Lesson page with a video player + lesson-scoped discussion chat
- Live page (Live status + player + live chat)
- Community channels (real-time chat rooms)
- Prototype Admin page to toggle live status and set stream URL

## Requirements
- Node.js 18+ recommended

## Run locally
1) Open a terminal in this folder
2) Install dependencies:  
   npm install
3) Start:  
   npm start
4) Open:  
   http://localhost:3000

## Edit your course order + links
- Edit: `data/courses.json`
- For local media files:
  - Create `public/media/`
  - Put your files there (mp3/mp4/pptx)
  - Set URLs like: `/media/myfile.mp3` or `/media/slides.pptx`

## Live streaming (prototype)
- Go to Admin: `/admin.html`
- Turn on "Live now"
- Provide either:
  - HLS URL (.m3u8), OR
  - an embed URL (e.g., YouTube embed)

## Next upgrades (when you're ready)
- Real user accounts + roles (Admin/Presenter/Moderator/Member)
- Uploads + storage + CDN
- RTMP ingest (OBS) + HLS output (true "Go Live")
- Moderation tools, bans, reporting, and private groups
- Database persistence (Postgres), search, and analytics
