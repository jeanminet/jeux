(function (Jeux) {
  "use strict";

  const TOTAL_POINTS = 100;

  const { utils, ui, vocabulary, createPointTracker } = Jeux;
  const { choice, shuffle } = utils;
  const { createGameCard, createFeedbackLine, createChoiceGrid } = ui;
  const wordBank = vocabulary;

  const SUCCESS_LINES = ["Bravo !", "Bien joué !", "Super !", "Tu progresses !"];
  const ERROR_LINES = [
    "Essaie encore.",
    "Ce n'est pas celui-ci.",
    "Regarde bien l'image.",
    "Tu y es presque !"
  ];

  function poolForLevel(level) {
    const pool = wordBank.byDifficulty(level, 1);
    return pool.length ? pool : wordBank.all;
  }

  function pickRound(level) {
    const pool = poolForLevel(level);
    const target = choice(pool.length ? pool : wordBank.all);
    if (!target) return null;
    const used = new Set([target.w]);
    let distractors = shuffle(pool.filter((item) => item && !used.has(item.w)));
    if (distractors.length < 3) {
      const fallback = shuffle(wordBank.all.filter((item) => item && !used.has(item.w)));
      distractors = distractors.concat(fallback);
    }
    distractors = distractors.filter(Boolean).slice(0, 3);
    return { target, options: shuffle([target, ...distractors]) };
  }

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

  Jeux.mountGame({
    title: "Mots illustrés",
    totalLevels: TOTAL_POINTS,
    onReady({ progress, gameHost, resetFocus, createHundredGrid }) {
      const app = document.getElementById("app");
      app.classList.add("uses-grid-progress", "word-grid-app");

      const card = createGameCard("word-grid-card");

      const picture = document.createElement("div");
      picture.className = "picture";
      picture.setAttribute("aria-hidden", "true");

      const grid = createHundredGrid({ total: TOTAL_POINTS, label: "Progression" });
      const tracker = createPointTracker({ total: TOTAL_POINTS, progress, grid });

      const choiceGrid = createChoiceGrid({
        className: "word-grid-choices",
        ariaLabel: "Choisis le mot correspondant à l'image",
        fit: { min: 26, max: 54 },
        onSelect(option, button) {
          if (!option) return;
          onPick(option.value, button);
        }
      });

      const feedback = createFeedbackLine();
      feedback.classList.add("word-grid-feedback");

      const restart = document.createElement("button");
      restart.type = "button";
      restart.textContent = "Recommencer";
      restart.classList.add("is-ghost");
      restart.style.display = "none";

      const actions = document.createElement("div");
      actions.className = "game-actions";
      actions.appendChild(restart);

      card.appendChild(picture);
      card.appendChild(grid.root);
      card.appendChild(choiceGrid.root);
      card.appendChild(feedback);
      card.appendChild(actions);

      gameHost.appendChild(card);

      let currentRound = null;
      let busy = false;
      let streak = 0;
      let roundStart = 0;

      function finish() {
        busy = true;
        feedback.textContent = "Fantastique ! Tu as complété la grille.";
        restart.style.display = "inline-flex";
        choiceGrid.lock();
        resetFocus(restart);
      }

      function nextRound(delay) {
        busy = true;
        window.setTimeout(() => {
          const level = levelFromProgress(tracker.value);
          const round = pickRound(level);
          if (!round) {
            feedback.textContent = "Pas de mots disponibles";
            busy = false;
            return;
          }
          currentRound = round;
          picture.textContent = currentRound.target.img;
          picture.classList.add("pulse");
          window.setTimeout(() => picture.classList.remove("pulse"), 320);
          choiceGrid.setOptions(
            currentRound.options.map((option) => ({
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
        window.clearTimeout(window.__wordGridTimer);
        window.__wordGridTimer = window.setTimeout(() => {
          choiceGrid.buttons().forEach((button) => {
            button.style.fontSize = "";
            Jeux.utils.fitText(button, { min: 26, max: 54 });
          });
        }, 80);
      });

      tracker.reset();
      nextRound(0);
    }
  });
})(window.Jeux);
