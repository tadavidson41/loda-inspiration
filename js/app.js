(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const els = { grid: $("grid"), count: $("count"), q: $("q"), company: $("company"), companyList: $("company-list"), sort: $("sort"),
    chipsInd: $("chips-industry"), chipsType: $("chips-adType"), panel: $("chip-panel"), toggle: $("toggle-tags"), tagN: $("tag-n"), clear: $("clear"),
    lb: $("lb"), lbImg: $("lb-img"), lbCo: $("lb-co"), lbTitle: $("lb-title"), lbPills: $("lb-pills"), lbLinks: $("lb-links"), lbPos: $("lb-pos") };
  let ads = [], view = [], cur = -1;
  let tagColors = { industry: {}, adType: {}, border: {}, text: {} };
  const sel = { industry: new Set(), adType: new Set() };

  const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{200D}\u{FE0F}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{25AA}-\u{25FE}]+/gu;
  const PREFIX_RE = /^[\s\u2022\u00B7\u2023\u2043\u2219\u25E6\u25CF\u25CB\u25A0\u25A1*-]+/u;
  const stripEmoji = (s) => String(s || "").replace(EMOJI_RE, "").replace(PREFIX_RE, "").replace(/\s+/g, " ").trim();
  const uniq = (v) => [...new Set(v.filter(Boolean))].sort((a, b) => stripEmoji(a).localeCompare(stripEmoji(b), undefined, { sensitivity: "base" }));
  const split = (arr, s) => (Array.isArray(arr) && arr.length ? arr : String(s || "").split(";").map((x) => x.trim()).filter(Boolean));
  const indTags = (ad) => split(ad.industryTags, ad.industry);
  const typeTags = (ad) => split(ad.adTypeTags, ad.adType);

  function pillMeta(kind, tag) {
    const key = stripEmoji(tag), m = tagColors[kind] || {}, t = tagColors.text || {}, b = tagColors.border || {};
    return { fill: m[key] || m[tag] || null, ink: t[key] || t[tag] || null, border: b[key] || b[tag] || null };
  }
  function tintInk(hex) {
    const h = String(hex || "").replace("#", "");
    if (h.length !== 6) return "#27273a";
    const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    if (c.every((n) => n > 245)) return "#27273a";
    return "#" + c.map((n) => Math.round(n * 0.35).toString(16).padStart(2, "0")).join("");
  }
  function paint(el, kind, label) {
    const m = pillMeta(kind, label);
    if (m.fill) {
      el.style.background = m.fill;
      el.style.color = m.ink || tintInk(m.fill);
      el.style.borderColor = m.border || (String(m.fill).toLowerCase() === "#ffffff" ? "rgba(39,39,58,0.18)" : "transparent");
    } else if (m.ink) el.style.color = m.ink;
    return el;
  }
  function pill(label, kind) {
    const p = document.createElement("span");
    p.className = "pill";
    p.textContent = label;
    return paint(p, kind, label);
  }

  function buildChips(box, kind, tags) {
    box.innerHTML = "";
    tags.forEach((t) => {
      const b = paint(document.createElement("button"), kind, t);
      b.type = "button"; b.className = "chip"; b.textContent = t; b.dataset.tag = t;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        sel[kind].has(t) ? sel[kind].delete(t) : sel[kind].add(t);
        b.classList.toggle("on", sel[kind].has(t));
        b.setAttribute("aria-pressed", String(sel[kind].has(t)));
        render();
      });
      box.appendChild(b);
    });
  }

  function filtered() {
    const q = els.q.value.trim().toLowerCase(), co = els.company.value.trim().toLowerCase();
    let list = ads.filter((ad) => {
      if (co && !String(ad.company).toLowerCase().includes(co)) return false;
      if (sel.industry.size && !indTags(ad).some((t) => sel.industry.has(t))) return false;
      if (sel.adType.size && !typeTags(ad).some((t) => sel.adType.has(t))) return false;
      if (q) {
        const hay = [ad.company, ad.title, ad.notes, ad.industry, ad.adType, ad.adFormat, ...indTags(ad), ...typeTags(ad)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const s = els.sort.value, cmp = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" });
    if (s === "company") list.sort((a, b) => cmp(a.company, b.company) || a._o - b._o);
    else if (s === "adtype") list.sort((a, b) => cmp(stripEmoji(typeTags(a)[0] || "~"), stripEmoji(typeTags(b)[0] || "~")) || a._o - b._o);
    return list;
  }

  function card(ad, i) {
    const a = document.createElement("article");
    a.className = "card"; a.tabIndex = 0; a.dataset.id = ad.id; a.dataset.i = i;
    a.setAttribute("role", "button"); a.setAttribute("aria-label", "Open " + (ad.title || ad.company));
    const sq = document.createElement("div"); sq.className = "sq";
    if (ad.image) {
      const img = document.createElement("img");
      img.src = ad.image; img.alt = ad.title || ad.company; img.loading = "lazy"; img.decoding = "async";
      img.onerror = () => { sq.innerHTML = '<div class="fallback"></div>'; sq.firstChild.textContent = ad.title || ad.company; };
      sq.appendChild(img);
    }
    const cb = document.createElement("div"); cb.className = "cb";
    const co = document.createElement("div"); co.className = "co"; co.textContent = ad.company;
    const ps = document.createElement("div"); ps.className = "pills";
    indTags(ad).forEach((t) => ps.appendChild(pill(t, "industry")));
    typeTags(ad).forEach((t) => ps.appendChild(pill(t, "adType")));
    cb.append(co, ps); a.append(sq, cb);
    return a;
  }

  function render() {
    view = filtered();
    els.count.textContent = view.length;
    const n = sel.industry.size + sel.adType.size;
    els.tagN.textContent = n ? "(" + n + ")" : "";
    els.grid.innerHTML = "";
    if (!view.length) { els.grid.innerHTML = '<div class="empty">No ads match these filters. Try Clear all.</div>'; return; }
    const frag = document.createDocumentFragment();
    view.forEach((ad, i) => frag.appendChild(card(ad, i)));
    els.grid.appendChild(frag);
  }

  function link(href, text) {
    const l = document.createElement("a"); l.href = href; l.target = "_blank"; l.rel = "noopener noreferrer"; l.textContent = text; return l;
  }
  function openLb(i) {
    if (!view.length) return;
    cur = (i + view.length) % view.length;
    const ad = view[cur];
    els.lbImg.src = ad.image || ""; els.lbImg.alt = ad.title || ad.company;
    els.lbCo.textContent = ad.company;
    els.lbTitle.textContent = [ad.title, ad.adFormat, ad.notes].filter(Boolean).join(" · ");
    els.lbPills.innerHTML = "";
    indTags(ad).forEach((t) => els.lbPills.appendChild(pill(t, "industry")));
    typeTags(ad).forEach((t) => els.lbPills.appendChild(pill(t, "adType")));
    els.lbLinks.innerHTML = "";
    if (ad.sourceUrl) els.lbLinks.appendChild(link(ad.sourceUrl, /drive\.google/i.test(ad.sourceUrl) ? "View creative" : "View source"));
    if (ad.landingUrl) els.lbLinks.appendChild(link(ad.landingUrl, "Landing page"));
    els.lbPos.textContent = (cur + 1) + " of " + view.length;
    if (els.lb.hidden) { els.lb.hidden = false; document.body.style.overflow = "hidden"; }
  }
  function closeLb() { els.lb.hidden = true; document.body.style.overflow = ""; cur = -1; }

  function bind() {
    [els.q, els.company].forEach((e) => e.addEventListener("input", render));
    els.sort.addEventListener("change", render);
    els.toggle.addEventListener("click", () => {
      els.panel.hidden = !els.panel.hidden;
      els.toggle.setAttribute("aria-expanded", String(!els.panel.hidden));
    });
    els.clear.addEventListener("click", () => {
      els.q.value = ""; els.company.value = ""; els.sort.value = "default";
      sel.industry.clear(); sel.adType.clear();
      document.querySelectorAll(".chip.on").forEach((c) => { c.classList.remove("on"); c.setAttribute("aria-pressed", "false"); });
      render();
    });
    els.grid.addEventListener("click", (e) => { const c = e.target.closest(".card"); if (c) openLb(+c.dataset.i); });
    els.grid.addEventListener("keydown", (e) => { const c = e.target.closest(".card"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openLb(+c.dataset.i); } });
    $("lb-close").addEventListener("click", closeLb);
    $("lb-prev").addEventListener("click", () => openLb(cur - 1));
    $("lb-next").addEventListener("click", () => openLb(cur + 1));
    els.lb.addEventListener("click", (e) => { if (e.target === els.lb || e.target.classList.contains("lb-inner")) closeLb(); });
    document.addEventListener("keydown", (e) => {
      if (els.lb.hidden) return;
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowLeft") openLb(cur - 1);
      else if (e.key === "ArrowRight") openLb(cur + 1);
    });
    let sx = null, sy = null;
    els.lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    els.lb.addEventListener("touchend", (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) openLb(cur + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  async function init() {
    bind();
    try {
      const [r, c] = await Promise.all([fetch("data/ads.json", { cache: "no-store" }), fetch("data/tag-colors.json", { cache: "no-store" }).catch(() => null)]);
      if (!r.ok) throw new Error("HTTP " + r.status);
      ads = (await r.json()).map((a) => Object.assign(a, { _o: a.codaOrder != null ? a.codaOrder : 1000 + (a.order || 0) }));
      ads.sort((a, b) => a._o - b._o);
      if (c && c.ok) { const j = await c.json(); tagColors = { industry: j.industry || {}, adType: j.adType || {}, border: j.border || {}, text: j.text || {} }; }
      const cos = uniq(ads.map((a) => a.company)), inds = uniq(ads.flatMap(indTags)), types = uniq(ads.flatMap(typeTags));
      $("s-ex").textContent = ads.length; $("s-co").textContent = cos.length; $("s-in").textContent = inds.length; $("s-at").textContent = types.length;
      els.companyList.innerHTML = cos.map((c) => '<option value="' + c.replace(/"/g, "&quot;") + '"></option>').join("");
      buildChips(els.chipsInd, "industry", inds);
      buildChips(els.chipsType, "adType", types);
      render();
    } catch (e) {
      els.grid.innerHTML = '<div class="empty">Could not load ads. ' + String(e.message || e) + "</div>";
    }
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
