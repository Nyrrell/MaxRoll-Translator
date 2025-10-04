// ==UserScript==
// @name         MaxRoll-translator
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Maxroll automatic translation, all credit accord to Noxish
// @author       Nyrrell fork from noxish
// @homepage     https://github.com/Nyrrell/MaxRoll-Translator
// @source       https://github.com/noxish/MaxRoll-Translator
// @match        https://maxroll.gg/d4/build-guides/*
// @updateURL    https://github.com/Nyrrell/MaxRoll-Translator/raw/main/script/maxroll-translate.js
// @downloadURL  https://github.com/Nyrrell/MaxRoll-Translator/raw/main/script/maxroll-translate.js
// @grant        none
// ==/UserScript==

const ExtensionName = "[MaxRollTranslator]";
const BaseUrl = "https://max-roll-translator-zeta.vercel.app"

let currentLanguage = "fr"; // Standard

const translationCache = new Map();

async function fetchTranslation(key, type) {

  const cacheKey = `${currentLanguage}:${type}:${key.toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const res = await fetch(`${BaseUrl}/api/translate?key=${encodeURIComponent(key)}&type=${type}&lang=${currentLanguage}`);
    const data = await res.json();
    const result = data.translation || null;
    translationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`[${ExtensionName}] API error:`, err);
    return null;
  }
}

function typeFinder(span) {
  // BOARD
  if (
    span.closest(".d4t-board-name") ||
    span.closest(".d4t-name") ||
    span.closest(".d4-paragon") ||
    span.closest(".d4t-ParagonBoard")
  ) {
    return "board";

    // GLYPHS
  } else if (
    span.closest("div.d4t-ParagonSummary span.d4t-glyph-name") ||
    span.closest("div.d4t-ParagonScroll div.d4t-labels div.d4t-glyph-name") ||
    span.closest("span.d4-glyph")
  ) {
    return "glyphs";

    // DUNGEONS
  } else if (span.closest("div.d4t-AspectChecklist") && span.classList.contains("d4-color-important")) {
    return "dungeons";

    // UNIQUES
  } else if (
    (span.classList.contains("d4-color-unique") || span.classList.contains("d4-color-mythic"))
      && (
        span.closest("div.d4t-item") ||
        span.closest("span.d4t-item") ||
        span.closest("div.d4-item") ||
        span.closest("span.d4-item") ||
        span.closest("div.d4t-AspectChecklist")) ||
      span.querySelector("div.d4t-frame-mythic") ||
      span.querySelector("div.d4t-frame-unique")
  ) {
    return "uniques";

    // ASPECTS
  } else if (
    span.closest("div.d4t-AspectChecklist") ||
    span.closest("span.d4-affix") ||
    (span.classList.contains("d4-color-legendary") && span.closest("div.d4t-item")) ||
    span.querySelector("div.d4t-frame-legendary")
  ) {
    return "aspects";

    // SKILLS
  } else if (span.classList.contains("d4t-skill-name") ||
    span.closest("div.d4t-skill-frame") ||
    span.closest("div.d4t-passive-frame") ||
    [...span.classList].some(className => className.startsWith("skill-bar"))) {
    return "skills";

    // SEASON 10
  } else if (span.closest("span.d4-stone") || span.closest("div.d4t-ChaosViewer")) {
    return "chaos-perks"
  }
  return null;
}

async function translateSpan(span) {
  if (span.dataset.translated === "true") return;

  let text = span.textContent.trim();

  const type = typeFinder(span);

  if (!type) return;

  const translated = await fetchTranslation(text, type);

  if (translated && text !== translated) {
    //console.log(`${ExtensionName} Translate "${text}" → "${translated}"`)
    for (let node of span.childNodes) {
      // Keep icon of aspect
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = translated;
        break;
      }
    }
    span.dataset.translated = "true";
    span.dataset.original = text;
  }
}

function handleHover(span) {
  const tooltipRoot = document.getElementById("uitools-tooltip-root");
  if (!tooltipRoot) return;

  const observer = new MutationObserver((mutations, obs) => {
    const title = tooltipRoot.querySelector("div.d4t-title");

    if (title) {
      const key = title.textContent.trim();

      const type = typeFinder(span);

      if (!type) return obs.disconnect();

      fetchTranslation(key, type).then(translated => {
        if (translated && title.textContent !== translated) {
          //console.log(`${ExtensionName} Tooltip translated: "${text}" → "${translated}"`);
          title.textContent = translated;
        }
        obs.disconnect();
      });
    }
  });

  observer.observe(tooltipRoot, {childList: true, subtree: true});
  setTimeout(() => observer.disconnect(), 500); // Fallback
}

const selectors = [
  // PARAGON
  "div.d4t-ParagonSummary span.d4t-board-name span.d4-color-legendary",
  "div.d4t-ParagonSummary span.d4t-glyph-name span.d4-color-legendary",
  "span.d4-glyph span.d4-color-legendary",
  "span.d4-paragon span.d4-color-legendary",
  "div.d4t-ParagonScroll div.d4t-labels div.d4t-name",
  "div.d4t-ParagonScroll div.d4t-labels div.d4t-glyph-name",
  // ASPECTS
  "div.d4t-AspectChecklist span[class^='d4-color']",
  "span.d4-affix span.d4-color-legendary",
  //ITEMS
  "div.d4t-item span[class^='d4-color']",
  "span.d4t-item span[class^='d4-color']",
  "div.d4-item span[class^='d4-color']",
  "span.d4-item span[class^='d4-color']",
  "div.d4t-slot:has([class*='d4t-frame-'])",
  // SKILLS
  "div.d4t-skill-frame",
  "div.d4t-passive-frame",
  "span.d4t-skill-name",
  "div[class^='skill-bar'] div[class*='skill-bar']",
  // Season 10 chaos-perks
  "span.d4-stone span[class^='d4-color']",
  "div.d4t-stone"
].join(",");

// Sets hover events (only once per element)
function addHoverListeners(root = document) {
  const elements = root.querySelectorAll(selectors);

  elements.forEach(span => {
    if (!span.dataset.hoverBound) {
      span.addEventListener("mouseenter", () => handleHover(span));
      span.dataset.hoverBound = "true";
    }
  });
}

async function translateAllSpans(root = document) {
  const elements = root.querySelectorAll(selectors);

  for (const span of elements) {
    await translateSpan(span);
  }

  addHoverListeners(root);
}

// Initial run
translateAllSpans().catch(err => console.error(`[${ExtensionName}] Error in initial translation:`, err));

// Watch DOM for subsequently loaded content
const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        translateAllSpans(node).catch(err => console.error(`[${ExtensionName}] Error in mutation translation:`, err));
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: false
});

console.log(`${ExtensionName} Translation script active (resource-saving)`);
