// ==UserScript==
// @name         MaxRoll-translator
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Maxroll automatic translation, all credit accord to Noxish
// @author       Nyrrell fork from noxish
// @source       https://github.com/noxish/MaxRoll-Translator
// @match        https://maxroll.gg/d4/build-guides/*
// @updateURL    https://github.com/Nyrrell/MaxRoll-Translator/script/maxroll-translate.js
// @downloadURL  https://github.com/Nyrrell/MaxRoll-Translator/script/maxroll-translate.js
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

// Hilfsfunktion: alle Keys klein schreiben
function normalizeMap(map) {
  const result = {};
  for (const [key, value] of Object.entries(map)) {
    result[key.toLowerCase()] = value;
  }
  return result;
}

function typeFinder(span) {
  // BOARD
  if (
    span.closest(".d4t-board-name") ||
    span.closest(".d4t-name")
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
  } else if (span.getAttribute("style") === "background-position: -6em 0em;") {
    return "dungeons";

    // ASPECTS
  } else if (
    span.closest("div.d4t-AspectChecklist") ||
    span.closest("div.d4t-item")
  ) {
    return span.classList.contains("d4-color-legendary") ? "aspects" : "uniques";

    // SKILLS
  } else if (span.classList.contains("d4t-skill-name")) {
    return "skills";
  }
  return null;
}

async function translateSpan(span) {
  if (span.dataset.translated === "true") return;

  let text = span.textContent.trim();
  const key = text.toLowerCase();

  const type = typeFinder(span);

  if (!type) return;


  if (type === "dungeons") {
    text = span.parentElement.nextSibling.textContent.trim();
  }

  const translated = await fetchTranslation(text, type);

  if (translated && text !== translated) {
    console.log(`${ExtensionName} Translate "${text}" → "${translated}"`);
    if (type === "dungeons") {
      span.dataset.translated = "true";
      return span.parentElement.nextSibling.textContent = translated;
    }

    span.textContent = translated;
    span.dataset.translated = "true";
  }
}

function handleHover(span) {
  const tooltipRoot = document.getElementById("uitools-tooltip-root");
  if (!tooltipRoot) return;

  const observer = new MutationObserver((mutations, obs) => {
    const title = tooltipRoot.querySelector("div.d4t-title");

    if (title) {
      const text = title.textContent.trim();
      // const key = text.toLowerCase();
      const key = text;

      const type = typeFinder(span);

      if (!type) return obs.disconnect();

      fetchTranslation(key, type).then(translated => {
        if (translated && title.textContent !== translated) {
          console.log(`${ExtensionName} Tooltip translated: "${text}" → "${translated}"`);
          title.textContent = translated;
        }
        obs.disconnect();
      });
    }
  });

  observer.observe(tooltipRoot, {childList: true, subtree: true});
  setTimeout(() => observer.disconnect(), 500); // Fallback
}

const selectors = `
    div.d4t-ParagonSummary span.d4t-board-name span.d4-color-legendary,
    div.d4t-ParagonSummary span.d4t-glyph-name span.d4-color-legendary,
    div.d4t-AspectChecklist span.d4-color-legendary,
    div.d4t-AspectChecklist span.d4-color-unique,
    div.d4t-AspectChecklist span.d4-color-mythic,
    div.d4t-item span.d4-color-legendary,
    div.d4t-item span.d4-color-unique,
    div.d4t-item span.d4-color-mythic,
    span.d4-glyph span.d4-color-legendary,
    div.d4t-ParagonScroll div.d4t-labels div.d4t-name,
    div.d4t-ParagonScroll div.d4t-labels div.d4t-glyph-name,
    .d4t-skill-name,
    span.d4t-icon.d4t-fontIcons-icon[style='background-position: -6em 0em;']
  `;

// Setzt Hover-Events (nur einmal pro Element)
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

// Initialer Lauf
translateAllSpans().catch(err => console.error(`[${ExtensionName}] Error in initial translation:`, err));

// DOM beobachten für nachträglich geladene Inhalte
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
