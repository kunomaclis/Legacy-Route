(function () {
  "use strict";
  var KEY = "alr-v2";
  var TIERS = [15, 25, 40, 55];
  var CHARS = [
    { id: "shaman", cls: "shaman", race: "dwarf", name: "Dwarf Shaman", slot: "Main", profs: ["Leatherworking"], gather: "Skinning", target: 35, core: true },
    { id: "warlock", cls: "warlock", race: "human", name: "Human Warlock", slot: "Alt 2", profs: ["Enchanting", "Tailoring"], target: 35, core: true },
    { id: "warrior", cls: "warrior", race: "nightelf", name: "Night Elf Warrior", slot: "Alt 3", profs: ["Blacksmithing", "Engineering"], gather: "Mining", target: 35, core: true },
    { id: "priest", cls: "priest", race: "nightelf", name: "Night Elf Priest", slot: "Alt 4", profs: ["Alchemy"], gather: "Herbalism", target: 35, core: true },
    { id: "paladin", cls: "paladin", name: "Paladin", slot: "Alt 5", profs: [], target: 25 },
    { id: "hunter", cls: "hunter", name: "Hunter", slot: "Alt 6", profs: [], target: 25 },
    { id: "rogue", cls: "rogue", name: "Rogue", slot: "Alt 7", profs: [], target: 25 },
    { id: "druid", cls: "druid", name: "Druid", slot: "Alt 8", profs: [], target: 25 },
    { id: "mage", cls: "mage", name: "Mage", slot: "Alt 9", profs: [], target: 25 }
  ];
  var SPRITE = "assets/icons.svg?v=8";
  var CLASS_NAMES = { shaman: "Shaman", priest: "Priest", warrior: "Warrior", druid: "Druid", paladin: "Paladin", hunter: "Hunter", rogue: "Rogue", warlock: "Warlock", mage: "Mage" };
  var RACE_NAMES = { dwarf: "Dwarf", nightelf: "Night Elf", skyborne: "Skyborne", human: "Human", gnome: "Gnome" };
  function svg(id, cls) { return '<svg class="ico ' + (cls || "") + '" aria-hidden="true"><use href="' + SPRITE + "#" + id + '"/></svg>'; }
  function token(c, size) { return '<span class="tok' + (size ? " " + size : "") + '" style="--cls:var(--c-' + c + ')" title="' + CLASS_NAMES[c] + '">' + svg("class-" + c) + "</span>"; }
  function raceIcon(r) { return '<span class="race-ico" title="' + RACE_NAMES[r] + '">' + svg("race-" + r) + "</span>"; }
  function profIcon(p) { return '<span class="prof-ico" title="' + p + '">' + svg("prof-" + p.toLowerCase()) + "</span>"; }
  var CLASS_RE = {
    shaman: /\bshaman\b/i, warlock: /\bwarlock\b/i, warrior: /\bwarrior\b/i, priest: /\bpriest\b/i,
    support: /\b(support alts?|hunter|paladin|rogue|druid|mage)\b/i
  };
  var TOPIC_RE = {
    shaman: /\b(dwarf|leatherworking|skinning|skin|main only)\b/i,
    warlock: /\b(human|northshire|goldshire|tailoring|enchanting|disenchant\w*|linen bags?)\b/i,
    warrior: /\b(blacksmithing|mining|engineering|night elf|night elves)\b/i,
    priest: /\b(herbalism|herbing|alchemy|potions?|night elf|night elves)\b/i
  };


  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  /* ---------- state ---------- */
  function defaults() {
    var chars = {};
    CHARS.forEach(function (c) { chars[c.id] = { level: 1, prof: {}, parkedAt: null }; });
    return { v: 2, chars: chars, steps: {}, open: { "0": true }, wellRested: false, extra: 0, theme: "auto", filter: "all" };
  }
  function load() {
    var d = defaults(), s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (s && typeof s === "object") {
      Object.keys(d).forEach(function (k) { if (k !== "chars" && s[k] !== undefined) d[k] = s[k]; });
      if (s.chars) CHARS.forEach(function (c) { if (s.chars[c.id]) d.chars[c.id] = Object.assign(d.chars[c.id], s.chars[c.id]); });
    }
    return d;
  }
  var state = load();
  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 120);
  }

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------- theme ---------- */
  var LOOKS = { auto: "Standard", light: "Standard light", dark: "Standard dark", ironforge: "Ironforge", stormwind: "Stormwind" };
  var LOOK_BAR = { light: "#ffffff", dark: "#1b1e22", ironforge: "#0e0c0a", stormwind: "#0a1630" };
  function applyTheme() {
    if (state.theme === "questlog") state.theme = "ironforge";
    if (!LOOKS[state.theme]) state.theme = "auto";
    document.documentElement.setAttribute("data-theme", state.theme);
    var dark = state.theme === "auto" ? matchMedia("(prefers-color-scheme: dark)").matches : null;
    $('meta[name="theme-color"]').setAttribute("content", LOOK_BAR[state.theme] || (dark ? LOOK_BAR.dark : LOOK_BAR.light));
    $$("[data-look]").forEach(function (b) { b.setAttribute("aria-current", String(b.dataset.look === state.theme)); });
  }
  $$("[data-look]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.theme = b.dataset.look; applyTheme(); save();
      $("#look-menu").open = false; toast("Look: " + LOOKS[state.theme]);
    });
  });

  /* ---------- icons ---------- */
  function hydrateIcons(root) {
    $$("i[data-cls]", root).forEach(function (i) { i.outerHTML = token(i.dataset.cls, i.dataset.size); });
    $$("i[data-race]", root).forEach(function (i) { i.outerHTML = raceIcon(i.dataset.race); });
    $$("i[data-prof]", root).forEach(function (i) { i.outerHTML = profIcon(i.dataset.prof); });
  }
  hydrateIcons(document);
  var CORE = ["shaman", "warlock", "warrior", "priest"], SUPPORT = ["paladin", "hunter", "rogue", "druid", "mage"];
  $$(".phase h3").forEach(function (h) {
    var t = h.textContent, list = [];
    if (/core four/i.test(t)) list = CORE;
    else if (/support alts/i.test(t)) list = SUPPORT;
    else CORE.forEach(function (c) { if (new RegExp("\\b" + c + "\\b", "i").test(t)) list.push(c); });
    var races = /night el(f|ves)/i.test(t) ? raceIcon("nightelf") : "";
    if (list.length || races) h.insertAdjacentHTML("afterbegin", '<span class="h-icons">' + list.map(function (c) { return token(c, "sm"); }).join("") + races + "</span>");
    if (list.length === 1) h.style.setProperty("--cls", "var(--c-" + list[0] + ")"), h.classList.add("cls-h");
  });
  $$(".phase li").forEach(function (li) {
    var m = /^(Shaman|Warlock|Warrior|Priest|Hunter)\b/.exec(li.textContent.trim());
    if (m) li.insertAdjacentHTML("afterbegin", token(m[1].toLowerCase(), "xs") + " ");
  });

  /* ---------- route steps ---------- */
  var phases = $$("details.phase-d");
  var steps = [];
  phases.forEach(function (d, pi) {
    var sum = $("summary", d);
    sum.insertAdjacentHTML("beforeend", '<span class="pp"><span class="meter ok"><i></i></span><span class="ppn"></span></span>');
    var title = sum.firstChild.textContent.trim();
    var h3 = null, h4 = null, hi = -1, ui = 0;
    $$(".phase > *", d).forEach(function (el) {
      if (el.tagName === "H3") { h3 = el; h4 = null; hi++; ui = 0; return; }
      if (el.tagName === "H4") { h4 = el; return; }
      if (el.tagName !== "UL") return;
      el.classList.add("steps");
      var u = ui++, sub = h4;
      $$(":scope > li", el).forEach(function (li, i) {
        var id = "s" + pi + "-" + hi + "-" + (u ? u + "-" : "") + i;
        var span = document.createElement("span");
        while (li.firstChild) span.appendChild(li.firstChild);
        var cb = document.createElement("input");
        cb.type = "checkbox"; cb.setAttribute("aria-label", "Mark step done");
        li.appendChild(cb);
        if (span.firstElementChild && span.firstElementChild.classList.contains("tok") && span.firstChild === span.firstElementChild) li.appendChild(span.firstElementChild);
        li.appendChild(span);
        li.classList.add("step"); li.dataset.step = id;
        steps.push({ id: id, li: li, cb: cb, phase: pi, details: d, ctx: title.replace(/\s+/g, " ") + (h3 ? " › " + h3.textContent : "") + (sub ? " › " + sub.textContent : ""), h3: h3 });
        if (state.steps[id]) { cb.checked = true; li.classList.add("checked"); }
      });
    });
    d.open = !!state.open[pi];
    d.addEventListener("toggle", function () {
      if (document.body.classList.contains("searching") || printing) return;
      state.open[pi] = d.open; save();
    });
  });
  function setStep(s, val) {
    s.cb.checked = val; s.li.classList.toggle("checked", val);
    if (val) state.steps[s.id] = true; else delete state.steps[s.id];
    save(); refreshProgress();
  }
  steps.forEach(function (s) {
    s.cb.addEventListener("change", function () { setStep(s, s.cb.checked); });
    s.li.addEventListener("click", function (e) {
      if (e.target.closest("input, a, button") || String(window.getSelection())) return;
      setStep(s, !s.cb.checked);
    });
  });
  function refreshProgress() {
    phases.forEach(function (d, pi) {
      var ps = steps.filter(function (s) { return s.phase === pi; });
      var done = ps.filter(function (s) { return s.cb.checked; }).length;
      var pp = $(".pp", d);
      $(".meter > i", pp).style.width = (ps.length ? done / ps.length * 100 : 0) + "%";
      $(".ppn", pp).textContent = done + "/" + ps.length;
      pp.classList.toggle("complete", done === ps.length && ps.length > 0);
    });
    var doneAll = steps.filter(function (s) { return s.cb.checked; }).length;
    $("#ns-meter > i").style.width = (steps.length ? doneAll / steps.length * 100 : 0) + "%";
    $("#ns-count").textContent = doneAll + " of " + steps.length + " route steps done (" + Math.round(doneAll / Math.max(1, steps.length) * 100) + "%)";
    var next = nextStep();
    if (next) {
      $("#ns-ctx").textContent = next.ctx;
      var t = next.li.querySelector("span").textContent.trim();
      $("#ns-text").textContent = t.length > 170 ? t.slice(0, 167) + "…" : t;
      $("#ns-go").disabled = $("#ns-done").disabled = false;
    } else {
      $("#ns-ctx").textContent = "";
      $("#ns-text").textContent = "Every route step is done. Nice work.";
      $("#ns-go").disabled = $("#ns-done").disabled = true;
    }
  }
  function nextStep() {
    var f = state.filter;
    var pool = steps.filter(function (s) { return !s.cb.checked; });
    if (f !== "all") {
      var mine = pool.filter(function (s) { return !s.li.classList.contains("f-dim"); });
      if (mine.length) pool = mine;
    }
    return pool[0] || null;
  }
  function reveal(el) {
    var d = el.closest("details.phase-d");
    if (d && !d.open) d.open = true;
    setTimeout(function () {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    }, 60);
  }
  $("#ns-go").addEventListener("click", function () { var n = nextStep(); if (n) reveal(n.li); });
  $("#ns-done").addEventListener("click", function () { var n = nextStep(); if (n) { setStep(n, true); toast("Step done"); } });

  /* ---------- army tracker ---------- */
  function rested(s) {
    if (!s.parkedAt) return null;
    var wr = state.wellRested ? 1.2 : 1, rate = 0.05 / 8 * wr, cap = 1.5 * wr;
    var h = Math.max(0, (Date.now() - s.parkedAt) / 36e5);
    var r = Math.min(cap, h * rate);
    return { r: r, cap: cap, pct: r / cap, full: r >= cap, hoursLeft: (cap - r) / rate };
  }
  function fmtHours(h) {
    if (h < 1) return Math.max(1, Math.ceil(h * 60)) + "m";
    if (h < 48) return Math.floor(h) + "h " + Math.round((h % 1) * 60) + "m";
    return (h / 24).toFixed(1) + " days";
  }
  function charPoints(c) {
    var s = state.chars[c.id];
    var lv = [25, 45, 60].filter(function (l) { return s.level >= l; }).length, pr = 0;
    c.profs.forEach(function (p) { var v = s.prof[p] || 0; pr += [150, 225, 300].filter(function (t) { return v >= t; }).length; });
    return lv + pr;
  }
  function tickHTML(marks, max) {
    return marks.map(function (m) { return '<span class="tick" data-v="' + m + '" style="left:calc(' + (m / max * 100) + '% - 1px)"></span>'; }).join("");
  }
  function stepper(btnAttrs, inputAttrs, label, value, min, max, step) {
    return '<button class="stepbtn" type="button" ' + btnAttrs + ' data-d="-' + step + '" aria-label="' + label + ' down">&minus;</button>' +
      '<input class="num-in" type="number" inputmode="numeric" min="' + min + '" max="' + max + '" ' + inputAttrs + ' value="' + value + '" aria-label="' + label + '">' +
      '<button class="stepbtn" type="button" ' + btnAttrs + ' data-d="' + step + '" aria-label="' + label + ' up">+</button>';
  }
  function cardHTML(c) {
    var s = state.chars[c.id];
    var rows = '<div class="trow"><div class="tline"><span class="lab">Level</span>' + stepper('data-act="lvl"', 'data-k="level"', "Level", s.level, 1, 60, 1) + '</div>' +
      '<span class="meter cls" data-k="lvlbar"><i></i>' + tickHTML([25, 45], 60) + '<span class="tick tgt" style="left:calc(' + (c.target / 60 * 100) + '% - 1px)"></span></span></div>';
    rows += c.profs.map(function (p) {
      return '<div class="trow"><div class="tline"><span class="lab">' + profIcon(p) + p + '</span>' + stepper('data-act="prof" data-p="' + p + '"', 'data-prof="' + p + '"', p, s.prof[p] || 0, 0, 300, 5) + '</div>' +
        '<span class="meter" data-pbar="' + p + '"><i></i>' + tickHTML([150, 225], 300) + '</span></div>';
    }).join("");
    if (c.gather) rows += '<div class="tline gath"><span class="lab">' + profIcon(c.gather) + c.gather + '</span><span class="tag">Gathering</span></div>';
    var sub = (c.race ? raceIcon(c.race) + RACE_NAMES[c.race] : "Any race") + " · " + c.slot + " · to " + c.target;
    return '<article class="char' + (c.core ? " core" : "") + '" data-id="' + c.id + '" style="--cls:var(--c-' + c.cls + ')">' +
      '<header>' + token(c.cls, "lg") + '<div class="char-name"><b>' + (c.race ? c.name : CLASS_NAMES[c.cls]) + '</b><small>' + sub + '</small></div><span class="badge" data-k="pts"></span></header>' +
      '<div class="trows">' + rows + '</div>' +
      '<div class="rest"><div class="rest-row"><span data-k="resttext"></span><button class="btn sm" type="button" data-act="park"></button></div>' +
        '<span class="meter rested" data-k="restbar"><i></i></span></div>' +
      '</article>';
  }
  var army = $("#army");
  army.innerHTML = CHARS.map(cardHTML).join("");
  function updateCard(c) {
    var card = army.querySelector('[data-id="' + c.id + '"]'), s = state.chars[c.id];
    var pts = charPoints(c), b = card.querySelector('[data-k="pts"]');
    b.textContent = pts + (pts === 1 ? " pt" : " pts"); b.classList.toggle("zero", pts === 0);
    card.classList.toggle("done", s.level >= c.target);
    var lb = card.querySelector('[data-k="lvlbar"]');
    lb.querySelector("i").style.width = (s.level / 60 * 100) + "%";
    lb.classList.toggle("ok", s.level >= c.target);
    $$(".tick[data-v]", lb).forEach(function (t) { t.classList.toggle("hit", s.level >= +t.dataset.v); });
    c.profs.forEach(function (p) {
      var v = s.prof[p] || 0, m = card.querySelector('[data-pbar="' + p + '"]');
      m.querySelector("i").style.width = (v / 300 * 100) + "%";
      $$(".tick", m).forEach(function (t) { t.classList.toggle("hit", v >= +t.dataset.v); });
      m.classList.toggle("ok", v >= 150);
    });
    var r = rested(s), rt = card.querySelector('[data-k="resttext"]'), rb = card.querySelector('[data-k="restbar"] i'), btn = card.querySelector('[data-act="park"]');
    if (r) {
      rb.style.width = (r.pct * 100) + "%";
      rt.innerHTML = '<span class="parked-tag">Parked</span> · ~' + Math.round(r.r * 100) + "% of a level" + (r.full ? " · full" : " · full in " + fmtHours(r.hoursLeft));
      btn.textContent = "Play";
    } else {
      rb.style.width = "0%"; rt.textContent = "Playing, not resting"; btn.textContent = "Park";
    }
  }
  function updateArmy() {
    CHARS.forEach(updateCard);
    var total = CHARS.reduce(function (a, c) { return a + charPoints(c); }, 0) + (+state.extra || 0);
    $("#lp-total").textContent = total;
    $("#lp-spend").textContent = Math.min(16, total);
    $("#lp-meter > i").style.width = Math.min(100, total / 55 * 100) + "%";
    $("#lp-tiers").innerHTML = TIERS.map(function (t) {
      return '<span class="' + (total >= t ? "hit" : "") + '" style="left:' + Math.min(96, Math.max(4, t / 55 * 100)) + '%">' + t + (t === 55 ? " bear" : "") + "</span>";
    }).join("");
    $("#lp-meter").innerHTML = '<i style="width:' + Math.min(100, total / 55 * 100) + '%"></i>' + TIERS.map(function (t) {
      return '<span class="tick' + (total >= t ? " hit" : "") + '" style="left:calc(' + (t / 55 * 100) + '% - 1px)"></span>';
    }).join("") + '<span class="tick" style="left:calc(' + (16 / 55 * 100) + '% - 1px);background:var(--accent);opacity:1" title="16 spendable"></span>';
    var nt = TIERS.filter(function (t) { return t > total; })[0];

    var bestL = null, bestP = null;
    CHARS.forEach(function (c) {
      var s = state.chars[c.id];
      var nl = [25, 45, 60].filter(function (l) { return s.level < l; })[0];
      if (nl && (!bestL || nl - s.level < bestL.away)) bestL = { away: nl - s.level, txt: c.name + " → " + nl + " (" + (nl - s.level) + " lvl)" };
      c.profs.forEach(function (p) {
        var v = s.prof[p] || 0, np = [150, 225, 300].filter(function (t) { return v < t; })[0];
        if (np && (!bestP || np - v < bestP.away)) bestP = { away: np - v, txt: p + " → " + np + " (" + (np - v) + ")" };
      });
    });
    $("#near-lvl").textContent = bestL ? bestL.txt : "All done";
    $("#near-prof").textContent = bestP ? bestP.txt : "All done";

    var cands = CHARS.map(function (c) { return { c: c, s: state.chars[c.id], r: rested(state.chars[c.id]) }; })
      .filter(function (x) { return x.r && x.s.level < x.c.target; })
      .sort(function (a, b) { return b.r.pct - a.r.pct; });
    $$(".char.next", army).forEach(function (el) { el.classList.remove("next"); });
    if (cands.length) {
      var top = cands[0];
      army.querySelector('[data-id="' + top.c.id + '"]').classList.add("next");
      $("#pn-text").innerHTML = "<b>" + top.c.name + "</b> · level " + top.s.level;
      $("#pn-sub").textContent = "~" + Math.round(top.r.r * 100) + "% of a level rested" + (top.r.full ? " (full, you're losing rested time)" : ", full in " + fmtHours(top.r.hoursLeft)) +
        (cands[1] ? ". After that: " + cands[1].c.name + "." : ".");
    } else {
      $("#pn-text").textContent = "No one is parked yet.";
      $("#pn-sub").textContent = "Tap Park on a character in the army tracker when you log them out.";
    }
  }
  function setLevel(c, v) { state.chars[c.id].level = clamp(Math.round(+v || 1), 1, 60); }
  army.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-act]"); if (!b) return;
    var card = b.closest(".char"), c = CHARS.filter(function (x) { return x.id === card.dataset.id; })[0], s = state.chars[c.id];
    if (b.dataset.act === "lvl") {
      var before = charPoints(c);
      setLevel(c, s.level + (+b.dataset.d)); card.querySelector('[data-k="level"]').value = s.level;
      if (charPoints(c) > before) toast(c.name + " earned a Legacy Point");
    } else if (b.dataset.act === "prof") {
      var p = b.dataset.p, before2 = charPoints(c);
      s.prof[p] = clamp((s.prof[p] || 0) + (+b.dataset.d), 0, 300);
      card.querySelector('[data-prof="' + p + '"]').value = s.prof[p];
      if (charPoints(c) > before2) toast(p + " earned a Legacy Point");
    } else if (b.dataset.act === "park") {
      if (s.parkedAt) { s.parkedAt = null; toast("Now playing " + c.name); }
      else { s.parkedAt = Date.now(); toast(c.name + " parked. Rested XP is building."); }
    }
    save(); updateArmy();
  });
  army.addEventListener("change", function (e) {
    var inp = e.target; if (!inp.matches("input")) return;
    var card = inp.closest(".char"), c = CHARS.filter(function (x) { return x.id === card.dataset.id; })[0], s = state.chars[c.id];
    if (inp.dataset.k === "level") { setLevel(c, inp.value); inp.value = s.level; }
    if (inp.dataset.prof) { s.prof[inp.dataset.prof] = clamp(Math.round(+inp.value || 0), 0, 300); inp.value = s.prof[inp.dataset.prof]; }
    save(); updateArmy();
  });
  army.addEventListener("focusin", function (e) { if (e.target.matches(".num-in")) e.target.select(); });
  var wr = $("#opt-wr"), extra = $("#opt-extra");
  wr.checked = !!state.wellRested; extra.value = state.extra || 0;
  wr.addEventListener("change", function () { state.wellRested = wr.checked; save(); updateArmy(); });
  extra.addEventListener("change", function () { state.extra = clamp(Math.round(+extra.value || 0), 0, 99); extra.value = state.extra; save(); updateArmy(); });

  /* ---------- character focus filter ---------- */
  function tagsOf(text) {
    var out = [];
    Object.keys(CLASS_RE).forEach(function (k) { if (CLASS_RE[k].test(text)) out.push(k); });
    if (out.length) return out;
    Object.keys(TOPIC_RE).forEach(function (k) { if (TOPIC_RE[k].test(text)) out.push(k); });
    return out;
  }
  var filterUnits = [];
  steps.forEach(function (s) {
    var ht = s.h3 ? tagsOf(s.h3.textContent) : [];
    filterUnits.push({ el: s.li, tags: ht.length ? ht : tagsOf(s.li.textContent) });
  });
  $$("#basics .rc").forEach(function (rc) { filterUnits.push({ el: rc, tags: [rc.dataset.f] }); });
  function applyFilter() {
    var f = state.filter;
    document.documentElement.style.setProperty("--focus", CLASS_NAMES[f] ? "var(--c-" + f + ")" : "var(--accent)");
    $$(".chip").forEach(function (ch) { ch.setAttribute("aria-pressed", String(ch.dataset.f === f)); });
    filterUnits.forEach(function (u) {
      var tagged = u.tags.length > 0, mine = u.tags.indexOf(f) >= 0;
      u.el.classList.toggle("f-dim", f !== "all" && tagged && !mine);
      u.el.classList.toggle("f-hit", f !== "all" && mine);
    });
    $$(".char", army).forEach(function (card) {
      var c = CHARS.filter(function (x) { return x.id === card.dataset.id; })[0];
      card.classList.toggle("f-hit", f !== "all" && (f === c.id || (f === "support" && !c.core)));
    });
    refreshProgress();
  }
  $$(".chip").forEach(function (ch) {
    ch.addEventListener("click", function () {
      state.filter = ch.dataset.f; save(); applyFilter();
      if (ch.dataset.f !== "all") toast("Highlighting " + ch.textContent + " steps. Others are dimmed.");
    });
  });

  /* ---------- search ---------- */
  var searchInput = $("#q"), openBefore = null;
  var units = $$("#main li, #basics .rc, #main .grid2 > .callout, #launch > .callout").filter(function (el) { return !el.closest("#dashboard, #army-section"); });
  function clearMarks() {
    $$("mark.hl").forEach(function (m) { var p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); });
  }
  function markIn(el, q) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var low = n.nodeValue.toLowerCase(), idx = low.indexOf(q);
      if (idx < 0) return;
      var frag = document.createDocumentFragment(), last = 0;
      while (idx >= 0) {
        frag.appendChild(document.createTextNode(n.nodeValue.slice(last, idx)));
        var m = document.createElement("mark"); m.className = "hl"; m.textContent = n.nodeValue.slice(idx, idx + q.length);
        frag.appendChild(m); last = idx + q.length; idx = low.indexOf(q, last);
      }
      frag.appendChild(document.createTextNode(n.nodeValue.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
  }
  function runSearch() {
    var q = searchInput.value.trim().toLowerCase();
    clearMarks();
    $$(".s-miss").forEach(function (el) { el.classList.remove("s-miss"); });
    if (!q) {
      document.body.classList.remove("searching");
      $("#q-count").textContent = "";
      if (openBefore) { phases.forEach(function (d, i) { d.open = openBefore[i]; }); openBefore = null; }
      return;
    }
    if (!openBefore) openBefore = phases.map(function (d) { return d.open; });
    document.body.classList.add("searching");
    var n = 0;
    units.forEach(function (u) {
      var hit = u.textContent.toLowerCase().indexOf(q) >= 0;
      if (hit) { n++; markIn(u, q); } else u.classList.add("s-miss");
    });
    $$("#main ul, #main ol").forEach(function (l) {
      if (l.closest("#dashboard, #army-section")) return;
      if (l.children.length && !l.querySelector(":scope > li:not(.s-miss)")) l.classList.add("s-miss");
    });
    $$("#main .table-wrap").forEach(function (t) { if (!t.querySelector("tbody tr:not(.s-miss)")) t.classList.add("s-miss"); });
    $$(".phase h3").forEach(function (h) { var nx = h.nextElementSibling; if (nx && nx.classList.contains("s-miss")) h.classList.add("s-miss"); });
    phases.forEach(function (d) { var any = d.querySelector("li:not(.s-miss)"); if (any) d.open = true; else d.classList.add("s-miss"); });
    $$("section.sec").forEach(function (sec) {
      if (sec.id === "dashboard" || sec.id === "army-section") { sec.classList.add("s-miss"); return; }
      var any = sec.querySelector("li:not(.s-miss), .rc:not(.s-miss), .grid2 > .callout:not(.s-miss), #launch > .callout:not(.s-miss)");
      var txtHit = !any && sec.textContent.toLowerCase().indexOf(q) >= 0;
      if (!any && !txtHit) sec.classList.add("s-miss");
      else if (txtHit) markIn(sec, q);
    });
    $("#q-count").textContent = n + (n === 1 ? " hit" : " hits");
    $("#search-empty").classList.toggle("show", !$("section.sec:not(.s-miss)"));
  }
  var searchTimer;
  searchInput.addEventListener("input", function () { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 140); });
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { searchInput.value = ""; runSearch(); searchInput.blur(); }
    if (e.key === "Enter") { var m = $("mark.hl"); if (m) { m.scrollIntoView({ behavior: "smooth", block: "center" }); searchInput.blur(); } }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !e.target.closest("input, textarea")) { e.preventDefault(); searchInput.focus(); }
  });
  $("#tab-search").addEventListener("click", function () { window.scrollTo({ top: 0 }); searchInput.focus(); });

  function setAllPhases(open) { phases.forEach(function (d, i) { d.open = open; state.open[i] = open; }); save(); }
  $$("[data-route]").forEach(function (b) { b.addEventListener("click", function () { setAllPhases(b.dataset.route === "expand"); }); });

  /* ---------- menu actions ---------- */
  var menu = $("#menu");
  document.addEventListener("click", function (e) {
    if (menu.open && !e.target.closest("#menu")) menu.open = false;
    var lm = $("#look-menu"); if (lm.open && !e.target.closest("#look-menu")) lm.open = false;
  });
  var wakeLock = null, wantWake = false;
  if ("wakeLock" in navigator) $("#wake-btn").hidden = false;
  function requestWake() {
    return navigator.wakeLock.request("screen").then(function (l) {
      wakeLock = l; l.addEventListener("release", function () { wakeLock = null; });
    });
  }
  document.addEventListener("visibilitychange", function () { if (wantWake && !wakeLock && document.visibilityState === "visible") requestWake().catch(function () {}); });
  $(".menu-panel").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-act]"); if (!b) return;
    var act = b.dataset.act; menu.open = false;
    if (act === "expand" || act === "collapse") {
      setAllPhases(act === "expand");
    } else if (act === "wake") {
      if (wantWake) { wantWake = false; if (wakeLock) wakeLock.release(); b.textContent = "Keep screen on"; toast("Screen can sleep again"); }
      else requestWake().then(function () { wantWake = true; b.textContent = "Let screen sleep"; toast("Screen will stay on while this page is open"); })
        .catch(function () { toast("This browser won't keep the screen on"); });
    } else if (act === "export") {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "legacy-route-progress-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast("Progress exported");
    } else if (act === "import") {
      $("#import-file").click();
    } else if (act === "print") {
      window.print();
    } else if (act === "reset") {
      if (!confirm("Reset levels, skills, parked times, and steps? This can't be undone. Export first if you want a backup.")) return;
      var keepTheme = state.theme; state = defaults(); state.theme = keepTheme;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) {}
      location.reload();
    }
  });
  $("#import-file").addEventListener("change", function () {
    var f = this.files[0]; if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var s = JSON.parse(reader.result);
        if (!s || typeof s !== "object" || !s.chars) throw new Error("bad");
        localStorage.setItem(KEY, JSON.stringify(s)); location.reload();
      } catch (err) { toast("That file isn't a Legacy Route progress export"); }
    };
    reader.readAsText(f);
  });
  var printing = false, openPrint = null;
  window.addEventListener("beforeprint", function () { printing = true; openPrint = phases.map(function (d) { return d.open; }); phases.forEach(function (d) { d.open = true; }); });
  window.addEventListener("afterprint", function () { if (openPrint) phases.forEach(function (d, i) { d.open = openPrint[i]; }); printing = false; });

  setInterval(updateArmy, 60000);

  /* ---------- header behavior, scrollspy, back to top ---------- */
  var top = $("#top");
  function measure() { if (top.classList.contains("compact")) return; document.documentElement.style.setProperty("--hdr", top.offsetHeight + "px"); }
  window.addEventListener("resize", measure);
  var lastY = scrollY;
  window.addEventListener("scroll", function () {
    var y = scrollY;
    if (Math.abs(y - lastY) > 12) { top.classList.toggle("compact", y > lastY && y > 300); lastY = y; }
    $("#totop").classList.toggle("show", y > 900);
  }, { passive: true });
  $("#totop").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  var navLinks = $$("nav.sections a, .tabbar a");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        navLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + id); });
        var act = $("nav.sections a.active"); if (act && act.scrollIntoView) act.parentNode.scrollLeft = act.offsetLeft - 40;
      });
    }, { rootMargin: "-30% 0px -65% 0px" });
    $$("section.sec").forEach(function (s) { io.observe(s); });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var t = document.getElementById(a.getAttribute("href").slice(1)); if (!t) return;
    var d = t.closest("details.phase-d"); if (d) d.open = true;
  });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  if (document.fonts) document.fonts.ready.then(measure);
  applyTheme(); measure(); applyFilter(); updateArmy(); 
})();
