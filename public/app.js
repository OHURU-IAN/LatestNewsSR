const API = {
  base: "",
  async getJSON(path){
    const r = await fetch(path, {headers:{'Accept':'application/json'}});
    if(!r.ok) throw new Error(`GET ${path} failed (${r.status})`);
    return r.json();
  },
  async postJSON(path, body){
    const r = await fetch(path, {
      method:"POST",
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify(body ?? {})
    });
    if(!r.ok) throw new Error(`POST ${path} failed (${r.status})`);
    return r.json();
  }
};

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }

function clamp01(n){ return Math.max(0, Math.min(1, n)); }

function hexToRgb(hex){
  const raw = (hex ?? "").toString().trim().replace(/^#/, "");
  const normalized = raw.length === 3
    ? raw.split("").map(c=>c+c).join("")
    : raw;
  if(normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0,2), 16);
  const g = Number.parseInt(normalized.slice(2,4), 16);
  const b = Number.parseInt(normalized.slice(4,6), 16);
  if([r,g,b].some(Number.isNaN)) return null;
  return {r,g,b};
}

function rgbToHex(rgb){
  const to = (n)=> Math.round(n).toString(16).padStart(2, "0");
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`;
}

function mixToWhite(hex, amount){
  const rgb = hexToRgb(hex);
  if(!rgb) return null;
  const t = clamp01(amount);
  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * t,
    g: rgb.g + (255 - rgb.g) * t,
    b: rgb.b + (255 - rgb.b) * t
  });
}

function getUser(){
  let u = localStorage.getItem("sr_user");
  if(!u){
    u = `Guest${Math.floor(Math.random()*9000+1000)}`;
    localStorage.setItem("sr_user", u);
  }
  return u;
}
function setUser(name){
  localStorage.setItem("sr_user", name);
}

function setActiveNav(){
  const path = location.pathname.split("/").pop() || "index.html";
  qsa(".nav-links a").forEach(a=>{
    if(a.getAttribute("href") === path) a.classList.add("active");
  });
}

async function loadCourses(){
  return API.getJSON("/api/courses");
}

function escapeHTML(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function fmtTime(ts){
  try{
    const d = new Date(ts);
    return d.toLocaleString();
  }catch(e){
    return String(ts);
  }
}

function progressKey(courseId){ return `sr_progress_${courseId}`; }

function getProgress(courseId){
  try{ return JSON.parse(localStorage.getItem(progressKey(courseId)) || "{}"); }
  catch(e){ return {}; }
}
function setProgress(courseId, progress){
  localStorage.setItem(progressKey(courseId), JSON.stringify(progress || {}));
}

function markLessonComplete(courseId, lessonId){
  const p = getProgress(courseId);
  p[lessonId] = {done:true, ts: Date.now()};
  setProgress(courseId, p);
}

function isLessonComplete(courseId, lessonId){
  const p = getProgress(courseId);
  return !!(p[lessonId] && p[lessonId].done);
}

function courseCompletion(course){
  const courseId = course.id;
  let total = 0, done = 0;
  for(const m of course.modules){
    for(const l of m.lessons){
      total++;
      if(isLessonComplete(courseId, l.id)) done++;
    }
  }
  return {done, total, pct: total ? Math.round(done*100/total) : 0};
}

function setUserUI(){
  const user = getUser();
  const inp = qs("#userName");
  if(inp) inp.value = user;
  qsa("[data-user-label]").forEach(el=>{
    el.textContent = user;
  });
  const btn = qs("#userSave");
  if(btn && inp){
    btn.addEventListener("click", ()=>{
      const v = inp.value.trim();
      if(v.length < 2) return alert("Name too short.");
      setUser(v);
      setUserUI();
    });
  }
}

function initHeroSlider(root){
  const track = root.querySelector("[data-slider-track]");
  const slides = [...root.querySelectorAll("[data-slide]")];
  if(!track || !slides.length) return;

  const dotsWrap = root.querySelector("[data-slider-dots]");
  const prev = root.querySelector("[data-slider-prev]");
  const next = root.querySelector("[data-slider-next]");
  const autoMs = Number(root.dataset.auto || "0");
  let idx = 0;
  let timer;

  function go(n){
    idx = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    slides.forEach((s,i)=>s.classList.toggle("active", i === idx));
    if(dotsWrap){
      dotsWrap.querySelectorAll("button").forEach((btn,i)=>{
        btn.classList.toggle("active", i === idx);
      });
    }
  }

  function renderDots(){
    if(!dotsWrap) return;
    dotsWrap.innerHTML = "";
    slides.forEach((_,i)=>{
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = i === idx ? "active" : "";
      btn.setAttribute("aria-label", `Go to slide ${i+1}`);
      btn.addEventListener("click", ()=>{
        go(i);
        restartAuto();
      });
      dotsWrap.appendChild(btn);
    });
  }

  function restartAuto(){
    if(!autoMs || autoMs <= 0) return;
    clearTimeout(timer);
    timer = setTimeout(()=>{
      go(idx + 1);
      restartAuto();
    }, autoMs);
  }

  prev?.addEventListener("click", ()=>{ go(idx - 1); restartAuto(); });
  next?.addEventListener("click", ()=>{ go(idx + 1); restartAuto(); });
  root.addEventListener("pointerenter", ()=>clearTimeout(timer));
  root.addEventListener("pointerleave", restartAuto);

  renderDots();
  go(0);
  restartAuto();
}

function initCardSlider(root){
  const track = root.querySelector("[data-card-track]");
  if(!track) return;
  const prev = root.querySelector("[data-card-prev]");
  const next = root.querySelector("[data-card-next]");

  const step = ()=>{
    const first = track.querySelector(".mini-card");
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.getPropertyValue("column-gap") || styles.getPropertyValue("gap") || "14");
    return (first ? first.getBoundingClientRect().width : 240) + gap;
  };

  function scroll(dir){
    track.scrollBy({left: step() * dir, behavior:"smooth"});
  }

  prev?.addEventListener("click", ()=>scroll(-1));
  next?.addEventListener("click", ()=>scroll(1));
}

function initHeroCarousel(root){
  const scope = root.closest("[data-hero-scope]") || root.closest(".slider-hero") || root;
  const track = root.querySelector("[data-hero-track]");
  const slides = [...root.querySelectorAll("[data-hero-slide]")];
  if(!track || !slides.length) return;
  const total = slides.length;
  const prevBtns = root.querySelectorAll("[data-hero-prev]");
  const nextBtns = root.querySelectorAll("[data-hero-next]");
  const dotsWrap = root.querySelector("[data-hero-dots]");
  const progressValue = scope.querySelector("[data-progress-value]");
  const progressDotsWrap = scope.querySelector("[data-progress-dots]");
  const progressDots = [];
  const heroTitle = scope.querySelector(".hero-title");
  const heroSubtitle = scope.querySelector(".subtitle");
  const heroEyebrow = scope.querySelector(".eyebrow");
  const heroCta = scope.querySelector(".hero-cta");
  const autoMs = Number(root.dataset.auto || "0");
  let idx = 0;
  let timer;

  function syncHeroCopy(){
    const slide = slides[idx];
    if(!slide) return;
    const title = (slide.dataset.title || slide.querySelector("h3")?.textContent || "").trim();
    const subtitle = (slide.dataset.subtitle || slide.querySelector("p")?.textContent || "").trim();
    const eyebrow = (slide.dataset.eyebrow || "").trim();
    const ctaLabel = (slide.dataset.ctaLabel || "").trim();
    const ctaHref = (slide.dataset.ctaHref || "").trim();

    if(heroTitle && title) heroTitle.textContent = title;
    if(heroSubtitle && subtitle) heroSubtitle.textContent = subtitle;
    if(heroEyebrow && eyebrow) heroEyebrow.textContent = eyebrow;
    if(heroCta && ctaLabel) heroCta.textContent = ctaLabel;
    if(heroCta && ctaHref) heroCta.setAttribute("href", ctaHref);

    const accent = (slide.dataset.accent || "").trim();
    if(accent){
      const alt = (slide.dataset.accentAlt || mixToWhite(accent, 0.22) || accent).trim();
      scope.style.setProperty("--hero-accent", accent);
      scope.style.setProperty("--hero-accent-alt", alt);
    }

    const heroBg = (slide.dataset.heroBg || "").trim();
    if(heroBg){
      scope.style.setProperty("--hero-bg-image", `url('${heroBg}')`);
    }else{
      scope.style.setProperty("--hero-bg-image", "none");
    }
  }

  function updateActive(){
    slides.forEach((s,i)=>{
      const rel = (i - idx + total) % total;
      s.classList.toggle("active", rel === 0);
      s.classList.toggle("is-next", rel === 1);
      s.classList.toggle("is-next-2", rel === 2);
    });
    if(dotsWrap){
      dotsWrap.querySelectorAll("button").forEach((btn,i)=>{
        btn.classList.toggle("active", i === idx);
      });
    }
    if(progressValue) progressValue.textContent = (idx % total) + 1;
    if(progressDots.length){
      progressDots.forEach((d,i)=> d.classList.toggle("active", i === idx));
    }
    syncHeroCopy();
  }

  function go(n, animate=true){
    idx = (n + slides.length) % slides.length;
    updateActive();
    const offset = slides[idx]?.offsetLeft ?? 0;
    if(!animate){
      const prevTransition = track.style.transition;
      track.style.transition = "none";
      track.style.transform = `translateX(-${offset}px)`;
      track.getBoundingClientRect();
      track.style.transition = prevTransition || "";
    }else{
      track.style.transform = `translateX(-${offset}px)`;
    }
  }

  function buildDots(){
    if(!dotsWrap) return;
    dotsWrap.innerHTML = "";
    slides.forEach((_,i)=>{
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = i === idx ? "active" : "";
      btn.setAttribute("aria-label", `Go to slide ${i+1}`);
      btn.addEventListener("click", ()=>{
        go(i);
        restartAuto();
      });
      dotsWrap.appendChild(btn);
    });
  }

  function buildProgressDots(){
    if(!progressDotsWrap) return;
    progressDotsWrap.innerHTML = "";
    progressDots.length = 0;
    slides.forEach((_,i)=>{
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "progress-dot";
      if(i === idx) btn.classList.add("active");
      btn.setAttribute("aria-label", `Go to slide ${i+1}`);
      btn.addEventListener("click", ()=>{
        go(i);
        restartAuto();
      });
      progressDotsWrap.appendChild(btn);
      progressDots.push(btn);
    });
  }

  function restartAuto(){
    if(!autoMs || autoMs <= 0) return;
    clearTimeout(timer);
    timer = setTimeout(()=>{
      go(idx + 1);
      restartAuto();
    }, autoMs);
  }

  prevBtns.forEach(btn=>btn.addEventListener("click", ()=>{ go(idx - 1); restartAuto(); }));
  nextBtns.forEach(btn=>btn.addEventListener("click", ()=>{ go(idx + 1); restartAuto(); }));
  root.addEventListener("pointerenter", ()=>clearTimeout(timer));
  root.addEventListener("pointerleave", restartAuto);
  window.addEventListener("resize", ()=>go(idx, false));
  root.addEventListener("wheel", (e)=>{
    const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const delta = isHorizontal ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if(!delta) return;
    e.preventDefault();
    if(delta > 0) go(idx + 1);
    else go(idx - 1);
    restartAuto();
  }, {passive:false});
  root.addEventListener("keydown", (e)=>{
    if(e.key === "ArrowRight") { go(idx + 1); restartAuto(); }
    if(e.key === "ArrowLeft") { go(idx - 1); restartAuto(); }
  });

  buildDots();
  buildProgressDots();
  go(0, false);
  restartAuto();
}

document.addEventListener("DOMContentLoaded", ()=>{
  setActiveNav();
  setUserUI();
  const navBtn = qs("#navToggle");
  const nav = qs(".nav");
  if(navBtn && nav){
    navBtn.addEventListener("click", ()=>{
      nav.classList.toggle("nav-open");
      const links = qs("#navLinks");
      if(links){
        links.classList.toggle("open");
      }
    });
  }
  qsa("[data-hero-carousel]").forEach(initHeroCarousel);
  qsa('[data-slider="hero"]').forEach(initHeroSlider);
  qsa("[data-card-slider]").forEach(initCardSlider);
});
