/* Clancy case fact-check: app logic. Content lives in js/data.js. */
(function () {
  "use strict";
  const D = window.CLANCY_DATA;
  const S = D.S;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- preferences (safe if storage is unavailable) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("cfc:" + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("cfc:" + k, v); } catch (e) { /* ignore */ } }
  };
  const prefs = {
    theme: store.get("theme", "auto"),
    size: store.get("size", "m"),
    links: store.get("links", "subtle"),
    expand: store.get("expand", "collapsed")
  };
  function applyPrefs() {
    const h = document.documentElement;
    h.setAttribute("data-theme", prefs.theme);
    h.setAttribute("data-size", prefs.size);
    h.setAttribute("data-links", prefs.links);
    $$(".seg").forEach((seg) => {
      const key = seg.dataset.pref;
      seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.val === prefs[key]));
    });
  }

  /* ---------- state ---------- */
  const state = { tab: "overview", q: "", cat: "all", tl: "day", ptag: "all", ftype: "all", checks: {}, opened: {} };
  const TABS = [
    ["overview", "Overview"], ["timeline", "Timelines"], ["claims", "Claims about Patrick"],
    ["myths", "Misinformation"], ["proof", "Proof she did it"], ["why", "Why she did it"],
    ["evidence", "Why he's ruled out"], ["files", "Court files and video"], ["criticism", "Fair criticism"],
    ["sources", "Sources"], ["about", "About"]
  ];
  const label = (k) => (TABS.find((t) => t[0] === k) || [k, k])[1];

  /* ---------- text helpers ---------- */
  const linkRe = /\[\[([a-z0-9_]+)\|([^\]]+)\]\]/g;
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function md(s) {
    return s.replace(linkRe, (m, k, t) => {
      const src = S[k];
      if (!src) { console.error("Unknown source key", k); return t; }
      return `<a href="${src.u}" target="_blank" rel="noopener" title="${esc(src.o)}: ${esc(src.t)} (${esc(src.d)})">${t}</a>`;
    });
  }
  function plain(s) { return s.replace(linkRe, "$2"); }
  function keysIn() {
    const out = [];
    Array.from(arguments).join(" ").replace(linkRe, (m, k) => { if (S[k] && !out.includes(k)) out.push(k); return m; });
    return out;
  }
  function cites(keys, cls) {
    if (!keys.length) return "";
    return `<div class="cites ${cls || ""}"><span class="lbl">Sources</span>${keys.map((k) =>
      `<a class="cite" href="${S[k].u}" target="_blank" rel="noopener" title="${esc(S[k].t)} (${esc(S[k].d)})">${esc(S[k].o)}</a>`).join("")}</div>`;
  }
  function hl(html) {
    const q = state.q.trim();
    if (!q) return html;
    const re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return html.split(/(<[^>]+>)/g).map((p) => (p.startsWith("<") ? p : p.replace(re, "<mark>$1</mark>"))).join("");
  }
  function matches() {
    const q = state.q.trim().toLowerCase();
    if (!q) return true;
    return plain(Array.from(arguments).join(" ")).toLowerCase().includes(q);
  }

  /* ---------- search helpers ---------- */
  function tabMatches() {
    const q = state.q.trim();
    if (!q) return {};
    const ql = q.toLowerCase();
    return {
      timeline: D.TIMELINE.filter((r) => matches(r.t, r.x)).length + D.CASE_TIMELINE.filter((r) => matches(r.t, r.x)).length,
      myths: D.MYTHS.filter((m) => matches(m.claim, m.fact)).length,
      claims: D.CLAIMS.filter((c) => matches(c.claim, c.rec)).length,
      evidence: D.EVIDENCE.filter((e) => matches(e.k, e.x)).length,
      criticism: D.CRITICISMS.filter((c) => matches(c)).length + D.CHECKS.filter((c) => matches(c)).length,
      proof: D.PROOF.filter((p) => matches(p.k, p.tag, p.x)).length,
      why: [...D.WHY.agreed, ...D.WHY.prosecution, ...D.WHY.defense, ...D.WHY.jury].filter((c) => matches(c)).length,
      files: D.RESOURCES.filter((r) => matches(r.type, r.note, S[r.key].o, S[r.key].t)).length,
      sources: Object.values(S).filter((s) => (s.o + " " + s.t + " " + s.d + " " + s.u).toLowerCase().includes(ql)).length
    };
  }
  function bestTab() {
    const m = tabMatches();
    let best = "claims", n = -1;
    Object.entries(m).forEach(([k, v]) => { if (v > n) { best = k; n = v; } });
    return n > 0 ? best : "claims";
  }
  function empty() {
    const m = tabMatches();
    const others = Object.entries(m).filter(([k, v]) => k !== state.tab && v > 0)
      .map(([k, v]) => `<button class="chip" data-tab="${k}">${label(k)} (${v})</button>`).join("");
    return `<div class="empty"><p>No matches for "${esc(state.q)}" in this section.</p>${others
      ? `<p class="small">Found elsewhere:</p><div class="controls" style="justify-content:center">${others}</div>`
      : `<p class="small">Try a time (5:34), a name (Carney, Saathoff), or a keyword (shoes, watch, lemonade, GoFundMe).</p>`}</div>`;
  }

  /* ---------- pieces ---------- */
  function isOpen(id) {
    if (state.q.trim()) return true;
    if (id in state.opened) return state.opened[id];
    return prefs.expand === "expanded";
  }
  function entry(o) {
    const keys = keysIn(o.claim, o.record);
    const open = isOpen(o.id);
    return `<article class="entry ${open ? "open" : ""}" id="${o.id}">
      <div class="entry-head"><span class="ref">${o.ref}</span><span class="verdict ${o.vc}">${o.verdict}</span><span class="spacer"></span>
        <button class="act" data-share="${o.id}">Share</button><button class="act" data-copy="${o.id}">Copy link</button></div>
      <button class="claimbtn" data-toggle="${o.id}" aria-expanded="${open}" aria-controls="${o.id}-rec">
        <span class="txt">${hl(md(o.claim))}</span>
        <svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="record" id="${o.id}-rec"><p>${hl(md(o.record))}</p></div>
      ${cites(keys)}
    </article>`;
  }
  function secnav() {
    const order = ["overview", "timeline", "claims", "myths", "proof", "why", "evidence", "files", "criticism", "sources", "about"];
    const i = order.indexOf(state.tab);
    const prev = i > 0 ? order[i - 1] : null, next = i < order.length - 1 ? order[i + 1] : null;
    return `<nav class="secnav" aria-label="Section navigation">
      ${prev ? `<button data-tab="${prev}"><span class="lab">Previous</span>${label(prev)}</button>` : "<span></span>"}
      ${next ? `<button class="next" data-tab="${next}"><span class="lab">Next</span>${label(next)}</button>` : ""}
    </nav>`;
  }
  function expandChip() {
    const allOpen = prefs.expand === "expanded";
    return `<button class="chip" data-expandall="${allOpen ? "collapsed" : "expanded"}">${allOpen ? "Collapse all" : "Expand all"}</button>`;
  }

  /* ---------- views ---------- */
  function vOverview() {
    const allText = [...D.STATUS, ...D.TIMELINE.map((t) => t.x), ...D.CASE_TIMELINE.map((t) => t.x), ...D.MYTHS.map((m) => m.claim + m.fact),
      ...D.CLAIMS.map((c) => c.claim + c.rec), ...D.WHY.agreed, ...D.WHY.prosecution, ...D.WHY.defense, ...D.WHY.jury,
      ...D.PROOF.map((p) => p.x), ...D.EVIDENCE.map((e) => e.x), ...D.CRITICISMS, ...D.CHECKS, ...D.RESOURCES.map((r) => r.note)].join(" ");
    const linkCount = (allText.match(linkRe) || []).length;
    return `
    <p class="lede">Patrick Clancy was on camera fifteen to twenty minutes away. Lindsay Clancy does not deny the killings, and a child still had a pulse when police arrived. Everything else people are "just asking" about is checked here, and every underlined phrase opens the report, court file or video it came from.</p>
    <p class="meta">${D.CLAIMS.length} theories about Patrick, ${D.MYTHS.length} pieces of misinformation, ${D.PROOF.length} categories of proof, ${D.RESOURCES.length} court files and videos, ${linkCount} linked facts, ${Object.keys(S).length} sources. Updated ${D.UPDATED}.</p>
    <div class="note"><p>${md(`<strong>Read this first.</strong> [[bdc_consp|Patrick Clancy is not on trial, has never been charged, and prosecutors have never indicated he played any role]] in the deaths of Cora (5), Dawson (3) and Callan (8 months) on Jan. 24, 2023. [[cbsb_bestdays|He was the prosecution's first witness]]. [[bdc_consp|Lindsay Clancy does not deny strangling the children; her defense is that she was in the throes of postpartum mental illness and not criminally responsible]] ([[bdc_insanity|how the insanity defense works in Massachusetts]]). The items under "Claims about Patrick" are social-media claims, not evidence.`)}</p></div>
    <h3>Where the case stands</h3>
    <ul class="plain">${D.STATUS.map((s) => `<li>${md(s)}</li>`).join("")}</ul>
    <h3>Open a section</h3>
    <div class="list">
      <button class="row" data-tab="claims">Claims about Patrick<span class="sub">${D.CLAIMS.length} theories from TikTok, Reddit and YouTube, including the house sale and the "apartment before" story, each against the record</span></button>
      <button class="row" data-tab="proof">Proof she did it<span class="sub">${D.PROOF.length} categories: admissions, device data, DNA, the medical clock, witnesses</span></button>
      <button class="row" data-tab="why">Why she did it<span class="sub">What both sides agree on, the prosecution's answer, the defense's answer, what the jury did with it</span></button>
      <button class="row" data-tab="timeline">Timelines<span class="sub">Jan. 24 minute by minute, and the case from 2022 to the Sept. 29 hearing</span></button>
      <button class="row" data-tab="myths">Misinformation<span class="sub">${D.MYTHS.length} claims about the case, marked false, misleading or unverified</span></button>
      <button class="row" data-tab="evidence">Why he's ruled out<span class="sub">The affirmative evidence, in one ledger</span></button>
      <button class="row" data-tab="files">Court files and video<span class="sub">${D.RESOURCES.length} warrants, motions, the lawsuit, dockets, full testimony and closings</span></button>
      <button class="row" data-tab="criticism">Fair criticism<span class="sub">What is legitimately debatable about Patrick, and why it is a different question</span></button>
      <button class="row" data-tab="sources">Sources<span class="sub">${Object.keys(S).length} reports, with dates and links</span></button>
    </div>
    ${secnav()}`;
  }
  function vTimeline() {
    const chips = `<div class="chips-scroll"><button class="chip ${state.tl === "day" ? "on" : ""}" data-tl="day">Jan. 24, minute by minute</button><button class="chip ${state.tl === "case" ? "on" : ""}" data-tl="case">The case, 2022 to 2026</button></div>`;
    if (state.tl === "case") {
      const rows = D.CASE_TIMELINE.filter((r) => matches(r.t, r.x));
      return `<h2>The case, 2022 to 2026</h2>${chips}
      <p class="muted small">Her treatment, the killings, the investigation, the house, the move, the lawsuits and the trial, in order.</p>
      ${rows.length ? `<div class="tl">${rows.map((r) => `<div class="row"><div class="t">${hl(r.t)}</div><div>${hl(md(r.x))}</div>${cites(keysIn(r.x))}</div>`).join("")}</div>` : empty()}
      ${secnav()}`;
    }
    const rows = D.TIMELINE.filter((r) => matches(r.t, r.x));
    return `<h2>January 24, 2023</h2>${chips}
    <p class="muted small">From the prosecutors' 2023 arraignment presentation, warrant affidavits and 2026 trial testimony. Underlined text opens the source.</p>
    <div class="legend"><i style="background:var(--ui)"></i>Lindsay <i style="background:var(--record)"></i>Patrick</div>
    ${rows.length ? `<div class="tl">${rows.map((r) => `<div class="row ${r.who === "P" ? "pat" : ""}"><div class="t">${hl(r.t)}</div><div>${hl(md(r.x))}</div>${cites(keysIn(r.x))}</div>`).join("")}</div>` : empty()}
    ${secnav()}`;
  }
  function vWhy() {
    const block = (title, cls, items) => {
      const rows = items.filter((c) => matches(c));
      if (!rows.length) return "";
      return `<section class="side ${cls}"><h3>${title}</h3><ul class="plain">${rows.map((c) => `<li>${hl(md(c))}</li>`).join("")}</ul></section>`;
    };
    const out = block("What both sides agree on", "agreed", D.WHY.agreed) + block("The prosecution's answer: it was a choice", "pros", D.WHY.prosecution) +
      block("The defense's answer: her mind was gone", "def", D.WHY.defense) + block("What the jury was given, and what it did", "jury", D.WHY.jury);
    return `<h2>Why she did it</h2>
    <p class="muted small">Nobody at trial disputed who. The whole fight was why, and whether the why makes her criminally responsible. Both answers are laid out with the testimony behind each.</p>
    ${out || empty()}
    ${secnav()}`;
  }
  function vProof() {
    const tags = ["all"].concat(Array.from(new Set(D.PROOF.map((p) => p.tag))));
    const rows = D.PROOF.filter((p) => (state.ptag === "all" || p.tag === state.ptag) && matches(p.k, p.tag, p.x));
    return `<h2>Proof she did it</h2>
    <p class="muted small">Every category of evidence that she, and only she, carried out the killings, regardless of what the internet says. Each line links to testimony, a filing or a recording.</p>
    <div class="chips-scroll">${tags.map((t) => `<button class="chip ${state.ptag === t ? "on" : ""}" data-ptag="${t}">${t === "all" ? "All types" : t}</button>`).join("")}</div>
    ${rows.length ? `<div class="ledger">${rows.map((p) => `<div class="item"><div class="k">${hl(p.k)}<span class="tag">${p.tag}</span></div><div><p>${hl(md(p.x))}</p>${cites(keysIn(p.x))}</div></div>`).join("")}</div>` : empty()}
    ${secnav()}`;
  }
  function vFiles() {
    const types = ["all", "Document", "Docket", "Video", "Live blog"];
    const rows = D.RESOURCES.filter((r) => (state.ftype === "all" || r.type === state.ftype) && matches(r.type, r.note, S[r.key].o, S[r.key].t));
    return `<h2>Court files and video</h2>
    <p class="muted small">The primary record: warrant filings, the stipulation motion, the civil complaint, the DA's releases, docket portals, and full-length trial video. Unofficial archives are labeled; check them against originals.</p>
    <div class="chips-scroll">${types.map((t) => `<button class="chip ${state.ftype === t ? "on" : ""}" data-ftype="${t}">${t === "all" ? "Everything" : t + "s"}</button>`).join("")}</div>
    ${rows.length ? rows.map((r) => { const s = S[r.key]; return `<div class="file"><div class="ftype ${r.type.replace(/\s/g, "").toLowerCase()}">${r.type}</div><div class="fbody"><a class="ft" href="${s.u}" target="_blank" rel="noopener">${hl(esc(s.t))}</a><div class="meta">${hl(esc(s.o))}, ${hl(esc(s.d))}</div><p>${hl(md(r.note))}</p></div></div>`; }).join("") : empty()}
    ${secnav()}`;
  }
  function vMyths() {
    const rows = D.MYTHS.filter((m) => matches(m.claim, m.fact));
    return `<h2>Misinformation about the case, checked</h2>
    <p class="muted small">Tap a claim to open what the record says.</p>
    <div class="controls">${expandChip()}<span class="count">${rows.length} of ${D.MYTHS.length}</span></div>
    ${rows.length ? rows.map((m) => entry({ id: "myth-" + m.id, ref: "#" + m.id, verdict: m.v, vc: m.vc, claim: m.claim, record: m.fact })).join("") : empty()}
    ${secnav()}`;
  }
  function vClaims() {
    const cats = [["all", "All"], ["A", "Timeline and alibi"], ["B", "Scene and forensics"], ["C", "Digital evidence"], ["D", "Behavior and demeanor"], ["E", "House, move and money"]];
    const rows = D.CLAIMS.filter((c) => (state.cat === "all" || c.cat === state.cat) && matches(c.claim, c.rec));
    return `<h2>The "Patrick did it" claims, against the record</h2>
    <div class="note"><p>${md(`These theories circulate on TikTok, Instagram, YouTube and Reddit and were compiled from reporting by [[cnn_consp|CNN]], [[bdc_consp|Boston.com]], [[bg_consp|The Boston Globe]], [[variety|Variety]], [[slate|Slate]], [[mc_theory|Marie Claire]] and [[nn_rumors|NewsNation]]. None was raised by either side at trial. [[cnn_consp|Former NYPD chief Ken Corey calls the pattern cherry-picking facts that seem to point at Patrick while ignoring the facts that exculpate him]].`)}</p></div>
    <div class="chips-scroll">${cats.map(([k, l]) => `<button class="chip ${state.cat === k ? "on" : ""}" data-cat="${k}">${l}</button>`).join("")}</div>
    <div class="controls">${expandChip()}<span class="count">${rows.length} of ${D.CLAIMS.length}</span></div>
    ${rows.length ? rows.map((c) => entry({ id: "claim-" + c.id, ref: c.id, verdict: c.v, vc: c.vc, claim: c.claim, record: c.rec })).join("") : empty()}
    ${secnav()}`;
  }
  function vEvidence() {
    const rows = D.EVIDENCE.filter((e) => matches(e.k, e.x));
    return `<h2>Why investigators ruled Patrick out</h2>
    <p class="muted small">Taken together, this is why he was excluded early and why neither side at trial suggested otherwise.</p>
    ${rows.length ? `<div class="ledger">${rows.map((e) => `<div class="item"><div class="k">${hl(e.k)}</div><div><p>${hl(md(e.x))}</p>${cites(keysIn(e.x))}</div></div>`).join("")}</div>` : empty()}
    ${secnav()}`;
  }
  function vCriticism() {
    const rows = D.CRITICISMS.filter((c) => matches(c));
    const checks = D.CHECKS.filter((c) => matches(c));
    return `<h2>Fair criticism of Patrick that is not evidence of involvement</h2>
    <p class="muted small">Some things said about him are grounded in real testimony. They go to the trial's actual question, whether the family and the medical system missed warning signs, not to who committed the acts.</p>
    ${rows.length ? `<ul class="plain">${rows.map((c) => `<li>${hl(md(c))}</li>`).join("")}</ul>` : ""}
    <h3>Quick filter for the next viral claim</h3>
    ${checks.map((c, i) => `<div class="check"><input type="checkbox" id="chk${i}" data-chk="${i}" ${state.checks[i] ? "checked" : ""}><label for="chk${i}">${hl(md(c))}</label></div>`).join("")}
    ${!rows.length && !checks.length ? empty() : ""}
    ${secnav()}`;
  }
  function vSources() {
    const use = {};
    const all = [...D.STATUS, ...D.TIMELINE.map((t) => t.x), ...D.CASE_TIMELINE.map((t) => t.x), ...D.MYTHS.map((m) => m.claim + " " + m.fact),
      ...D.CLAIMS.map((c) => c.claim + " " + c.rec), ...D.WHY.agreed, ...D.WHY.prosecution, ...D.WHY.defense, ...D.WHY.jury,
      ...D.PROOF.map((p) => p.x), ...D.EVIDENCE.map((e) => e.x), ...D.CRITICISMS, ...D.CHECKS, ...D.RESOURCES.map((r) => r.note)].join(" ");
    all.replace(linkRe, (m, k) => { use[k] = (use[k] || 0) + 1; return m; });
    D.RESOURCES.forEach((r) => { use[r.key] = (use[r.key] || 0) + 1; });
    const q = state.q.trim().toLowerCase();
    const list = Object.entries(S).filter(([k, s]) => !q || (s.o + " " + s.t + " " + s.d + " " + s.u).toLowerCase().includes(q));
    const outlets = new Set(Object.values(S).map((s) => s.o)).size;
    return `<h2>Sources</h2>
    <p class="muted small">${Object.keys(S).length} reports from ${outlets} outlets. Each opens in a new tab. "Cited" counts how many facts link to it.</p>
    ${list.length ? list.map(([k, s]) => `<div class="src" id="src-${k}"><span class="o">${hl(esc(s.o))}</span><span class="d">${hl(esc(s.d))}</span>${use[k] ? `<span class="used">cited ${use[k]}x</span>` : ""}<a class="t" href="${s.u}" target="_blank" rel="noopener">${hl(esc(s.t))}</a><a class="u" href="${s.u}" target="_blank" rel="noopener">${hl(esc(s.u))}</a></div>`).join("") : empty()}
    ${secnav()}`;
  }
  function vAbout() {
    return `<h2>About this app</h2>
    <p>This is a reference for people following the Lindsay Clancy case who want to check a claim against the record. It covers the January 24, 2023 timeline, common misinformation, the online theories that blame Patrick Clancy, the evidence that excluded him, and fair criticism that is not evidence of a crime.</p>
    <h3>How to read it</h3>
    <ul class="plain">
      <li>Every underlined phrase is a link to the news report or court coverage it came from. Set "Source links" to Bold in settings if you want them to stand out.</li>
      <li>Verdict tags: <span class="verdict v-false">False</span> and <span class="verdict v-contra">Contradicted</span> mean the record says otherwise. <span class="verdict v-warn">Unverified</span>, <span class="verdict v-warn">Misleading</span> or <span class="verdict v-warn">Unresolved</span> mean the claim is not established. <span class="verdict v-neutral">Not evidence</span> means the detail is real but does not point at anyone. <span class="verdict v-ok">Explained</span> means a real detail with a documented explanation.</li>
      <li>Search works across every section. If a term is not in the section you are on, the app tells you where it is.</li>
      <li>Share or Copy link on any card gives a link that opens straight to that card.</li>
      <li>"Proof she did it" and "Why she did it" are separate on purpose: the first is what happened, the second is the two competing explanations the jury heard.</li>
      <li>"Court files and video" is the primary record. Read the warrant filings and the stipulation motion and watch the full testimony rather than clips.</li>
    </ul>
    <h3>What it is not</h3>
    <p>It is a summary of public reporting and court testimony, not legal advice, and it does not pretend to know more than the record shows. Patrick Clancy is a private citizen who has never been accused by anyone with access to the evidence. Lindsay Clancy's mental-health history appears here only because it is part of the public trial record.</p>
    <h3>Version</h3>
    <p class="meta">Content updated ${D.UPDATED}. App version ${D.VERSION}. Works offline after the first load.</p>
    ${secnav()}`;
  }
  const VIEWS = { overview: vOverview, timeline: vTimeline, myths: vMyths, claims: vClaims, proof: vProof, why: vWhy, evidence: vEvidence, files: vFiles, criticism: vCriticism, sources: vSources, about: vAbout };

  /* ---------- render ---------- */
  function render() {
    const tm = tabMatches();
    const searching = !!state.q.trim();
    $("#tabs").innerHTML = TABS.map(([k, l]) => {
      const base = k === "myths" ? D.MYTHS.length : k === "claims" ? D.CLAIMS.length : k === "sources" ? Object.keys(S).length : "";
      const n = searching ? (tm[k] ? tm[k] : "") : base;
      return `<button class="tab ${state.tab === k ? "on" : ""}" data-tab="${k}" role="tab" aria-selected="${state.tab === k}">${l}${n !== "" ? `<span class="n">${n}</span>` : ""}</button>`;
    }).join("");
    $$("#dock button[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === state.tab));
    $$("#dock button[data-more]").forEach((b) => b.classList.toggle("on", ["timeline", "myths", "why", "evidence", "criticism", "sources", "about"].includes(state.tab)));
    $("#view").innerHTML = VIEWS[state.tab]();
    $("#searchwrap").classList.toggle("has", searching);
    document.title = (state.tab === "overview" ? "" : label(state.tab) + " | ") + "Clancy case fact-check";
  }

  /* ---------- navigation ---------- */
  function go(tab, id, opts) {
    opts = opts || {};
    if (!VIEWS[tab]) tab = "overview";
    state.tab = tab;
    render();
    const h = id ? `${tab}/${id}` : tab;
    if (!opts.silent && location.hash !== "#" + h) {
      if (opts.replace && history.replaceState) history.replaceState(null, "", "#" + h);
      else location.hash = h;
    }
    if (id) reveal(id);
    else if (!opts.keepScroll && window.scrollTo) window.scrollTo({ top: 0, behavior: "auto" });
  }
  function reveal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains("entry")) { state.opened[id] = true; el.classList.add("open"); const b = el.querySelector("[data-toggle]"); if (b) b.setAttribute("aria-expanded", "true"); }
    el.classList.add("flash");
    if (el.scrollIntoView) el.scrollIntoView({ block: "start" });
  }
  function applyHash() {
    const h = location.hash.replace(/^#\/?/, "");
    if (!h) { if (state.tab !== "overview") go("overview", null, { silent: true }); return; }
    const [tab, id] = h.split("/");
    if (VIEWS[tab]) { state.tab = tab; render(); if (id) reveal(id); else if (window.scrollTo) window.scrollTo({ top: 0, behavior: "auto" }); }
  }

  /* ---------- sheet ---------- */
  let lastFocus = null;
  function openSheet() {
    lastFocus = document.activeElement;
    $("#backdrop").hidden = false; $("#sheet").hidden = false;
    requestAnimationFrame(() => $("#sheet").classList.add("open"));
    document.body.style.overflow = "hidden";
    $("#closesheet").focus();
  }
  function closeSheet() {
    const sh = $("#sheet");
    sh.classList.remove("open");
    document.body.style.overflow = "";
    const done = () => { sh.hidden = true; $("#backdrop").hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); };
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) done(); else setTimeout(done, 260);
  }

  /* ---------- share ---------- */
  function share(id, useShare) {
    const el = document.getElementById(id);
    const url = location.href.split("#")[0] + "#" + state.tab + "/" + id;
    const txt = el && el.querySelector(".claimbtn .txt") ? el.querySelector(".claimbtn .txt").textContent.trim() : "Clancy case fact-check";
    if (useShare && navigator.share) { navigator.share({ title: "Clancy case fact-check", text: txt, url }).catch(() => {}); return; }
    copy(url);
  }
  function copy(txt) {
    const done = () => toast("Link copied");
    const fallback = () => {
      const ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Could not copy. Long-press the address bar instead."); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  }
  let toastT;
  function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1800); }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab],[data-cat],[data-tl],[data-ptag],[data-ftype],[data-expandall],[data-toggle],[data-share],[data-copy],[data-more],[data-pref] button");
    if (!t) return;
    if (t.dataset.tab) { if (!$("#sheet").hidden) closeSheet(); go(t.dataset.tab); return; }
    if (t.dataset.cat) { state.cat = t.dataset.cat; render(); return; }
    if (t.dataset.tl) { state.tl = t.dataset.tl; render(); return; }
    if (t.dataset.ptag) { state.ptag = t.dataset.ptag; render(); return; }
    if (t.dataset.ftype) { state.ftype = t.dataset.ftype; render(); return; }
    if (t.dataset.expandall) { prefs.expand = t.dataset.expandall; store.set("expand", prefs.expand); state.opened = {}; applyPrefs(); render(); return; }
    if (t.dataset.toggle) {
      const id = t.dataset.toggle, el = document.getElementById(id);
      const open = !el.classList.contains("open");
      state.opened[id] = open; el.classList.toggle("open", open); t.setAttribute("aria-expanded", String(open));
      return;
    }
    if (t.dataset.share || t.dataset.copy) { share(t.dataset.share || t.dataset.copy, !!t.dataset.share); return; }
    if (t.hasAttribute("data-more")) { openSheet(); return; }
    if (t.parentElement && t.parentElement.dataset.pref) {
      const key = t.parentElement.dataset.pref; prefs[key] = t.dataset.val; store.set(key, prefs[key]);
      if (key === "expand") state.opened = {};
      applyPrefs(); if (key === "expand") render();
    }
  });
  document.addEventListener("change", (e) => { if (e.target.dataset && e.target.dataset.chk !== undefined) state.checks[e.target.dataset.chk] = e.target.checked; });
  $("#q").addEventListener("input", (e) => {
    state.q = e.target.value;
    if (state.q.trim() && (state.tab === "overview" || state.tab === "about")) { state.tab = bestTab(); }
    render();
  });
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
  $("#clear").addEventListener("click", () => { state.q = ""; $("#q").value = ""; render(); $("#q").focus(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== $("#q")) { e.preventDefault(); $("#q").focus(); }
    if (e.key === "Escape") { if (!$("#sheet").hidden) closeSheet(); else if (document.activeElement === $("#q")) { state.q = ""; $("#q").value = ""; render(); } }
  });
  $("#prefsbtn").addEventListener("click", openSheet);
  $("#closesheet").addEventListener("click", closeSheet);
  $("#backdrop").addEventListener("click", closeSheet);
  $("#totop").addEventListener("click", () => { if (window.scrollTo) window.scrollTo({ top: 0, behavior: "smooth" }); });
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { $("#totop").classList.toggle("show", window.scrollY > 700); ticking = false; });
  }, { passive: true });
  window.addEventListener("hashchange", applyHash);

  /* ---------- boot ---------- */
  applyPrefs();
  $("#updated").textContent = "Updated " + D.UPDATED;
  $("#version").textContent = "Version " + D.VERSION;
  $("#srccount").textContent = Object.keys(S).length + " reports with links";
  render();
  applyHash();
  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
  }
})();
