(function (Jeux) {
  "use strict";

  const TOTAL_POINTS = 100;

  const { utils, ui, vocabulary, createPointTracker } = Jeux;
  const { choice, shuffle } = utils;
  const { createGameCard, createFeedbackLine, createChoiceGrid } = ui;
  const wordBank = vocabulary;

  const SUCCESS_LINES = ["Bravo !", "Bien joué !", "Super !", "Continue !"];
  const ERROR_LINES = ["Essaie encore", "Observe bien", "Regarde les lettres", "Tu y es presque"];

  function levelFromProgress(progress) {
    return Math.min(5, Math.max(1, Math.floor(progress / 20) + 1));
  }

  function rewardAmount(elapsed, streak) {
    let points = 4;
    if (elapsed < 1.8) points += 2;
    else if (elapsed < 3.0) points += 1;
    if (streak >= 3) points += 1;
    return points;
  }

  function penaltyAmount(progress) {
    if (progress > 70) return 5;
    if (progress > 40) return 4;
    return 3;
  }

  function buildRound(level) {
    const levelPool = wordBank.byDifficulty(level, 1);
    const candidates = levelPool.length ? levelPool : wordBank.all;
    if (!candidates.length) return null;

    function attemptRound(candidate, useStart) {
      const token = (useStart ? candidate.start : candidate.initial || candidate.w[0] || "").toLowerCase();
      if (!token) return null;
      const avoid = new Set([candidate.w]);
      const sameLevel = candidates.filter((item) => item && !avoid.has(item.w) && !item.w.startsWith(token));
      const extended = sameLevel.length >= 3
        ? sameLevel
        : sameLevel.concat(wordBank.all.filter((item) => item && !avoid.has(item.w) && !item.w.startsWith(token)));
      const distractors = shuffle(extended).filter(Boolean).slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        target: candidate,
        letter: token,
        display: token.toUpperCase(),
        options: shuffle([candidate, ...distractors])
      };
    }

    for (let guard = 0; guard < 8; guard += 1) {
      const candidate = choice(candidates);
      if (!candidate) continue;
      const preferStart = level >= 4 && candidate.start && candidate.start.length > 1;
      const round = attemptRound(candidate, preferStart);
      if (round) return round;
      const fallbackRound = attemptRound(candidate, false);
      if (fallbackRound) return fallbackRound;
    }

    const fallbackTarget = choice(candidates) || candidates[0];
    if (!fallbackTarget) return null;
    const fallbackLetter = (fallbackTarget.initial || fallbackTarget.w[0] || "").toLowerCase();
    const fallbackOptions = shuffle(
      wordBank.all.filter((item) => item && item.w !== fallbackTarget.w && !item.w.startsWith(fallbackLetter))
    ).slice(0, 3);
    return {
      target: fallbackTarget,
      letter: fallbackLetter,
      display: fallbackLetter.toUpperCase(),
      options: shuffle([fallbackTarget, ...fallbackOptions])
    };
  }

  Jeux.mountGame({
    title: "Première lettre",
    totalLevels: TOTAL_POINTS,
    onReady({ progress, gameHost, resetFocus, createHundredGrid }) {
      const app = document.getElementById("app");
      app.classList.add("uses-grid-progress", "first-letter-app");

      const card = createGameCard("first-letter-card");

      const grid = createHundredGrid({ total: TOTAL_POINTS, label: "Progression" });
      const tracker = createPointTracker({ total: TOTAL_POINTS, progress, grid });

      const instruction = document.createElement("p");
      instruction.className = "first-letter-instruction";
      instruction.textContent = "Choisis le mot qui commence par";

      const letterBadge = document.createElement("div");
      letterBadge.className = "letter-badge";
      const letterText = document.createElement("span");
      letterBadge.appendChild(letterText);

      const letterNote = document.createElement("p");
      letterNote.className = "first-letter-note";

      const choiceGrid = createChoiceGrid({
        className: "first-letter-choices",
        ariaLabel: "Choisis le mot qui commence par cette lettre",
        fit: { min: 26, max: 56 },
        onSelect(option, button) {
          if (!option) return;
          onPick(option.value, button);
        }
      });

      const feedback = createFeedbackLine();
      feedback.classList.add("first-letter-feedback");

      const restart = document.createElement("button");
      restart.type = "button";
      restart.textContent = "Recommencer";
      restart.classList.add("is-ghost");
      restart.style.display = "none";

      const actions = document.createElement("div");
      actions.className = "game-actions";
      actions.appendChild(restart);

      card.appendChild(grid.root);
      card.appendChild(instruction);
      card.appendChild(letterBadge);
      card.appendChild(letterNote);
      card.appendChild(choiceGrid.root);
      card.appendChild(feedback);
      card.appendChild(actions);

      gameHost.appendChild(card);

      let currentRound = null;
      let busy = false;
      let streak = 0;
      let roundStart = 0;

      function updateLetter(round) {
        letterText.textContent = round.display;
        letterNote.textContent = `Seule une réponse commence par « ${round.display} ».`;
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
          const round = buildRound(level);
          if (!round) {
            feedback.textContent = "Aucun mot disponible.";
            busy = false;
            return;
          }
          currentRound = round;
          updateLetter(round);
          choiceGrid.setOptions(
            round.options.map((option) => ({
              label: option.w,
              value: option,
              ariaLabel: `Choisir le mot ${option.w}`
            }))
          );
          choiceGrid.unlock();
          feedback.textContent = "";
          roundStart = performance.now();
          busy = false;
        }, delay || 0);
      }

      function onPick(option, button) {
        if (busy) return;
        if (!currentRound) return;
        if (!option || !button) return;
        if (option.w === currentRound.target.w) {
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
          feedback.textContent = choice(ERROR_LINES);
          window.setTimeout(() => {
            button.classList.remove("is-wrong");
          }, 420);
        }
      }

      restart.addEventListener("click", () => {
        restart.style.display = "none";
        streak = 0;
        busy = false;
        choiceGrid.unlock();
        choiceGrid.clear();
        tracker.reset();
        feedback.textContent = "";
        nextRound(0);
      });

      window.addEventListener("resize", () => {
        window.clearTimeout(window.__firstLetterTimer);
        window.__firstLetterTimer = window.setTimeout(() => {
          choiceGrid.buttons().forEach((button) => {
            button.style.fontSize = "";
            Jeux.utils.fitText(button, { min: 26, max: 56 });
          });
        }, 80);
      });

      tracker.reset();
      nextRound(0);
    }
  });
})(window.Jeux);
