(function () {
  "use strict";

  const DATA_URL = window.ADS_DATA_URL || "data/ads.json";
  const COLORS_URL = "data/tag-colors.json";

  const els = {
    gallery: document.getElementById("gallery"),
    count: document.getElementById("count-num"),
    company: document.getElementById("filter-company"),
    industry: document.getElementById("filter-industry"),
    adType: document.getElementById("filter-adtype"),
    search: document.getElementById("filter-search"),
    summaryExamples: document.getElementById("summary-examples"),
    summaryCompanies: document.getElementById("summary-companies"),
    summaryIndustries: document.getElementById("summary-industries"),
    summaryAdTypes: document.getElementById("summary-adtypes"),
    heroCount: document.getElementById("hero-count"),
  };

  let ads = [];
  let tagColors = { industry: {}, adType: {}, border: {}, text: {} };

  const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{200D}\u{FE0F}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{25AA}-\u{25FE}]+/gu;
  // Decorative bullet/prefix chars Coda sometimes puts before tag labels (not covered by emoji ranges).
  const PREFIX_RE = /^[\s\u2022\u00B7\u2023\u2043\u2219\u25E6\u25CF\u25CB\u25A0\u25A1*-]+/u;

  function stripEmoji(s) {
    return String(s || "")
      .replace(EMOJI_RE, "")
      .replace(PREFIX_RE, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function colorKey(tag) {
    return stripEmoji(tag);
  }

  function pillColor(kind, tag) {
    const map = tagColors[kind] || {};
    const key = colorKey(tag);
    return map[key] || map[tag] || null;
  }

  function contrastInk(bg) {
    if (!bg || bg.charAt(0) !== "#" || (bg.length !== 7 && bg.length !== 4)) {
      return "#27273a";
    }
    let hex = bg.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luma > 0.62 ? "#27273a" : "#ffffff";
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }

  function fillSelect(select, values, allLabel) {
    const current = select.value;
    select.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = allLabel;
    select.appendChild(allOpt);
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    if ([...select.options].some((o) => o.value === current)) {
      select.value = current;
    }
  }

  function industryTags(ad) {
    if (Array.isArray(ad.industryTags) && ad.industryTags.length) return ad.industryTags;
    if (!ad.industry) return [];
    return String(ad.industry).split(";").map((s) => s.trim()).filter(Boolean);
  }

  function adTypeTags(ad) {
    if (Array.isArray(ad.adTypeTags) && ad.adTypeTags.length) return ad.adTypeTags;
    if (!ad.adType) return [];
    return String(ad.adType).split(";").map((s) => s.trim()).filter(Boolean);
  }

  function populateFilters() {
    fillSelect(els.company, uniqueSorted(ads.map((a) => a.company)), "All companies");
    fillSelect(
      els.industry,
      uniqueSorted(ads.flatMap((a) => industryTags(a))),
      "All industries"
    );
    fillSelect(
      els.adType,
      uniqueSorted(ads.flatMap((a) => adTypeTags(a))),
      "All types"
    );
  }


  function renderSummary() {
    const companies = uniqueSorted(ads.map((a) => a.company));
    const industries = uniqueSorted(ads.flatMap((a) => industryTags(a)));
    const adTypes = uniqueSorted(ads.flatMap((a) => adTypeTags(a)));
    if (els.summaryExamples) els.summaryExamples.textContent = String(ads.length);
    if (els.summaryCompanies) els.summaryCompanies.textContent = String(companies.length);
    if (els.summaryIndustries) els.summaryIndustries.textContent = String(industries.length);
    if (els.summaryAdTypes) els.summaryAdTypes.textContent = String(adTypes.length);
    if (els.heroCount) els.heroCount.textContent = String(ads.length);
  }

  function matchesSearch(ad, q) {
    if (!q) return true;
    const hay = [
      ad.company,
      ad.industry,
      ad.adType,
      ad.adFormat,
      ad.title,
      ad.notes,
      ad.id,
      ...(industryTags(ad)),
      ...(adTypeTags(ad)),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }

  function tagMatch(tags, selected) {
    if (!selected) return true;
    return tags.some((t) => t === selected);
  }

  function filteredAds() {
    const company = els.company.value;
    const industry = els.industry.value;
    const adType = els.adType.value;
    const q = (els.search.value || "").trim().toLowerCase();

    return ads.filter((ad) => {
      if (company && ad.company !== company) return false;
      if (!tagMatch(industryTags(ad), industry)) return false;
      if (!tagMatch(adTypeTags(ad), adType)) return false;
      if (!matchesSearch(ad, q)) return false;
      return true;
    });
  }

  function buildFallback(ad) {
    const div = document.createElement("div");
    div.className = "creative-fallback";
    const h = document.createElement("div");
    h.className = "ad-headline";
    h.textContent = ad.notes || ad.title || ad.company || "";
    div.appendChild(h);
    return div;
  }

  function pillMeta(kind, tag) {
    const key = colorKey(tag);
    const fill = (tagColors[kind] || {})[key] || (tagColors[kind] || {})[tag] || null;
    const ink = (tagColors.text || {})[key] || (tagColors.text || {})[tag] || null;
    const border = (tagColors.border || {})[key] || (tagColors.border || {})[tag] || null;
    return { fill, ink, border };
  }

  function tintInk(hex) {
    const h = String(hex || "").replace("#", "");
    if (h.length !== 6) return "#27273a";
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (r > 245 && g > 245 && b > 245) return "#27273a";
    const dr = Math.max(0, Math.round(r * 0.35));
    const dg = Math.max(0, Math.round(g * 0.35));
    const db = Math.max(0, Math.round(b * 0.35));
    return "#" + [dr, dg, db].map((n) => n.toString(16).padStart(2, "0")).join("");
  }

  function makePill(label, kind) {
    const p = document.createElement("span");
    p.className = "pill pill-" + (kind === "industry" ? "industry" : "type");
    p.textContent = label;
    const meta = pillMeta(kind, label);
    const bg = meta.fill || pillColor(kind, label);
    if (bg) {
      p.style.background = bg;
      p.style.color = meta.ink || tintInk(bg);
      if (meta.border) {
        p.style.borderColor = meta.border;
      } else if (String(bg).toLowerCase() === "#ffffff") {
        p.style.borderColor = "rgba(39,39,58,0.18)";
      } else {
        p.style.borderColor = "transparent";
      }
    } else if (meta.ink) {
      p.style.color = meta.ink;
    }
    return p;
  }

  function buildCard(ad) {
    const article = document.createElement("article");
    article.className = "card";
    article.dataset.id = ad.id || "";
    if (ad.order != null) article.dataset.order = String(ad.order);

    if (ad.image) {
      const creative = document.createElement("div");
      creative.className = "creative";
      const img = document.createElement("img");
      img.src = ad.image;
      img.alt = ad.title || ad.company || "Ad creative";
      img.loading = "lazy";
      img.addEventListener("error", function onErr() {
        img.removeEventListener("error", onErr);
        creative.replaceWith(buildFallback(ad));
      });
      creative.appendChild(img);
      article.appendChild(creative);
    } else {
      article.appendChild(buildFallback(ad));
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = ad.title || ad.company || "";
    body.appendChild(title);

    if (ad.notes) {
      const notes = document.createElement("div");
      notes.className = "card-notes";
      notes.textContent = ad.notes;
      body.appendChild(notes);
    }

    const pills = document.createElement("div");
    pills.className = "pills";
    industryTags(ad).forEach((t) => pills.appendChild(makePill(t, "industry")));
    adTypeTags(ad).forEach((t) => pills.appendChild(makePill(t, "adType")));
    if (ad.adFormat) {
      const fmt = document.createElement("span");
      fmt.className = "pill pill-format";
      fmt.textContent = ad.adFormat;
      pills.appendChild(fmt);
    }
    body.appendChild(pills);

    const links = document.createElement("div");
    links.className = "card-links";
    let hasLink = false;

    if (ad.sourceUrl) {
      const link = document.createElement("a");
      link.className = "card-link";
      link.href = ad.sourceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const isDrive = /drive\.google\.com/i.test(ad.sourceUrl);
      link.textContent = isDrive ? "View creative" : "View source";
      links.appendChild(link);
      hasLink = true;
    }

    if (ad.landingUrl) {
      const lp = document.createElement("a");
      lp.className = "card-link";
      lp.href = ad.landingUrl;
      lp.target = "_blank";
      lp.rel = "noopener noreferrer";
      lp.textContent = "Landing page";
      links.appendChild(lp);
      hasLink = true;
    }

    if (hasLink) body.appendChild(links);

    article.appendChild(body);
    return article;
  }

  function render() {
    const list = filteredAds();
    els.count.textContent = String(list.length);
    els.gallery.innerHTML = "";

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent =
        "No ads match these filters. Try clearing search or selecting All.";
      els.gallery.appendChild(empty);
      return;
    }

    list.forEach((ad) => els.gallery.appendChild(buildCard(ad)));
  }

  function bind() {
    ["change", "input"].forEach((evt) => {
      els.company.addEventListener(evt, render);
      els.industry.addEventListener(evt, render);
      els.adType.addEventListener(evt, render);
      els.search.addEventListener(evt, render);
    });
  }

  function showError(msg) {
    const wrap = document.querySelector(".gallery-wrap");
    const err = document.createElement("div");
    err.className = "status-error";
    err.textContent = msg;
    wrap.insertBefore(err, els.gallery);
  }

  async function init() {
    bind();
    try {
      const [adsRes, colorsRes] = await Promise.all([
        fetch(DATA_URL, { cache: "no-store" }),
        fetch(COLORS_URL, { cache: "no-store" }).catch(() => null),
      ]);
      if (!adsRes.ok) throw new Error("HTTP " + adsRes.status);
      const data = await adsRes.json();
      if (!Array.isArray(data)) throw new Error("ads.json must be an array");
      ads = data.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

      if (colorsRes && colorsRes.ok) {
        const colors = await colorsRes.json();
        tagColors = {
          industry: colors.industry || {},
          adType: colors.adType || {},
          border: colors.border || {},
          text: colors.text || {},
        };
      }

      populateFilters();
      renderSummary();
      render();
    } catch (e) {
      els.count.textContent = "0";
      showError(
        "Could not load data/ads.json. Serve this folder over HTTP (e.g. python3 -m http.server) — file:// fetch is blocked by browsers. " +
          String(e.message || e)
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
