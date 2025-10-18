(function (Jeux) {
  "use strict";

  const TOTAL_POINTS = 100;
  const TARGET_ROUNDS = 30;
  const STEP = TOTAL_POINTS / TARGET_ROUNDS;
  const WAIT_MS = 420;

  const { utils, ui, createPointTracker } = Jeux;
  const { clamp, choice, randInt } = utils;
  const { createGameCard, createFeedbackLine } = ui;

  function buildProblem(stage) {
    let a;
    let b;
    let op;
    let answer;
    if (stage < 10) {
      op = "+";
      a = randInt(5);
      b = randInt(5);
      answer = a + b;
    } else if (stage < 20) {
      op = Math.random() < 0.7 ? "+" : "-";
      a = randInt(10);
      b = randInt(10);
      if (op === "-" && b > a) [a, b] = [b, a];
      answer = op === "+" ? a + b : a - b;
    } else if (stage < 28) {
      op = Math.random() < 0.6 ? "+" : "-";
      a = randInt(12);
      b = randInt(12);
      if (op === "-" && b > a) [a, b] = [b, a];
      answer = op === "+" ? a + b : a - b;
    } else if (stage < 29) {
      op = "×";
      a = 2 + randInt(2);
      b = 2 + randInt(4);
      answer = a * b;
    } else {
      op = "×";
      a = 4;
      b = 6;
      answer = a * b;
    }
    return { a, b, op, answer };
  }

  function formatPrompt(problem) {
    return `${problem.a} ${problem.op} ${problem.b} =`;
  }

  Jeux.mountGame({
    title: "Quick Math Adventure",
    totalLevels: TOTAL_POINTS,
    onReady({ progress, gameHost, resetFocus, createHundredGrid }) {
      const app = document.getElementById("app");
      app.classList.add("uses-grid-progress", "quick-math-app");

      const card = createGameCard("quick-math-card");

      const grid = createHundredGrid({ total: TOTAL_POINTS, label: "Progression" });
      const tracker = createPointTracker({ total: TOTAL_POINTS, progress, grid });

      const promptEl = document.createElement("p");
      promptEl.className = "math-prompt";
      promptEl.textContent = "Prêt ?";

      const form = document.createElement("form");
      form.className = "answer-form";
      form.setAttribute("autocomplete", "off");

      const input = document.createElement("input");
      input.type = "number";
      input.inputMode = "numeric";
      input.placeholder = "?";
      input.className = "answer-input";
      input.setAttribute("aria-label", "Ta réponse");

      const submit = document.createElement("button");
      submit.type = "submit";
      submit.textContent = "Valider";

      form.appendChild(input);
      form.appendChild(submit);

      const feedback = createFeedbackLine();

      const replay = document.createElement("button");
      replay.type = "button";
      replay.id = "replay";
      replay.textContent = "Recommencer";
      replay.classList.add("is-ghost");
      replay.style.display = "none";

      const actions = document.createElement("div");
      actions.className = "game-actions";
      actions.appendChild(replay);

      card.appendChild(grid.root);
      card.appendChild(promptEl);
      card.appendChild(form);
      card.appendChild(feedback);
      card.appendChild(actions);

      gameHost.appendChild(card);

      const successMessages = ["Bravo !", "Bien vu !", "Gagné !", "Continue !"];
      const retryMessages = ["Réessaie", "Presque", "Encore", "Regarde bien"];

      let streak = 0;
      let expected = null;
      let finished = false;
      let busy = false;
      let roundStart = 0;

      function stageIndex() {
        return clamp(Math.floor(tracker.value / STEP), 0, TARGET_ROUNDS - 1);
      }

      function setInputState(state) {
        input.classList.remove("success", "error");
        if (state) input.classList.add(state);
      }

      function showFeedback(message) {
        feedback.textContent = message || "";
      }

      function computeReward(elapsed) {
        let gain = STEP;
        if (elapsed < 1.8) gain += 2;
        else if (elapsed < 3.0) gain += 1;
        if (streak >= 3) gain += 1;
        return gain;
      }

      function computePenalty() {
        if (tracker.value > 70) return 6;
        if (tracker.value > 40) return 5;
        return 4;
      }

      function finish() {
        finished = true;
        busy = true;
        card.classList.add("is-finished");
        promptEl.textContent = "Fantastique !";
        showFeedback("Tu as rempli la grille.");
        replay.style.display = "inline-flex";
        resetFocus(replay);
      }

      function nextProblem(delay) {
        busy = true;
        window.setTimeout(() => {
          if (finished) return;
          const stage = stageIndex();
          const problem = buildProblem(stage);
          expected = problem.answer;
          promptEl.textContent = formatPrompt(problem);
          input.value = "";
          setInputState("");
          showFeedback("");
          resetFocus(input);
          roundStart = performance.now();
          busy = false;
        }, delay || 0);
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy || finished) return;
        const value = parseInt(input.value, 10);
        if (Number.isNaN(value)) {
          setInputState("error");
          showFeedback(choice(retryMessages));
          return;
        }
        busy = true;
        if (value === expected) {
          streak += 1;
          const elapsed = (performance.now() - roundStart) / 1000;
          const gain = computeReward(elapsed);
          tracker.add(gain);
          setInputState("success");
          showFeedback(choice(successMessages));
          if (tracker.isComplete()) {
            finish();
            return;
          }
          nextProblem(WAIT_MS);
        } else {
          streak = 0;
          const penalty = computePenalty();
          tracker.add(-penalty);
          setInputState("error");
          showFeedback(choice(retryMessages));
          nextProblem(WAIT_MS);
        }
      });

      replay.addEventListener("click", function () {
        finished = false;
        busy = false;
        card.classList.remove("is-finished");
        replay.style.display = "none";
        streak = 0;
        setInputState("");
        showFeedback("");
        tracker.reset();
        nextProblem(0);
      });

      tracker.reset();
      nextProblem(0);
    }
  });
})(window.Jeux);
