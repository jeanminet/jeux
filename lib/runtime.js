(function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randInt(max) {
    return Math.floor(Math.random() * (max + 1));
  }

  function randRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function choice(list) {
    if (!list || !list.length) return undefined;
    return list[randInt(list.length - 1)];
  }

  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function fitText(element, options) {
    if (!element) return;
    const cfg = options || {};
    const min = Number.isFinite(cfg.min) ? cfg.min : 24;
    const max = Number.isFinite(cfg.max) ? cfg.max : 60;
    const step = Number.isFinite(cfg.step) ? Math.max(cfg.step, 1) : 1;
    const pad = Number.isFinite(cfg.pad) ? cfg.pad : 4;

    element.style.fontSize = `${max}px`;
    let size = max;
    let guard = 0;
    while (
      guard < 80 &&
      size > min &&
      (element.scrollWidth > element.clientWidth + pad ||
        element.scrollHeight > element.clientHeight + pad)
    ) {
      size -= step;
      element.style.fontSize = `${size}px`;
      guard += 1;
    }
  }

  function createGameCard(className) {
    const card = document.createElement("section");
    card.className = "game-card";
    if (className) card.classList.add(className);
    return card;
  }

  function createFeedbackLine() {
    const el = document.createElement("p");
    el.className = "game-feedback";
    el.setAttribute("aria-live", "polite");
    return el;
  }

  function createChoiceGrid(options) {
    const cfg = options || {};
    const root = document.createElement("div");
    root.className = "choice-grid";
    if (cfg.className) root.classList.add(cfg.className);
    if (cfg.ariaLabel) root.setAttribute("aria-label", cfg.ariaLabel);
    root.setAttribute("role", cfg.role || "group");

    let buttons = [];
    let locked = false;

    function unlock() {
      locked = false;
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }

    function clear() {
      root.innerHTML = "";
      buttons = [];
    }

    function setOptions(items) {
      clear();
      if (!Array.isArray(items)) return;
      items.forEach((item, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-grid__button";
        if (cfg.buttonClass) btn.classList.add(cfg.buttonClass);
        if (item && item.className) btn.classList.add(item.className);
        const label = item && item.label != null ? String(item.label) : "?";
        btn.textContent = label;
        if (item && item.ariaLabel) {
          btn.setAttribute("aria-label", item.ariaLabel);
        }
        btn.addEventListener("click", () => {
          if (locked) return;
          if (typeof cfg.onSelect === "function") {
            cfg.onSelect(item, btn, index);
          }
        });
        root.appendChild(btn);
        buttons.push(btn);
      });

      window.requestAnimationFrame(() => {
        buttons.forEach((button) => {
          fitText(button, cfg.fit);
        });
        if (buttons.length && cfg.autoFocus !== false) {
          buttons[0].focus();
        }
      });
    }

    return {
      root,
      setOptions,
      clear,
      lock() {
        locked = true;
        buttons.forEach((button) => {
          button.disabled = true;
        });
      },
      unlock,
      focus(index) {
        const target = buttons[index || 0];
        if (target) target.focus();
      },
      buttons() {
        return buttons.slice();
      }
    };
  }

  function createHundredGrid(options) {
    const cfg = options || {};
    const total = Math.max(1, Number.isFinite(cfg.total) ? cfg.total : 100);
    const label = cfg.label || "Progression";

    const root = document.createElement("section");
    root.className = "progress-grid";
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", `${label} 0/${total}`);

    const counter = document.createElement("div");
    counter.className = "progress-grid__counter";

    const valueEl = document.createElement("span");
    valueEl.className = "progress-grid__value";
    valueEl.textContent = "0";

    const totalEl = document.createElement("span");
    totalEl.className = "progress-grid__total";
    totalEl.textContent = `/${total}`;

    counter.appendChild(valueEl);
    counter.appendChild(totalEl);

    const grid = document.createElement("div");
    grid.className = "progress-grid__grid";

    const cells = [];
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        const cell = document.createElement("div");
        cell.className = "progress-grid__cell";
        if (row === 0) cell.classList.add("progress-grid__cell--row0");
        if (col === 0) cell.classList.add("progress-grid__cell--col0");
        if (row === 5) cell.classList.add("progress-grid__cell--row5");
        if (col === 5) cell.classList.add("progress-grid__cell--col5");
        grid.appendChild(cell);
        cells.push(cell);
      }
    }

    const announcer = document.createElement("div");
    announcer.className = "sr-only";
    announcer.setAttribute("aria-live", "polite");

    root.appendChild(counter);
    root.appendChild(grid);
    root.appendChild(announcer);

    let current = 0;

    function update(value) {
      const safe = clamp(Math.round(value), 0, total);
      current = safe;
      valueEl.textContent = String(safe);
      root.setAttribute("aria-label", `${label} ${safe}/${total}`);

      const ratio = safe / total;
      const filled = Math.round(ratio * 100);
      const tens = Math.floor(filled / 10);
      const units = filled % 10;

      cells.forEach((cell, index) => {
        cell.classList.remove(
          "progress-grid__cell--ten",
          "progress-grid__cell--unit"
        );
        const row = Math.floor(index / 10);
        const col = index % 10;
        if (row < tens) {
          cell.classList.add("progress-grid__cell--ten");
        } else if (row === tens && col < units) {
          cell.classList.add("progress-grid__cell--unit");
        }
      });

      announcer.textContent = `${label}: ${safe} sur ${total}. ${tens} dizaines et ${units} unités.`;
    }

    update(0);

    return {
      root,
      setValue: update,
      get value() {
        return current;
      }
    };
  }

  function createPointTracker(options) {
    const cfg = options || {};
    const total = Math.max(1, Number.isFinite(cfg.total) ? cfg.total : 100);
    const progress = cfg.progress;
    const grid = cfg.grid;
    const onChange = typeof cfg.onChange === "function" ? cfg.onChange : null;

    let current = 0;

    function sync(nextValue) {
      current = clamp(Math.round(Number(nextValue) || 0), 0, total);
      if (progress && typeof progress.setLevel === "function") {
        progress.setLevel(current);
      }
      if (grid && typeof grid.setValue === "function") {
        grid.setValue(current);
      }
      if (onChange) onChange(current);
      return current;
    }

    sync(0);

    return {
      total,
      get value() {
        return current;
      },
      set(value) {
        return sync(value);
      },
      add(delta) {
        return sync(current + Number(delta || 0));
      },
      reset() {
        return sync(0);
      },
      isComplete() {
        return current >= total;
      }
    };
  }

  function createProgress(options) {
    const total = Math.max(1, options.total || 1);
    const label = options.label || "Progress";
    const container = document.createElement("section");
    container.className = "progress";

    const text = document.createElement("p");
    text.className = "progress__label";
    text.setAttribute("aria-live", "polite");
    const track = document.createElement("div");
    track.className = "progress__track";
    const bar = document.createElement("div");
    bar.className = "progress__bar";
    bar.style.width = "0%";

    track.appendChild(bar);
    container.appendChild(text);
    container.appendChild(track);

    function setLevel(value) {
      const safe = clamp(value, 0, total);
      const ratio = safe / total;
      text.textContent = `${label}: ${safe}/${total}`;
      bar.style.width = `${Math.round(ratio * 100)}%`;
    }

    setLevel(0);

    return { root: container, setLevel };
  }

  const RAW_WORDS = [
    { w: "chat", img: "🐱", diff: 1 },
    { w: "vache", img: "🐄", diff: 1 },
    { w: "mouton", img: "🐑", diff: 1 },
    { w: "cochon", img: "🐷", diff: 1 },
    { w: "lapin", img: "🐰", diff: 1 },
    { w: "loup", img: "🐺", diff: 1 },
    { w: "poule", img: "🐔", diff: 1 },
    { w: "poisson", img: "🐟", diff: 1 },
    { w: "pomme", img: "🍎", diff: 1 },
    { w: "poire", img: "🍐", diff: 1 },
    { w: "banane", img: "🍌", diff: 1 },
    { w: "fraise", img: "🍓", diff: 1 },
    { w: "melon", img: "🍈", diff: 1 },
    { w: "pain", img: "🍞", diff: 1 },
    { w: "biscuit", img: "🍪", diff: 1 },
    { w: "riz", img: "🍚", diff: 1 },
    { w: "lait", img: "🥛", diff: 1 },
    { w: "eau", img: "💧", diff: 1 },
    { w: "glace", img: "🍦", diff: 1 },
    { w: "livre", img: "📖", diff: 1 },
    { w: "stylo", img: "🖊️", diff: 1 },
    { w: "lampe", img: "💡", diff: 1 },
    { w: "clé", img: "🔑", diff: 1 },
    { w: "porte", img: "🚪", diff: 1 },
    { w: "télé", img: "📺", diff: 1 },
    { w: "main", img: "✋", diff: 1 },
    { w: "pied", img: "🦶", diff: 1 },
    { w: "nez", img: "👃", diff: 1 },
    { w: "bras", img: "💪", diff: 1 },
    { w: "maison", img: "🏠", diff: 1 },
    { w: "jardin", img: "🏡", diff: 1 },
    { w: "plage", img: "🏖️", diff: 1 },
    { w: "arbre", img: "🌳", diff: 1 },
    { w: "fleur", img: "🌸", diff: 1 },
    { w: "chien", img: "🐶", diff: 2 },
    { w: "girafe", img: "🦒", diff: 2 },
    { w: "tigre", img: "🐯", diff: 2 },
    { w: "hibou", img: "🦉", diff: 2 },
    { w: "canard", img: "🦆", diff: 2 },
    { w: "dauphin", img: "🐬", diff: 2 },
    { w: "serpent", img: "🐍", diff: 2 },
    { w: "raisin", img: "🍇", diff: 2 },
    { w: "orange", img: "🍊", diff: 2 },
    { w: "citron", img: "🍋", diff: 2 },
    { w: "carotte", img: "🥕", diff: 2 },
    { w: "mangue", img: "🥭", diff: 2 },
    { w: "kiwi", img: "🥝", diff: 2 },
    { w: "coco", img: "🥥", diff: 2 },
    { w: "crayon", img: "✏️", diff: 2 },
    { w: "règle", img: "📏", diff: 2 },
    { w: "sac", img: "🎒", diff: 2 },
    { w: "tasse", img: "☕", diff: 2 },
    { w: "casque", img: "🎧", diff: 2 },
    { w: "loupe", img: "🔍", diff: 2 },
    { w: "vélo", img: "🚲", diff: 2 },
    { w: "bus", img: "🚌", diff: 2 },
    { w: "moto", img: "🏍️", diff: 2 },
    { w: "taxi", img: "🚕", diff: 2 },
    { w: "soleil", img: "☀️", diff: 2 },
    { w: "vent", img: "💨", diff: 2 },
    { w: "dent", img: "🦷", diff: 2 },
    { w: "cœur", img: "❤️", diff: 2 },
    { w: "renard", img: "🦊", diff: 3 },
    { w: "pingouin", img: "🐧", diff: 3 },
    { w: "grenouille", img: "🐸", diff: 3 },
    { w: "requin", img: "🦈", diff: 3 },
    { w: "kangourou", img: "🦘", diff: 3 },
    { w: "crocodile", img: "🐊", diff: 3 },
    { w: "maïs", img: "🌽", diff: 3 },
    { w: "avocat", img: "🥑", diff: 3 },
    { w: "poivron", img: "🫑", diff: 3 },
    { w: "brocoli", img: "🥦", diff: 3 },
    { w: "aubergine", img: "🍆", diff: 3 },
    { w: "concombre", img: "🥒", diff: 3 },
    { w: "croissant", img: "🥐", diff: 3 },
    { w: "sushi", img: "🍣", diff: 3 },
    { w: "soupe", img: "🥣", diff: 3 },
    { w: "cahier", img: "📓", diff: 3 },
    { w: "marteau", img: "🔨", diff: 3 },
    { w: "scie", img: "🪚", diff: 3 },
    { w: "casquette", img: "🧢", diff: 3 },
    { w: "tram", img: "🚊", diff: 3 },
    { w: "métro", img: "🚇", diff: 3 },
    { w: "voiture", img: "🚗", diff: 3 },
    { w: "bateau", img: "⛵", diff: 3 },
    { w: "gare", img: "🚉", diff: 3 },
    { w: "forêt", img: "🌲", diff: 3 },
    { w: "neige", img: "❄️", diff: 3 },
    { w: "chevreuil", img: "🦌", diff: 4 },
    { w: "écureuil", img: "🐿️", diff: 4 },
    { w: "éléphant", img: "🐘", diff: 4 },
    { w: "perroquet", img: "🦜", diff: 4 },
    { w: "aigle", img: "🦅", diff: 4 },
    { w: "phoque", img: "🦭", diff: 4 },
    { w: "oignon", img: "🧅", diff: 4 },
    { w: "beurre", img: "🧈", diff: 4 },
    { w: "œuf", img: "🥚", diff: 4 },
    { w: "gâteau", img: "🎂", diff: 4 },
    { w: "brosse à dents", img: "🪥", diff: 4 },
    { w: "tournevis", img: "🪛", diff: 4 },
    { w: "ordinateur", img: "💻", diff: 4 },
    { w: "étoile", img: "⭐", diff: 4 },
    { w: "rivière", img: "🏞️", diff: 4 },
    { w: "océan", img: "🌊", diff: 4 },
    { w: "hôpital", img: "🏥", diff: 4 },
    { w: "château", img: "🏰", diff: 4 },
    { w: "cheminée", img: "🧱", diff: 4 },
    { w: "rhinocéros", img: "🦏", diff: 5 },
    { w: "hippopotame", img: "🦛", diff: 5 },
    { w: "hélicoptère", img: "🚁", diff: 5 },
    { w: "montgolfière", img: "🎈", diff: 5 },
    { w: "astronaute", img: "🧑‍🚀", diff: 5 },
    { w: "planète", img: "🪐", diff: 5 }
  ];

  const GRAPHEME_POOL = [
    "ch",
    "ou",
    "on",
    "an",
    "ai",
    "oi",
    "eu",
    "au",
    "eau",
    "ill",
    "gn",
    "in",
    "ain",
    "ion",
    "ien",
    "ph",
    "qu",
    "é",
    "è",
    "ê",
    "œ",
    "tt",
    "ss",
    "rr"
  ];

  function buildVocabulary() {
    const seenWords = new Set();
    const seenEmoji = new Set();
    const words = [];

    function startSound(word) {
      const match = GRAPHEME_POOL.find((grapheme) => word.startsWith(grapheme));
      return match || word.slice(0, 1);
    }

    RAW_WORDS.forEach((entry) => {
      if (!entry || !entry.w || !entry.img) return;
      const word = String(entry.w).toLowerCase().trim();
      const emoji = String(entry.img).trim();
      if (!word || !emoji) return;
      if (seenWords.has(word) || seenEmoji.has(emoji)) return;
      const diff = clamp(Math.round(Number(entry.diff) || 1), 1, 5);
      const graphemes = GRAPHEME_POOL.filter((item) => word.includes(item));
      words.push({
        w: word,
        img: emoji,
        diff,
        initial: word[0],
        start: startSound(word),
        graphemes
      });
      seenWords.add(word);
      seenEmoji.add(emoji);
    });

    function byDifficulty(level, spread) {
      const span = Number.isFinite(spread) ? Math.max(0, spread) : 0;
      const min = clamp(Math.floor(level - span), 1, 5);
      const max = clamp(Math.ceil(level + span), 1, 5);
      return words.filter((item) => item.diff >= min && item.diff <= max);
    }

    return {
      all: words,
      graphemes: GRAPHEME_POOL.slice(),
      byDifficulty(level, spread) {
        return byDifficulty(level, spread || 0);
      },
      random(level, spread) {
        const pool = byDifficulty(level || 1, spread || 0);
        return choice(pool.length ? pool : words);
      },
      sample(level, size, spread, options) {
        const targetSize = Math.max(1, Number(size) || 1);
        const pool = byDifficulty(level || 1, spread || 0);
        const source = pool.length ? pool : words;
        const exclude =
          options && Array.isArray(options.exclude)
            ? new Set(options.exclude.map((item) => (item && item.w) || item))
            : null;
        const filtered = exclude
          ? source.filter((item) => !exclude.has(item.w))
          : source.slice();
        return shuffle(filtered).slice(0, targetSize);
      },
      withGrapheme(grapheme, options) {
        if (!grapheme) return [];
        const needle = String(grapheme).toLowerCase();
        const pool = options && options.level ? byDifficulty(options.level, options.spread || 0) : words;
        return pool.filter((item) => item.w.includes(needle));
      },
      startingWith(prefix, options) {
        if (!prefix) return [];
        const needle = String(prefix).toLowerCase();
        const pool = options && options.level ? byDifficulty(options.level, options.spread || 0) : words;
        return pool.filter((item) => item.w.startsWith(needle));
      }
    };
  }

  const vocabulary = buildVocabulary();

  function mountGame({ title, totalLevels, onReady }) {
    const app = document.getElementById("app");
    if (!app) throw new Error("Missing #app root element");

    const titleEl = document.createElement("h1");
    titleEl.id = "title";
    titleEl.textContent = title;
    app.appendChild(titleEl);

    const progress = createProgress({ label: "Progress", total: totalLevels });
    app.appendChild(progress.root);

    const gameHost = document.createElement("section");
    gameHost.id = "game";
    gameHost.setAttribute("role", "region");
    gameHost.setAttribute("aria-live", "polite");
    app.appendChild(gameHost);

    const api = {
      progress,
      gameHost,
      resetFocus(target) {
        window.requestAnimationFrame(() => {
          if (target && typeof target.focus === "function") {
            target.focus();
          }
        });
      },
      createHundredGrid
    };

    if (typeof onReady === "function") {
      onReady(api);
    }
  }

  window.Jeux = {
    mountGame,
    createProgress,
    createHundredGrid,
    createPointTracker,
    vocabulary,
    utils: {
      clamp,
      choice,
      shuffle,
      fitText,
      randInt,
      randRange
    },
    ui: {
      createGameCard,
      createFeedbackLine,
      createChoiceGrid
    }
  };
})();
