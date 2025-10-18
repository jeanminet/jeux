(function (Jeux) {
  "use strict";

  const TOTAL_POINTS = 100;

  const { utils, ui, createPointTracker } = Jeux;
  const { clamp, choice, shuffle, randRange } = utils;
  const { createGameCard, createFeedbackLine, createChoiceGrid } = ui;

  const SUCCESS_LINES = ["Bravo !", "Bien joué !", "Super !", "Continue !"];
  const RETRY_LINES = ["Regarde la suite", "Presque", "Essaie encore", "Observe bien"];

  const LEVELS = [
    { length: 4, start: [0, 12], steps: [1], range: [0, 20] },
    { length: 4, start: [2, 24], steps: [1, 2], range: [0, 40] },
    { length: 5, start: [4, 36], steps: [2, 3], range: [0, 60] },
    { length: 5, start: [8, 60], steps: [2, 4, 5], range: [0, 90] },
    { length: 5, start: [10, 80], steps: [5, 10], range: [0, 120] }
  ];

  function configFor(level) {
    if (level <= 1) return LEVELS[0];
    if (level === 2) return LEVELS[1];
    if (level === 3) return LEVELS[2];
    if (level === 4) return LEVELS[3];
    return LEVELS[4];
  }

  function buildRound(level) {
    const cfg = configFor(level);
    const length = cfg.length;
    const step = choice(cfg.steps);
    const startMax = Math.max(cfg.start[0], cfg.start[1] - step * (length - 1));
    const start = randRange(cfg.start[0], startMax);
    const seq = Array.from({ length }, (_, index) => start + index * step);
    const missingIndex = randRange(1, length - 2);
    const answer = seq[missingIndex];
    const display = seq.map((value, index) => (index === missingIndex ? null : value));

    const offsets = [step, -step, step * 2, -step * 2, step + 1, -step - 1, 1, -1].filter(
      (value) => value !== 0
    );
    const options = new Set([answer]);
    const bounds = cfg.range || [0, 120];
    let guard = 0;
    while (options.size < 4 && guard < 40) {
      const raw = answer + choice(offsets);
      const clamped = Math.max(bounds[0], Math.min(bounds[1], raw));
      if (clamped !== answer) {
        options.add(clamped);
      }
      guard += 1;
    }
    while (options.size < 4) {
      const filler = randRange(bounds[0], bounds[1]);
      if (filler !== answer) options.add(filler);
    }

    return {
      display,
      answer,
      options: shuffle(Array.from(options))
    };
  }

  function levelFromProgress(progress) {
    return Math.min(5, Math.max(1, Math.floor(progress / 20) + 1));
  }

  function rewardAmount(elapsed, streak) {
    let points = 4;
    if (elapsed < 2.2) points += 1;
    if (streak >= 3) points += 1;
    return points;
  }

  function penaltyAmount(progress) {
    if (progress > 70) return 6;
    if (progress > 40) return 5;
    return 4;
  }

  Jeux.mountGame({
    title: "Number Ladder",
    totalLevels: TOTAL_POINTS,
    onReady({ progress, gameHost, resetFocus, createHundredGrid }) {
      const app = document.getElementById("app");
      app.classList.add("uses-grid-progress", "number-ladder-app");

      const card = createGameCard("number-ladder-card");

      const grid = createHundredGrid({ total: TOTAL_POINTS, label: "Progression" });
      const tracker = createPointTracker({ total: TOTAL_POINTS, progress, grid });

      const prompt = document.createElement("p");
      prompt.className = "ladder-prompt";
      prompt.textContent = "Complète la suite";

      const sequence = document.createElement("div");
      sequence.className = "ladder-sequence";
      sequence.setAttribute("role", "group");
      sequence.setAttribute("aria-label", "Suite de nombres à compléter");

      const choiceGrid = createChoiceGrid({
        className: "ladder-choices",
        ariaLabel: "Choisis le nombre manquant",
        fit: { min: 26, max: 48 },
        onSelect(option, button) {
          if (!option) return;
          onPick(option.value, button);
        }
      });

      const feedback = createFeedbackLine();

      const restart = document.createElement("button");
      restart.type = "button";
      restart.textContent = "Recommencer";
      restart.classList.add("is-ghost");
      restart.style.display = "none";

      const actions = document.createElement("div");
      actions.className = "game-actions";
      actions.appendChild(restart);

      card.appendChild(grid.root);
      card.appendChild(prompt);
      card.appendChild(sequence);
      card.appendChild(choiceGrid.root);
      card.appendChild(feedback);
      card.appendChild(actions);

      gameHost.appendChild(card);

      let currentRound = null;
      let busy = false;
      let streak = 0;
      let roundStart = 0;

      function renderSequence(values) {
        sequence.innerHTML = "";
        values.forEach((value) => {
          const cell = document.createElement("div");
          cell.className = "ladder-step";
          if (value === null) {
            cell.classList.add("ladder-step--missing");
            cell.textContent = "?";
          } else {
            cell.textContent = value;
          }
          sequence.appendChild(cell);
        });
      }

      function finish() {
        busy = true;
        feedback.textContent = "Super ! La grille est complète.";
        restart.style.display = "inline-flex";
        choiceGrid.lock();
        resetFocus(restart);
      }

      function nextRound(delay) {
        busy = true;
        window.setTimeout(() => {
          const level = levelFromProgress(tracker.value);
          currentRound = buildRound(level);
          renderSequence(currentRound.display);
          choiceGrid.setOptions(
            currentRound.options.map((value) => ({
              label: value,
              value,
              ariaLabel: `Choisir le nombre ${value}`
            }))
          );
          choiceGrid.unlock();
          feedback.textContent = "";
          roundStart = performance.now();
          busy = false;
        }, delay || 0);
      }

      function onPick(value, button) {
        if (busy) return;
        if (!currentRound) return;
        if (value === currentRound.answer) {
          busy = true;
          streak += 1;
          choiceGrid.lock();
          button.classList.add("is-correct");
          const elapsed = (performance.now() - roundStart) / 1000;
          const gain = rewardAmount(elapsed, streak);
          tracker.add(gain);
          feedback.textContent = choice(SUCCESS_LINES);
          if (tracker.isComplete()) {
            finish();
            return;
          }
          window.setTimeout(() => {
            nextRound(140);
          }, 520);
        } else {
          streak = 0;
          button.classList.add("is-wrong");
          const loss = penaltyAmount(tracker.value);
          tracker.add(-loss);
          feedback.textContent = choice(RETRY_LINES);
          window.setTimeout(() => {
            button.classList.remove("is-wrong");
          }, 380);
        }
      }

      restart.addEventListener("click", () => {
        restart.style.display = "none";
        streak = 0;
        busy = false;
        choiceGrid.unlock();
        choiceGrid.clear();
        renderSequence([]);
        tracker.reset();
        feedback.textContent = "";
        nextRound(0);
      });

      window.addEventListener("resize", () => {
        window.clearTimeout(window.__ladderTimer);
        window.__ladderTimer = window.setTimeout(() => {
          choiceGrid.buttons().forEach((button) => {
            button.style.fontSize = "";
            Jeux.utils.fitText(button, { min: 26, max: 48 });
          });
        }, 80);
      });

      tracker.reset();
      nextRound(0);
    }
  });
})(window.Jeux);
