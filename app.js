(() => {
  "use strict";

  const canvas = document.getElementById("device-screen");
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;

  const WIDTH = 128;
  const HEIGHT = 64;
  const INK = "#eaffd0";
  const OFF = "#02130b";
  const CHARACTERS = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_"];
  const FONT = {
    " ": ["00000","00000","00000","00000","00000","00000","00000"],
    A:["01110","10001","10001","11111","10001","10001","10001"], B:["11110","10001","10001","11110","10001","10001","11110"], C:["01111","10000","10000","10000","10000","10000","01111"], D:["11110","10001","10001","10001","10001","10001","11110"], E:["11111","10000","10000","11110","10000","10000","11111"], F:["11111","10000","10000","11110","10000","10000","10000"], G:["01111","10000","10000","10011","10001","10001","01110"], H:["10001","10001","10001","11111","10001","10001","10001"], I:["11111","00100","00100","00100","00100","00100","11111"], J:["00111","00010","00010","00010","00010","10010","01100"], K:["10001","10010","10100","11000","10100","10010","10001"], L:["10000","10000","10000","10000","10000","10000","11111"], M:["10001","11011","10101","10101","10001","10001","10001"], N:["10001","11001","10101","10011","10001","10001","01110"], O:["01110","10001","10001","10001","10001","10001","01110"], P:["11110","10001","10001","11110","10000","10000","10000"], Q:["01110","10001","10001","10001","10101","10010","01101"], R:["11110","10001","10001","11110","10100","10010","10001"], S:["01111","10000","10000","01110","00001","00001","11110"], T:["11111","00100","00100","00100","00100","00100","00100"], U:["10001","10001","10001","10001","10001","10001","01110"], V:["10001","10001","10001","10001","01010","01010","00100"], W:["10001","10001","10101","10101","10101","10101","01010"], X:["10001","01010","00100","00100","00100","01010","10001"], Y:["10001","01010","00100","00100","00100","00100","00100"], Z:["11111","00001","00010","00100","01000","10000","11111"],
    0:["01110","10001","10011","10101","11001","10001","01110"], 1:["00100","01100","00100","00100","00100","00100","01110"], 2:["01110","10001","00001","00010","00100","01000","11111"], 3:["11110","00001","00001","01110","00001","00001","11110"], 4:["00010","00110","01010","10010","11111","00010","00010"], 5:["11111","10000","10000","11110","00001","00001","11110"], 6:["01110","10000","10000","11110","10001","10001","01110"], 7:["11111","00001","00010","00100","01000","01000","01000"], 8:["01110","10001","10001","01110","10001","10001","01110"], 9:["01110","10001","00001","01111","00001","00001","01110"],
    "↑":["00100","01110","11111","00100","00100","00100","00100"], "↓":["00100","00100","00100","00100","11111","01110","00100"], "▲":["00100","01110","11111","00100","00100","00100","00100"], "▼":["00100","00100","00100","00100","11111","01110","00100"],
    "<":["00001","00011","00111","01111","00111","00011","00001"],
    ">": ["10000","11000","11100","11110","11100","11000","10000"], ".":["00000","00000","00000","00000","00000","01100","01100"], "-":["00000","00000","00000","11111","00000","00000","00000"], "_":["00000","00000","00000","00000","00000","00000","11111"], ":":["00000","01100","01100","00000","01100","01100","00000"], "?":["01110","10001","00001","00010","00100","00000","00100"], "/":["00001","00010","00010","00100","01000","01000","10000"], "%":["11001","11010","00010","00100","01000","01011","10011"]
  };

  const menuItems = ["MY TAGS", "FIND TAG", "SETTINGS", "INFO"];
  const actionItems = ["ADD", "EDIT", "DELETE"];
  const editorItems = ["DONE", "DELETE CHAR", "CLEAR", "LEAVE EDIT"];
  const vocabulary = Array.isArray(window.IHERE_VOCABULARY) ? window.IHERE_VOCABULARY : [];
  // Default sort compares ASCII/code-unit order, not locale collation.
  const completionWords = vocabulary.filter(word => typeof word === "string" && word.length > 0 && word.length <= 20).slice().sort();

  const dom = {
    leds: [document.getElementById("led-left"), document.getElementById("led-right")],
    readout: document.getElementById("state-readout"),
    scenario: document.getElementById("scenario-select"),
    trigger: document.getElementById("trigger-match"),
    endMatch: document.getElementById("end-match"),
    reset: document.getElementById("reset-card"),
    keys: [...document.querySelectorAll(".device-key")]
  };

  const defaultState = () => ({
    page: "home",
    homeMode: "normal",
    myTags: ["FOUNDER", "MAKER", "DESIGNER"],
    findTags: ["INVESTOR", "HARDWARE", "DESIGN"],
    homeIndex: 0,
    menuIndex: 0,
    collection: "my",
    collectionIndex: 0,
    actionIndex: 0,
    draftMode: "add",
    draftCollection: "my",
    slots: Array(20).fill(""),
    cursor: 0,
    editorIndex: 0,
    silent: false,
    infoIndex: 0,
    confirm: null,
    notice: null,
    lifecycle: null,
    boot: null,
    match: null,
    resumePage: "home",
    blink: true,
    pressed: ""
  });

  let state = defaultState();
  let resetSequence = 0;
  let scrollMotion = null;
  let scrollFrame = 0;
  const scrollDuration = 210;

  // Only the selectable viewport moves; headers, outlines and help stay fixed.
  function selectionViewport() {
    if (state.lifecycle) return null;
    if (state.page === 'draft') return { key: `draft:${state.cursor}`, value: state.slots[state.cursor], x: 10 + (state.cursor % 10) * 11, y: 23 + Math.floor(state.cursor / 10) * 12, w: 8, h: 7 };
    const specs = {
      home: [state.homeIndex, 8, 16, 112, 21],
      myBrowse: [state.collectionIndex, 7, 12, 107, 35],
      findBrowse: [state.collectionIndex, 7, 12, 107, 35],
      // Fully visible menus keep their text stationary; only focus changes.
      info: [state.infoIndex, 17, 24, 94, 18],
      settings: [Number(state.silent), 23, 30, 82, 13]
    };
    const spec = specs[state.page];
    return spec ? { key: state.page, value: spec[0], x: spec[1], y: spec[2], w: spec[3], h: spec[4] } : null;
  }
  function snapshotViewport(v) {
    const image = document.createElement('canvas'); image.width = v.w; image.height = v.h;
    image.getContext('2d').drawImage(canvas, v.x, v.y, v.w, v.h, 0, 0, v.w, v.h);
    return image;
  }
  function stopScroll() { cancelAnimationFrame(scrollFrame); scrollFrame = 0; scrollMotion = null; }
  function paintScroll() {
    if (!scrollMotion) return;
    const m = scrollMotion;
    if (state.page !== m.page || state.lifecycle) { stopScroll(); return; }
    const t = Math.min(1, (performance.now() - m.start) / scrollDuration);
    if (t >= 1) { stopScroll(); return; }
    const offset = Math.round(m.h * (1 - Math.pow(1 - t, 2))) * m.direction;
    ctx.save(); ctx.beginPath(); ctx.rect(m.x, m.y, m.w, m.h); ctx.clip();
    fill(m.x, m.y, m.w, m.h, false);
    ctx.drawImage(m.from, m.x, m.y + offset);
    ctx.drawImage(m.to, m.x, m.y + offset - m.direction * m.h);
    ctx.restore();
    if (state.page === 'info') rect(16, 23, 96, 20);
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; render(); });
  }

  const mod = (value, length) => ((value % length) + length) % length;
  const currentTags = () => state.collection === "my" ? state.myTags : state.findTags;
  const pageTitle = () => `${state.page}${state.lifecycle ? ` / ${state.lifecycle}` : ""}`;
  const draftText = () => state.slots.join("").replace(/\s+$/u, "");
  const setDraft = (text) => { state.slots = Array(20).fill(""); [...text.slice(0, 20)].forEach((char, index) => { state.slots[index] = char; }); state.cursor = Math.min(text.length, 19); };

  function fill(x, y, width, height, on = true) { ctx.fillStyle = on ? INK : OFF; ctx.fillRect(x, y, width, height); }
  function rect(x, y, width, height, on = true) { fill(x, y, width, 1, on); fill(x, y + height - 1, width, 1, on); fill(x, y, 1, height, on); fill(x + width - 1, y, 1, height, on); }
  function textWidth(text, scale = 1) { return text.length ? ((text.length * 6) - 1) * scale : 0; }
  function text(x, y, value, scale = 1, on = true) {
    let cursor = x;
    for (const raw of String(value).toUpperCase()) {
      const glyph = FONT[raw] || FONT["?"];
      glyph.forEach((row, gy) => [...row].forEach((pixel, gx) => { if (pixel === "1") fill(cursor + gx * scale, y + gy * scale, scale, scale, on); }));
      cursor += 6 * scale;
    }
  }
  function center(y, value, scale = 1, on = true) { text(Math.floor((WIDTH - textWidth(value, scale)) / 2), y, value, scale, on); }
  function italicText(x, y, value, scale = 1, on = true) {
    let cursor = x;
    for (const raw of String(value).toUpperCase()) {
      const glyph = FONT[raw] || FONT["?"];
      glyph.forEach((row, gy) => {
        const slant = Math.floor((6 - gy) * 0.55);
        [...row].forEach((pixel, gx) => { if (pixel === "1") fill(cursor + gx * scale + slant, y + gy * scale, scale, scale, on); });
      });
      cursor += 6 * scale;
    }
  }
  function italicCenter(y, value, scale = 1, on = true) { italicText(Math.floor((WIDTH - textWidth(value, scale) - 3) / 2), y, value, scale, on); }
  function clear() { fill(0, 0, WIDTH, HEIGHT, false); }
  function header(title) { fill(0, 0, WIDTH, 10); text(5, 1, title, 1, false); }
  function footer(help) { fill(0, 53, WIDTH, 1); if (help) center(56, help); }
  function progress(count, active) {
    if (!count) return;
    const gap = count > 1 ? 1 : 0;
    const available = 40 - ((count - 1) * gap);
    const base = Math.floor(available / count);
    const extra = available % count;
    let y = 12;
    // Reserve the rightmost four pixels; even ten items retain hollow segments.
    for (let i = 1; i <= count; i += 1) { const height = base + (i <= extra ? 1 : 0); if (i === active) fill(123, y, 4, height); else rect(123, y, 4, height); y += height + gap; }
  }
  function heatBars(level) {
    const map = { HIGH: [4,6,5,4,6,5,4,6,4,5,4,6], MED: [3,4,2,4,3,3,4,2], LOW: [2,3,2,3,2] };
    const heights = map[level] || [];
    if (!heights.length) return;
    const barWidth = level === "HIGH" ? 3 : level === "MED" ? 5 : 6;
    const gap = 3;
    const total = heights.length * barWidth + (heights.length - 1) * gap;
    let x = Math.floor((WIDTH - total) / 2);
    heights.forEach((height) => { fill(x, 52 - height, barWidth, height); x += barWidth + gap; });
  }
  function wrapped(value, max = 18) { return value.length > max ? `${value.slice(0, max - 3)}...` : value; }

  function renderHome() {
    const tags = state.myTags;
    const tag = tags[state.homeIndex] || "NO TAG";
    const heat = state.homeMode === "no-tag" ? "ADD TAG" : state.homeMode === "limited" ? "LIMITED" : state.homeMode === "none" ? "NONE" : state.silent || state.homeMode === "silent" ? "SILENT" : ["HIGH", "MED", "LOW"][state.homeIndex % 3];
    fill(0, 0, WIDTH, 10); text(5, 1, "IHERE", 1, false); text(108, 1, "MY", 1, false);
    if (tags.length) progress(tags.length, state.homeIndex + 1);
    rect(7, 15, 114, 23); center(20, tag, textWidth(tag, 2) <= 104 ? 2 : 1); center(40, heat);
    if (["HIGH", "MED", "LOW"].includes(heat)) heatBars(heat);
    footer(tags.length ? "MENU ▲ ▼ OK" : "MENU OK");
  }

  function renderCarousel(title, value, detail, index, count, help = "MENU ▲ ▼ OK") {
    header(title); const scale = textWidth(value, 2) <= 108 ? 2 : 1; center(20, wrapped(value, 20), scale); center(37, wrapped(detail, 20)); progress(count, index); footer(help);
  }

  function renderList(title, items, focus, help = "▲ ▼ MENU OK") {
    header(title);
    progress(items.length, focus + 1);
    items.forEach((item, index) => {
      const y = 12 + index * 9;
      if (index === focus) { fill(7, y - 1, 114, 8); text(12, y, item, 1, false); }
      else text(12, y, item);
    });
    footer(help);
  }

  function renderCollection() {
    const tags = currentTags(); const title = state.collection === "my" ? "MY TAGS" : "FIND TAG";
    if (!tags.length) { renderCarousel(title, "NO TAG", "OK TO ADD", 0, 0, "MENU OK"); return; }
    renderCarousel(title, tags[state.collectionIndex], "", state.collectionIndex + 1, tags.length, "MENU ▲ ▼ OK");
  }

  function renderAction() { const title = state.collection === "my" ? "MY TAGS" : "FIND TAG"; renderList(title, actionItems, state.actionIndex); }

  function drawSlots() {
    state.slots.forEach((char, index) => { const row = Math.floor(index / 10); const column = index % 10; const x = 9 + column * 11; const y = 22 + row * 12; if (index === state.cursor) { fill(x, y, 10, 9); if (char) text(x + 3, y + 1, char, 1, false); } else { rect(x, y, 10, 9); if (char) text(x + 3, y + 1, char); } });
  }
  function renderDraft() { header(state.draftMode === "add" ? "ADD TAG" : "EDIT TAG"); text(8, 13, "DRAFT:"); text(45, 13, wrapped(draftText() || "_", 13)); drawSlots(); center(45, `CURSOR ${state.cursor + 1}/20`); footer("MENU ▲ ▼ OK"); }
  function renderEditorMenu() { renderList("EDIT MENU", editorItems, state.editorIndex); }
  function renderConfirm() { header(state.confirm.title); center(15, wrapped(state.confirm.value, 20)); ['NO', 'YES'].forEach((label, index) => { const y = 29 + index * 11; const selected = Number(Boolean(state.confirm.yes)) === index; if (selected) fill(7, y - 1, 114, 9); text(52, y, label, 1, !selected); }); footer("▲ ▼ SELECT OK"); }
  function renderNotice() { header(state.notice.title); rect(12, 17, 104, 29); center(23, state.notice.primary); center(35, state.notice.secondary); footer(state.notice.help || "MENU OR OK"); }
  function renderSettings() { header("SILENT"); center(18, "DISCOVERY"); rect(22, 29, 84, 15); center(33, state.silent ? "ON" : "OFF"); center(45, `SILENT ${state.silent ? "ON" : "OFF"}`); footer("▲ ▼ MENU OK"); }
  function renderInfo() { const values = [["BATTERY", "86%"], ["VERSION", "0.1.0"], ["CARD ID", "A7K9P2Q4"]]; const [name, value] = values[state.infoIndex]; header(`INFO - ${name}`); rect(16, 23, 96, 20); const scale = textWidth(value, 2) <= 82 ? 2 : 1; center(scale === 2 ? 26 : 29, value, scale); progress(3, state.infoIndex + 1); footer("▲ ▼ MENU"); }
  function renderMatch() { header(state.page === "muted" ? "MUTED" : "MATCH"); center(14, state.page === "muted" ? "MATCH PAUSED" : "MATCHED TAG"); if (state.page !== "match" || state.blink) center(22, state.match?.tag || "INVESTOR", 2); if (state.page === "muted") center(45, "RETURNING HOME"); else { fill(39, 41, 50, 10); text(52, 43, "MUTE", 1, false); footer("MUTE"); } }
  function renderLifecycle() { const copy = { "boot-logo": ["", "IHERE.NO"], "boot-starting": ["IHERE", "STARTING 1/2"], "boot-loading": ["IHERE", "LOADING 2/2"], "provision-pre": ["IHERE", "NO KEY|PROVISION"], provisioning: ["IHERE", "PROVISIONING|PLEASE WAIT"], "provision-ready": ["IHERE", "READY|AUTH OK"], "provision-failed": ["IHERE", "NO KEY|TRY AGAIN"], "provision-limited": ["IHERE", "LIMITED|PROVISION"], "provision-revoked": ["IHERE", "REVOKD|LOCKED"], rma: ["IHERE", "RMA|SERVICE"] }[state.lifecycle];
    if (state.lifecycle === "boot-logo") { italicCenter(25, "IHERE.NO", 2); return; }
    if (state.lifecycle.startsWith("boot-")) { rect(12, 12, 104, 39); center(17, "IHERE"); center(30, copy[1]); rect(24, 43, 80, 3); fill(26, 44, state.lifecycle === "boot-starting" ? 37 : 74, 1); return; }
    header(copy[0]); rect(9, 17, 110, 30); const [primary, secondary] = copy[1].split("|"); center(23, primary); center(35, secondary);
  }

  function render() {
    clear();
    if (state.lifecycle) renderLifecycle();
    else if (state.page === "home") renderHome();
    else if (state.page === "menu") renderList("MENU", menuItems, state.menuIndex);
    else if (["myBrowse", "findBrowse"].includes(state.page)) renderCollection();
    else if (state.page === "action") renderAction();
    else if (state.page === "draft") renderDraft();
    else if (state.page === "editorMenu") renderEditorMenu();
    else if (state.page === "settings") renderSettings();
    else if (state.page === "info") renderInfo();
    else if (["match", "muted"].includes(state.page)) renderMatch();
    else if (state.page === "confirm" || state.page === "leaveConfirm") renderConfirm();
    else if (state.page === "notice") renderNotice();
    paintScroll();
    updateChrome();
  }

  function updateChrome() {
    const matchActive = state.page === "match" && Boolean(state.match);
    dom.leds.forEach((led) => { led.classList.toggle("is-active", matchActive); led.classList.toggle("is-blink-off", matchActive && !state.blink); });
    dom.keys.forEach((button) => button.classList.toggle("is-pressed", button.dataset.key === state.pressed));
    const entries = { page: pageTitle(), myTags: state.myTags.join(", ") || "—", findTags: state.findTags.join(", ") || "—", draft: draftText() || "—", cursor: `${state.cursor + 1}/20`, vocabulary: String(vocabulary.length), silent: state.silent ? "ON" : "OFF", match: state.match ? `${state.match.tag} (${state.page})` : "none" };
    dom.readout.replaceChildren(...Object.entries(entries).flatMap(([key, value]) => { const dt = document.createElement("dt"); dt.textContent = key; const dd = document.createElement("dd"); dd.textContent = value; return [dt, dd]; }));
  }

  function enterCollection(collection) { state.collection = collection; state.collectionIndex = 0; state.page = collection === "my" ? "myBrowse" : "findBrowse"; }
  function startDraft(collection, mode = "add") { state.collection = collection; state.draftCollection = collection; state.draftMode = mode; const tags = currentTags(); const current = tags[state.collectionIndex] || ""; setDraft(mode === "edit" ? current : ""); state.page = "draft"; }
  function showNotice(title, primary, secondary, returnPage) { state.notice = { title, primary, secondary, returnPage }; state.page = "notice"; }
  function completeFromCursor() {
    const prefixSlots = state.slots.slice(0, state.cursor + 1);
    // Old completion is replaceable; it must never become part of the lookup prefix.
    state.slots.fill("", state.cursor + 1);
    if (prefixSlots.some(char => !char)) return;
    const match = completionWords.find(word => word.startsWith(prefixSlots.join("")));
    if (match) {
      for (let index = state.cursor + 1; index < match.length; index += 1) state.slots[index] = match[index];
    }
  }
  function finishDraft() {
    const tag = draftText(); const tags = state.draftCollection === "my" ? state.myTags : state.findTags;
    if (!tag) { showNotice("NOTICE", "EMPTY TAG", "EDIT THEN DONE", "draft"); return; }
    if (state.draftMode === "add" && tags.includes(tag)) { showNotice("NOTICE", "TAG EXISTS", "EDIT THEN DONE", "draft"); return; }
    if (state.draftMode === "add" && tags.length >= 10) { showNotice("FULL", "FULL 10/10", "DELETE A TAG", state.draftCollection === "my" ? "myBrowse" : "findBrowse"); return; }
    if (state.draftMode === "add") { state.confirm = { title: 'ADD TAG?', value: tag, action: 'add' }; state.page = 'confirm'; }
    else { state.confirm = { title: "SAVE?", value: tag, action: "save" }; state.page = "confirm"; }
  }
  function commitSave() { const tags = state.draftCollection === "my" ? state.myTags : state.findTags; tags[state.collectionIndex] = draftText(); showNotice("SAVED", draftText(), "RETURNING", state.draftCollection === "my" ? "myBrowse" : "findBrowse"); }
  function deleteAtCursor() { state.slots.splice(state.cursor, 1); state.slots.push(""); }
  function cycleCharacter() { const current = state.slots[state.cursor] || ""; const next = CHARACTERS[(CHARACTERS.indexOf(current) + 1) % CHARACTERS.length]; state.slots[state.cursor] = next; completeFromCursor(); }
  function beginMatch() { if (state.lifecycle || state.page === "match") return; state.resumePage = state.page; state.match = { tag: "INVESTOR" }; state.page = "match"; state.blink = true; }
  function muteMatch() { if (state.page !== "match") return; state.page = "muted"; state.blink = false; setTimeout(() => { if (state.page === "muted") { state.match = null; state.page = "home"; render(); } }, 900); }
  function endMatch() { if (!state.match) return; state.match = null; state.page = state.resumePage === "match" ? "home" : state.resumePage; render(); }
  function resetCard() {
    stopScroll();
    const sequence = ++resetSequence;
    state = defaultState();
    state.lifecycle = "boot-logo";
    dom.scenario.value = "home";
    render();
    setTimeout(() => { if (sequence !== resetSequence) return; state.lifecycle = "boot-starting"; render(); }, 650);
    setTimeout(() => { if (sequence !== resetSequence) return; state.lifecycle = "boot-loading"; render(); }, 1200);
    setTimeout(() => { if (sequence !== resetSequence) return; state.lifecycle = null; state.page = "home"; render(); }, 1750);
  }

  function press(key) {
    const before = selectionViewport();
    const directional = key === 'UP' || key === 'DOWN' || (key === 'OK' && state.page === 'draft');
    // Retarget from the actual visible pixels, including an unfinished scroll.
    const from = directional && before ? snapshotViewport(before) : null;
    if (!directional) stopScroll();
    applyPress(key);
    const after = selectionViewport();
    if (from && after && before.key === after.key && before.value !== after.value) {
      stopScroll(); render();
      const to = snapshotViewport(after);
      scrollMotion = { ...after, page: state.page, from, to, direction: key === 'UP' ? -1 : 1, start: performance.now() };
      render();
    }
  }
  function applyPress(key) {
    state.pressed = key;
    if (state.lifecycle) { render(); setTimeout(() => { state.pressed = ""; render(); }, 130); return; }
    if (state.page === "match") { if (key === "MUTE") muteMatch(); render(); setTimeout(() => { state.pressed = ""; render(); }, 130); return; }
    if (state.page === "muted" || key === "MUTE") { render(); setTimeout(() => { state.pressed = ""; render(); }, 130); return; }
    if (state.page === "home") {
      if (key === "UP" || key === "DOWN") state.homeIndex = mod(state.homeIndex + (key === "DOWN" ? 1 : -1), Math.max(state.myTags.length, 1));
      else if (key === "MENU") state.page = "menu";
      else if (key === "OK") state.myTags.length ? enterCollection("my") : startDraft("my");
    } else if (state.page === "menu") {
      if (key === "UP" || key === "DOWN") state.menuIndex = mod(state.menuIndex + (key === "DOWN" ? 1 : -1), menuItems.length);
      else if (key === "MENU") state.page = "home";
      else if (key === "OK") { const item = menuItems[state.menuIndex]; if (item === "MY TAGS") enterCollection("my"); if (item === "FIND TAG") enterCollection("find"); if (item === "SETTINGS") state.page = "settings"; if (item === "INFO") state.page = "info"; }
    } else if (["myBrowse", "findBrowse"].includes(state.page)) {
      const tags = currentTags();
      if (key === "MENU") state.page = "menu";
      else if (key === "OK") tags.length ? (state.actionIndex = 0, state.page = "action") : startDraft(state.collection);
      else if (tags.length && (key === "UP" || key === "DOWN")) state.collectionIndex = mod(state.collectionIndex + (key === "DOWN" ? 1 : -1), tags.length);
    } else if (state.page === "action") {
      if (key === "UP" || key === "DOWN") state.actionIndex = mod(state.actionIndex + (key === "DOWN" ? 1 : -1), actionItems.length);
      else if (key === "MENU") state.page = state.collection === "my" ? "myBrowse" : "findBrowse";
      else if (key === "OK") { const action = actionItems[state.actionIndex]; if (action === "ADD") startDraft(state.collection); else if (action === "EDIT") startDraft(state.collection, "edit"); else if (action === "DELETE") { state.confirm = { title: "DELETE?", value: currentTags()[state.collectionIndex], action: "delete" }; state.page = "confirm"; } else state.page = "menu"; }
    } else if (state.page === "draft") {
      if (key === "UP" || key === "DOWN") state.cursor = mod(state.cursor + (key === "DOWN" ? 1 : -1), 20);
      else if (key === "OK") cycleCharacter();
      else if (key === "MENU") { state.editorIndex = 0; state.page = "editorMenu"; }
    } else if (state.page === "editorMenu") {
      if (key === "UP" || key === "DOWN") state.editorIndex = mod(state.editorIndex + (key === "DOWN" ? 1 : -1), editorItems.length);
      else if (key === "MENU") state.page = "draft";
      else if (key === "OK") { const action = editorItems[state.editorIndex]; if (action === "DONE") finishDraft(); else { state.confirm = { title: action === 'CLEAR' ? 'CLEAR DRAFT?' : action === 'DELETE CHAR' ? 'DELETE CHAR?' : 'LEAVE EDIT?', value: action === 'DELETE CHAR' ? (state.slots[state.cursor] || 'EMPTY') : 'DISCARD DRAFT', action: action === 'CLEAR' ? 'clear' : action === 'DELETE CHAR' ? 'character' : 'leave', returnPage: 'editorMenu' }; state.page = 'confirm'; } }
    } else if (state.page === "settings") {
      if (key === "UP" || key === "DOWN") state.silent = key === "DOWN";
      else if (key === "MENU") state.page = "menu";
    } else if (state.page === "info") {
      if (key === "UP" || key === "DOWN") state.infoIndex = mod(state.infoIndex + (key === "DOWN" ? 1 : -1), 3);
      else if (key === "MENU") state.page = "menu";
    } else if (["confirm", "leaveConfirm"].includes(state.page)) {
      if (key === 'UP') state.confirm.yes = false;
      else if (key === 'DOWN') state.confirm.yes = true;
      else if (key === 'MENU' || (key === 'OK' && !state.confirm.yes)) state.page = state.confirm.returnPage || (state.confirm.action === 'delete' ? 'action' : 'draft');
      else if (key === "OK") { if (state.confirm.action === "save") commitSave(); else if (state.confirm.action === 'add') { const tags = currentTags(); tags.push(draftText()); state.collectionIndex = tags.length - 1; showNotice('SAVED', draftText(), 'PRESS OK', state.collection === 'my' ? 'myBrowse' : 'findBrowse'); } else if (state.confirm.action === 'clear') { setDraft(''); state.page = 'draft'; } else if (state.confirm.action === 'character') { deleteAtCursor(); state.page = 'draft'; } else if (state.confirm.action === "delete") { const tags = currentTags(); const deleted = tags.splice(state.collectionIndex, 1)[0]; state.collectionIndex = Math.max(0, state.collectionIndex - 1); state.homeIndex = Math.min(state.homeIndex, Math.max(0, state.myTags.length - 1)); showNotice("DELETED", deleted, "PRESS OK", state.collection === "my" ? "myBrowse" : "findBrowse"); } else state.page = state.collection === 'my' ? 'myBrowse' : 'findBrowse'; }
    } else if (state.page === "notice") {
      if (key === "MENU" || key === "OK") state.page = state.notice.returnPage || "home";
    }
    render(); setTimeout(() => { state.pressed = ""; render(); }, 130);
  }

  function loadScenario(scenario) {
    stopScroll();
    state = defaultState();
    const lifecycle = ["boot-logo", "boot-starting", "boot-loading", "provision-pre", "provisioning", "provision-ready", "provision-failed", "provision-limited", "provision-revoked", "rma"];
    if (lifecycle.includes(scenario)) { state.lifecycle = scenario; render(); return; }
    if (scenario === "home-med") state.homeIndex = 1;
    else if (scenario === "home-low") state.homeIndex = 2;
    else if (scenario === "home-none") { state.myTags = ["FOUNDER"]; state.homeMode = "none"; }
    else if (scenario === "home-no-tag") { state.myTags = []; state.homeMode = "no-tag"; }
    else if (scenario === "home-limited") state.homeMode = "limited";
    else if (scenario === "home-silent") { state.silent = true; state.homeMode = "silent"; }
    else if (scenario === "menu") state.page = "menu";
    else if (scenario === "my-tags") enterCollection("my");
    else if (scenario === "my-empty") { state.myTags = []; enterCollection("my"); }
    else if (scenario === "long-tag") { state.myTags = ["WEB3.0STARTUP2026"]; enterCollection("my"); }
    else if (scenario === "my-actions") { enterCollection("my"); state.page = "action"; }
    else if (scenario === "find-tags") enterCollection("find");
    else if (scenario === "find-empty") { state.findTags = []; enterCollection("find"); }
    else if (scenario === "find-actions") { enterCollection("find"); state.page = "action"; }
    else if (scenario === "add-empty") startDraft("my");
    else if (scenario === "add-draft") { startDraft("my"); setDraft("WEB3.0"); state.cursor = 5; }
    else if (scenario === "edit-draft") startDraft("my", "edit");
    else if (scenario === "editor-menu") { startDraft("my", "edit"); state.page = "editorMenu"; state.editorIndex = 0; }
    else if (scenario === "autofill") { startDraft("my"); state.slots[0] = "A"; completeFromCursor(); }
    else if (scenario === "save-confirm") { startDraft("my", "edit"); state.confirm = { title: "SAVE?", value: "FOUNDER", action: "save" }; state.page = "confirm"; }
    else if (scenario === "saved") showNotice("SAVED", "FOUNDER", "RETURNING", "myBrowse");
    else if (scenario === "delete-confirm") { enterCollection("my"); state.confirm = { title: "DELETE?", value: "FOUNDER", action: "delete" }; state.page = "confirm"; }
    else if (scenario === "deleted") showNotice("DELETED", "FOUNDER", "RETURNING", "myBrowse");
    else if (scenario === "leave-edit") { startDraft("my"); state.confirm = { title: "LEAVE EDIT?", value: "DISCARD DRAFT", action: "leave" }; state.page = "leaveConfirm"; }
    else if (scenario === "settings") state.page = "settings";
    else if (scenario === "settings-on") { state.silent = true; state.page = "settings"; }
    else if (scenario === "info") state.page = "info";
    else if (scenario === "info-version") { state.page = "info"; state.infoIndex = 1; }
    else if (scenario === "info-card-id") { state.page = "info"; state.infoIndex = 2; }
    else if (scenario === "match-muted") { state.match = { tag: "INVESTOR" }; state.page = "muted"; state.blink = false; }
    else if (scenario === "tag-exists") showNotice("NOTICE", "TAG EXISTS", "EDIT THEN DONE", "draft");
    else if (scenario === "tag-full") showNotice("FULL", "FULL 10/10", "DELETE A TAG", "myBrowse");
    else if (scenario === "storage-error") showNotice("ERROR", "SAVE FAIL", "TRY AGAIN", "draft");
    render();
  }

  dom.keys.forEach((button) => button.addEventListener("click", () => press(button.dataset.key)));
  const wheel = document.getElementById("side-wheel");
  function alignCallouts() {
    const stageRect = document.querySelector(".card-stage").getBoundingClientRect();
    const menuRect = document.querySelector(".key-menu").getBoundingClientRect();
    const muteRect = document.querySelector(".key-mute").getBoundingClientRect();
    const wide = window.matchMedia("(min-width: 1251px)").matches;
    const wheelRect = wheel.getBoundingClientRect();
    let nextTop = 0;
    [[".callout-navigate", wheelRect.top + wheelRect.height / 2],
      [".callout-menu", menuRect.top + menuRect.height / 2],
      [".callout-mute", muteRect.top + muteRect.height / 2]].forEach(([selector, target]) => {
      const callout = document.querySelector(selector);
      const height = callout.getBoundingClientRect().height;
      const top = Math.max(nextTop, target - stageRect.top - height / 2);
      callout.style.top = wide ? `${top}px` : "auto";
      callout.style.transform = "none";
      callout.style.setProperty("--leader-y", `${target - stageRect.top - top}px`);
      nextTop = top + height + 16;
    });
  }
  new ResizeObserver(alignCallouts).observe(document.querySelector('.ihere-card'));
  window.addEventListener("resize", alignCallouts);
  alignCallouts();
  let wheelOffset = 0;
  let wheelDelta = 0;
  let lastWheelTime = 0;
  let gesture = null;
  let suppressWheelClick = false;
  function rollWheel(direction) {
    wheelOffset += direction * 6;
    wheel.style.setProperty("--wheel-angle", `${wheelOffset}deg`);
    press(direction > 0 ? "DOWN" : "UP");
  }
  wheel.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 240 : 1);
    if (!delta) return;
    if (event.timeStamp - lastWheelTime > 180 || Math.sign(delta) !== Math.sign(wheelDelta)) wheelDelta = 0;
    lastWheelTime = event.timeStamp;
    wheelDelta += delta;
    const steps = Math.min(5, Math.floor(Math.abs(wheelDelta) / 40));
    for (let i = 0; i < steps; i++) rollWheel(Math.sign(delta));
    if (steps) wheelDelta %= 40;
  }, { passive: false });
  wheel.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressWheelClick = false;
    gesture = { id: event.pointerId, y: event.clientY, startY: event.clientY, startX: event.clientX };
    wheel.setPointerCapture(event.pointerId);
  });
  wheel.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (Math.hypot(event.clientY - gesture.startY, event.clientX - gesture.startX) > 7) suppressWheelClick = true;
    const delta = event.clientY - gesture.y;
    const steps = Math.floor(Math.abs(delta) / 18);
    for (let i = 0; i < steps; i++) rollWheel(Math.sign(delta));
    if (steps) gesture.y += Math.sign(delta) * steps * 18;
  });
  wheel.addEventListener("pointerup", () => { gesture = null; });
  wheel.addEventListener("pointercancel", () => { gesture = null; suppressWheelClick = true; });
  wheel.addEventListener("lostpointercapture", () => { gesture = null; });
  wheel.addEventListener("click", (event) => {
    if (suppressWheelClick && event.detail !== 0) { suppressWheelClick = false; return; }
    press("OK");
    wheel.classList.add("is-pressed");
    setTimeout(() => wheel.classList.remove("is-pressed"), 140);
  });
  dom.trigger.addEventListener("click", () => { beginMatch(); render(); });
  dom.endMatch.addEventListener("click", endMatch);
  dom.reset.addEventListener("click", resetCard);
  dom.scenario.addEventListener("change", () => loadScenario(dom.scenario.value));
  window.addEventListener("keydown", (event) => { const map = { ArrowUp: "UP", ArrowDown: "DOWN", Enter: "OK", Escape: "MENU", m: "MENU", M: "MENU", x: "MUTE", X: "MUTE" }; if (map[event.key]) { event.preventDefault(); press(map[event.key]); } });
  setInterval(() => { if (state.page === "match") { state.blink = !state.blink; render(); } }, 360);
  const query = window.location && typeof window.location.search === "string" ? window.location.search : "";
  const initialScenario = query && typeof URLSearchParams !== "undefined" ? new URLSearchParams(query).get("scenario") : "";
  if (initialScenario) { dom.scenario.value = initialScenario; loadScenario(initialScenario); } else render();
})();
