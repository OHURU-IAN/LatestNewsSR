import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({limit:"2mb"}));

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_PATH = path.join(__dirname, "data", "courses.json");
const STATE_PATH = path.join(__dirname, "data", "live.json");

function readCourses(){
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function readLive(){
  if(!fs.existsSync(STATE_PATH)){
    return { isLive:false, title:"", hlsUrl:"", embedUrl:"" };
  }
  try{
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
  }catch(e){
    return { isLive:false, title:"", hlsUrl:"", embedUrl:"" };
  }
}

function writeLive(state){
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

app.get("/api/courses", (req,res)=>{
  res.json(readCourses());
});

app.get("/api/live/status", (req,res)=>{
  res.json(readLive());
});

app.post("/api/live/update", (req,res)=>{
  const s = readLive();
  const next = {
    isLive: !!req.body.isLive,
    title: String(req.body.title || ""),
    hlsUrl: String(req.body.hlsUrl || ""),
    embedUrl: String(req.body.embedUrl || "")
  };
  writeLive(next);
  // Broadcast to connected clients
  broadcast({type:"live_status", ...next});
  res.json({ok:true});
});

app.use(express.static(PUBLIC_DIR));

const server = http.createServer(app);

// --- WebSocket chat ---
const wss = new WebSocketServer({ server, path: "/ws" });

// In-memory message history per room (prototype)
const history = new Map(); // room -> [{user,text,ts,room}]
const MAX_PER_ROOM = 200;

function pushHistory(room, msg){
  const arr = history.get(room) || [];
  arr.push(msg);
  if(arr.length > MAX_PER_ROOM) arr.splice(0, arr.length - MAX_PER_ROOM);
  history.set(room, arr);
}

function broadcast(obj, room=null){
  const s = JSON.stringify(obj);
  for(const client of wss.clients){
    if(client.readyState !== 1) continue;
    if(room && client._room !== room) continue;
    client.send(s);
  }
}

wss.on("connection", (ws)=>{
  ws._room = null;
  ws._user = "Guest";

  ws.on("message", (buf)=>{
    let msg;
    try{ msg = JSON.parse(buf.toString("utf-8")); }
    catch(e){ return; }

    if(msg.type === "join"){
      ws._room = String(msg.room || "general");
      ws._user = String(msg.user || "Guest");
      const arr = history.get(ws._room) || [];
      ws.send(JSON.stringify({type:"history", room: ws._room, messages: arr}));
      // also send live status if in live room
      if(ws._room === "live"){
        ws.send(JSON.stringify({type:"live_status", ...readLive()}));
      }
      return;
    }

    if(msg.type === "message"){
      const room = String(msg.room || ws._room || "general");
      const out = {
        type:"message",
        room,
        user: String(msg.user || ws._user || "Guest"),
        text: String(msg.text || ""),
        ts: Date.now()
      };
      pushHistory(room, out);
      broadcast(out, room);
      return;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>{
  console.log(`Server running: http://localhost:${PORT}`);
});
