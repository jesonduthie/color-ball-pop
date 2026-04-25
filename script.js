const colors = [
  { name: "red", value: "#e94f4f", bright: "#ff6b6b" },
  { name: "blue", value: "#3b82f6", bright: "#60a5fa" },
  { name: "yellow", value: "#f4b63f", bright: "#ffd166" },
  { name: "green", value: "#35a86b", bright: "#57cc99" },
  { name: "purple", value: "#8b5cf6", bright: "#a78bfa" },
  { name: "orange", value: "#f97316", bright: "#fb923c" },
];

const modes = {
  find: {
    name: "Find",
    prompt: (color) => `Find ${color.name}`,
    feedback: "Match the color.",
  },
  free: {
    name: "Pop",
    prompt: () => "Pop the balls",
    feedback: "Tap any color.",
  },
  sort: {
    name: "Sort",
    prompt: (color) => `Put ${color.name} away`,
    feedback: "Choose the matching basket.",
  },
  count: {
    name: "Count",
    prompt: () => "Pop and count",
    feedback: "Count to five.",
  },
  memory: {
    name: "Memory",
    prompt: (color, secondColor) => `${color.name}, then ${secondColor.name}`,
    feedback: "Tap in order.",
  },
};

const ballStage = document.querySelector("#ballStage");
const basketRow = document.querySelector("#basketRow");
const promptEl = document.querySelector("#prompt");
const feedbackText = document.querySelector("#feedbackText");
const sticker = document.querySelector("#sticker");
const repeatButton = document.querySelector("#repeatButton");
const targetBall = document.querySelector("#targetBall");
const targetText = document.querySelector("#targetText");
const settingsPanel = document.querySelector("#settingsPanel");
const parentButton = document.querySelector("#parentButton");
const closeSettings = document.querySelector("#closeSettings");
const playerBadge = document.querySelector("#playerBadge");
const playerDot = document.querySelector("#playerDot");
const playerBadgeName = document.querySelector("#playerBadgeName");
const playerBadgeScore = document.querySelector("#playerBadgeScore");
const choiceCount = document.querySelector("#choiceCount");
const choiceCountLabel = document.querySelector("#choiceCountLabel");
const modeSelect = document.querySelector("#modeSelect");
const voiceToggle = document.querySelector("#voiceToggle");
const motionToggle = document.querySelector("#motionToggle");
const celebration = document.querySelector("#celebration");
const playerTabs = document.querySelector("#playerTabs");
const nameFields = document.querySelector("#nameFields");
const scoreboard = document.querySelector("#scoreboard");
const resetToday = document.querySelector("#resetToday");
const cupStrip = document.querySelector("#cupStrip");
const cupTurn = document.querySelector("#cupTurn");
const cupRound = document.querySelector("#cupRound");
const cupScores = document.querySelector("#cupScores");
const tournamentTurns = document.querySelector("#tournamentTurns");
const startTournament = document.querySelector("#startTournament");
const endTournament = document.querySelector("#endTournament");
const podiumPanel = document.querySelector("#podiumPanel");
const podium = document.querySelector("#podium");
const closePodium = document.querySelector("#closePodium");

let mode = "find";
let targetColor = colors[0];
let secondTargetColor = colors[1];
let choices = [];
let memoryStep = 0;
let countGoal = 5;
let countProgress = 0;
let locked = false;
let audioContext;
let preferredVoice;
let scoreState;
let tournament = null;

const scoreKey = "colorBallPopScoresV1";
const playerColors = ["#e94f4f", "#3b82f6", "#35a86b"];
const defaultPlayers = [
  { id: "p1", name: "Player 1", color: playerColors[0], today: 0, total: 0 },
  { id: "p2", name: "Player 2", color: playerColors[1], today: 0, total: 0 },
  { id: "p3", name: "Player 3", color: playerColors[2], today: 0, total: 0 },
];

const positionsByCount = {
  2: [
    { x: 34, y: 48, size: 178 },
    { x: 68, y: 48, size: 176 },
  ],
  3: [
    { x: 28, y: 42, size: 166 },
    { x: 72, y: 42, size: 166 },
    { x: 50, y: 72, size: 162 },
  ],
  4: [
    { x: 28, y: 38, size: 158 },
    { x: 72, y: 38, size: 158 },
    { x: 28, y: 72, size: 154 },
    { x: 72, y: 72, size: 154 },
  ],
  5: [
    { x: 24, y: 38, size: 146 },
    { x: 76, y: 38, size: 146 },
    { x: 50, y: 54, size: 150 },
    { x: 28, y: 76, size: 142 },
    { x: 72, y: 76, size: 142 },
  ],
};

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadScores() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(scoreKey) || "null");
  } catch {
    saved = null;
  }
  const today = todayKey();

  if (!saved || !Array.isArray(saved.players)) {
    return { activePlayerId: "p1", date: today, players: defaultPlayers.map((player) => ({ ...player })) };
  }

  const players = defaultPlayers.map((fallback) => {
    const savedPlayer = saved.players.find((player) => player.id === fallback.id);
    return { ...fallback, ...savedPlayer, today: saved.date === today ? savedPlayer?.today || 0 : 0 };
  });

  return {
    activePlayerId: saved.activePlayerId || "p1",
    date: today,
    players,
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

function saveScores() {
  localStorage.setItem(scoreKey, JSON.stringify(scoreState));
}

function activePlayer() {
  return scoreState.players.find((player) => player.id === scoreState.activePlayerId) || scoreState.players[0];
}

function activeTournamentPlayer() {
  if (!tournament) return activePlayer();
  return tournament.players[tournament.currentPlayerIndex] || tournament.players[0];
}

function awardStars(amount = 1) {
  const player = activePlayer();
  player.today += amount;
  player.total += amount;
  saveScores();
  renderPlayers();
}

function renderPlayers() {
  renderPlayerChrome();
  renderNameFields();
}

function renderPlayerChrome() {
  const active = tournament ? activeTournamentPlayer() : activePlayer();
  const score = tournament ? formatScore(active.score) : `${active.today} ★`;
  playerDot.style.setProperty("--player-color", active.color);
  playerBadgeName.textContent = active.name;
  playerBadgeScore.textContent = score;

  playerTabs.innerHTML = "";
  scoreState.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `player-tab${player.id === scoreState.activePlayerId ? " active" : ""}`;
    button.style.setProperty("--player-color", player.color);
    button.innerHTML = `<span aria-hidden="true"></span><strong>${escapeHtml(player.name)}</strong>`;
    button.addEventListener("click", () => {
      scoreState.activePlayerId = player.id;
      saveScores();
      renderPlayerChrome();
    });
    playerTabs.appendChild(button);
  });

  scoreboard.innerHTML = "";
  [...scoreState.players]
    .sort((a, b) => b.today - a.today || b.total - a.total)
    .forEach((player, index) => {
      const row = document.createElement("div");
      row.className = "score-row";
      row.style.setProperty("--player-color", player.color);
      row.innerHTML = `
        <span class="rank">${index + 1}</span>
        <span>${escapeHtml(player.name)}</span>
        <strong>${player.today} ★</strong>
        <span class="all-time">${player.total} total</span>
      `;
      scoreboard.appendChild(row);
    });
}

function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function startColorCup() {
  const turnsEach = Number(tournamentTurns.value);
  tournament = {
    turnsEach,
    turnIndex: 0,
    currentPlayerIndex: 0,
    totalTurns: turnsEach * scoreState.players.length,
    players: scoreState.players.map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      score: 0,
      correctStreak: 0,
    })),
  };

  mode = "find";
  modeSelect.value = "find";
  choiceCount.value = "3";
  choiceCountLabel.textContent = "3";
  cupStrip.classList.remove("hidden");
  endTournament.classList.remove("hidden");
  settingsPanel.classList.add("hidden");
  podiumPanel.classList.add("hidden");
  nextTournamentTurn();
}

function endColorCup(showResults = false) {
  if (showResults && tournament) {
    showPodium();
  }
  tournament = null;
  cupStrip.classList.add("hidden");
  endTournament.classList.add("hidden");
  renderPlayerChrome();
  if (!showResults) newRound();
}

function nextTournamentTurn() {
  if (!tournament) return;

  if (tournament.turnIndex >= tournament.totalTurns) {
    endColorCup(true);
    return;
  }

  locked = false;
  const player = activeTournamentPlayer();
  scoreState.activePlayerId = player.id;
  saveScores();
  renderCupScores();
  renderPlayerChrome();
  newRound();
}

function renderCupScores() {
  if (!tournament) return;
  const player = activeTournamentPlayer();
  const round = Math.floor(tournament.turnIndex / tournament.players.length) + 1;
  cupTurn.textContent = `${player.name}'s turn`;
  cupRound.textContent = `Round ${round} of ${tournament.turnsEach}`;
  cupScores.innerHTML = "";

  tournament.players.forEach((entry, index) => {
    const score = document.createElement("div");
    score.className = `cup-score${index === tournament.currentPlayerIndex ? " active" : ""}`;
    score.style.setProperty("--player-color", entry.color);
    score.innerHTML = `<span aria-hidden="true"></span><strong>${escapeHtml(entry.name)}</strong><em>${formatScore(entry.score)}</em>`;
    cupScores.appendChild(score);
  });
}

function completeTournamentTurn(wasCorrect) {
  if (!tournament) return;
  const player = activeTournamentPlayer();

  if (wasCorrect) {
    player.correctStreak += 1;
    player.score += 1;
    if (player.correctStreak > 0 && player.correctStreak % 3 === 0) {
      player.score += 1;
      feedbackText.textContent = `${player.name} bonus star!`;
      speak(`${player.name} gets a bonus star!`);
    }
  } else {
    player.correctStreak = 0;
    player.score = Math.max(0, player.score - 0.5);
  }

  renderCupScores();
  renderPlayerChrome();
  tournament.turnIndex += 1;
  tournament.currentPlayerIndex = (tournament.currentPlayerIndex + 1) % tournament.players.length;
  window.setTimeout(nextTournamentTurn, wasCorrect ? 1250 : 950);
}

function showPodium() {
  const ordered = [...tournament.players].sort((a, b) => b.score - a.score);
  const medals = ["👑", "★", "●"];
  const heights = ["190px", "150px", "120px"];
  const colors = ["#ffd166", "#c8d1d8", "#d7a46f"];

  podium.innerHTML = "";
  ordered.forEach((player, index) => {
    const place = document.createElement("div");
    place.className = "podium-place";
    place.style.setProperty("--height", heights[index]);
    place.style.setProperty("--medal", colors[index]);
    place.innerHTML = `
      <span class="medal">${medals[index]}</span>
      <strong>${index + 1}. ${escapeHtml(player.name)}</strong>
      <span class="score">${formatScore(player.score)} stars</span>
    `;
    podium.appendChild(place);
  });

  podiumPanel.classList.remove("hidden");
  speak(`${ordered[0].name} wins the Color Cup!`);
}

function renderNameFields() {
  nameFields.innerHTML = "";
  scoreState.players.forEach((player, index) => {
    const label = document.createElement("label");
    label.className = "name-field";
    label.innerHTML = `
      <span>Kid ${index + 1} name</span>
      <input value="${escapeHtml(player.name)}" maxlength="16" aria-label="Kid ${index + 1} name" />
    `;
    const input = label.querySelector("input");
    input.addEventListener("input", () => {
      player.name = input.value.trim() || `Player ${index + 1}`;
      saveScores();
      renderPlayerChrome();
    });
    nameFields.appendChild(label);
  });
}

function speak(text) {
  if (!voiceToggle.checked || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getPreferredVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.72;
  utterance.pitch = 1.18;
  utterance.volume = 0.92;
  window.speechSynthesis.speak(utterance);
}

function getPreferredVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return preferredVoice;

  const preferredNames = [
    "Samantha",
    "Karen",
    "Moira",
    "Tessa",
    "Google UK English Female",
    "Google US English",
    "Microsoft Jenny",
    "Microsoft Aria",
  ];

  preferredVoice =
    preferredNames.map((name) => voices.find((voice) => voice.name.includes(name))).find(Boolean) ||
    voices.find((voice) => voice.lang.startsWith("en") && /female|natural|premium/i.test(voice.name)) ||
    voices.find((voice) => voice.lang.startsWith("en")) ||
    voices[0];

  return preferredVoice;
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, start, duration, type = "sine", gain = 0.12) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const volume = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
  volume.gain.setValueAtTime(0.001, context.currentTime + start);
  volume.gain.exponentialRampToValueAtTime(gain, context.currentTime + start + 0.02);
  volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + start + duration);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(context.currentTime + start);
  oscillator.stop(context.currentTime + start + duration + 0.03);
}

function playPopSound(colorIndex = 0) {
  const base = 360 + colorIndex * 45;
  playTone(base, 0, 0.06, "sine", 0.08);
  playTone(base * 1.5, 0.06, 0.1, "triangle", 0.07);
}

function playHappySound() {
  [523, 659, 784, 1046].forEach((tone, index) => {
    playTone(tone, index * 0.075, 0.13, "triangle", 0.07);
  });
}

function playPromptCue() {
  if (mode === "count") {
    [392, 494, 587, 784, 988].forEach((tone, index) => playTone(tone, index * 0.08, 0.08, "sine", 0.05));
    return;
  }

  if (mode === "memory") {
    playColorCue(targetColor, 0);
    playColorCue(secondTargetColor, 0.42);
    return;
  }

  playColorCue(targetColor, 0);
}

function playColorCue(color, start = 0) {
  const index = colors.findIndex((entry) => entry.name === color.name);
  const base = 330 + index * 72;
  playTone(base, start, 0.14, "sine", 0.06);
  playTone(base * 1.25, start + 0.12, 0.16, "triangle", 0.055);
}

function updatePrompt() {
  const tournamentPlayer = tournament ? activeTournamentPlayer() : null;
  const text = tournamentPlayer ? `${tournamentPlayer.name}, find ${targetColor.name}` : modes[mode].prompt(targetColor, secondTargetColor);
  promptEl.textContent = text;
  feedbackText.textContent = tournamentPlayer ? "One try. Choose carefully." : modes[mode].feedback;
  targetBall.style.setProperty("--target-color", `linear-gradient(135deg, ${targetColor.bright}, ${targetColor.value})`);
  targetText.textContent = tournamentPlayer ? `Color Cup: ${targetColor.name}` : mode === "free" ? "Pop any ball" : mode === "count" ? "Pop five balls" : mode === "memory" ? `${targetColor.name}, then ${secondTargetColor.name}` : `Match ${targetColor.name}`;
  speak(text);
  window.setTimeout(playPromptCue, 250);
}

function pickChoices() {
  const total = Number(choiceCount.value);
  targetColor = colors[Math.floor(Math.random() * colors.length)];
  const others = shuffle(colors.filter((color) => color.name !== targetColor.name)).slice(0, total - 1);
  choices = shuffle([targetColor, ...others]);

  if (mode === "memory") {
    secondTargetColor = shuffle(choices.filter((color) => color.name !== targetColor.name))[0] || choices[0];
    memoryStep = 0;
  }
}

function renderBalls() {
  ballStage.innerHTML = "";
  ballStage.classList.toggle("motion-on", motionToggle.checked);
  const positions = positionsByCount[choices.length] || positionsByCount[3];

  choices.forEach((color, index) => {
    const position = positions[index];
    const ball = document.createElement("button");
    ball.type = "button";
    ball.className = "ball";
    ball.dataset.color = color.name;
    ball.setAttribute("aria-label", `${color.name} ball`);
    ball.style.setProperty("--ball-color", `linear-gradient(135deg, ${color.bright}, ${color.value})`);
    ball.style.setProperty("--x", `${position.x}%`);
    ball.style.setProperty("--y", `${position.y}%`);
    ball.style.setProperty("--size", `clamp(128px, ${position.size / 7}vw, ${position.size}px)`);
    ball.style.setProperty("--speed", `${2.4 + index * 0.35}s`);
    ball.innerHTML = `<span class="ball-label">${mode === "free" ? color.name : ""}</span>`;
    ball.addEventListener("click", () => handleBallTap(color, ball, index));
    ball.addEventListener("pointerdown", (event) => startDrag(event, color, ball, index));
    ballStage.appendChild(ball);
  });
}

function renderOneBall(color, index) {
  const positions = positionsByCount[choices.length] || positionsByCount[3];
  const position = positions[index] || positions[0];
  const ball = document.createElement("button");
  ball.type = "button";
  ball.className = "ball";
  ball.dataset.color = color.name;
  ball.setAttribute("aria-label", `${color.name} ball`);
  ball.style.setProperty("--ball-color", `linear-gradient(135deg, ${color.bright}, ${color.value})`);
  ball.style.setProperty("--x", `${position.x}%`);
  ball.style.setProperty("--y", `${position.y}%`);
  ball.style.setProperty("--size", `clamp(128px, ${position.size / 7}vw, ${position.size}px)`);
  ball.style.setProperty("--speed", `${2.4 + index * 0.35}s`);
  ball.innerHTML = `<span class="ball-label">${mode === "free" ? color.name : ""}</span>`;
  ball.addEventListener("click", () => handleBallTap(color, ball, index));
  ball.addEventListener("pointerdown", (event) => startDrag(event, color, ball, index));
  ballStage.appendChild(ball);
}

function renderBaskets() {
  basketRow.innerHTML = "";
  basketRow.classList.toggle("hidden", mode !== "sort");

  if (mode !== "sort") return;

  choices.slice(0, 3).forEach((color) => {
    const basket = document.createElement("button");
    basket.type = "button";
    basket.className = "basket";
    basket.dataset.color = color.name;
    basket.style.setProperty("--basket-color", color.value);
    basket.textContent = color.name;
    basket.addEventListener("click", () => handleBasketTap(color, basket));
    basketRow.appendChild(basket);
  });
}

function startDrag(event, color, ball, colorIndex) {
  if (mode !== "sort" || locked) return;
  event.preventDefault();
  ball.setPointerCapture(event.pointerId);
  ball.style.zIndex = "3";
  moveBallToPointer(event, ball);

  const move = (moveEvent) => moveBallToPointer(moveEvent, ball);
  const end = (endEvent) => {
    ball.releasePointerCapture(endEvent.pointerId);
    ball.removeEventListener("pointermove", move);
    ball.removeEventListener("pointerup", end);
    ball.removeEventListener("pointercancel", end);
    const basket = getBasketAtPoint(endEvent.clientX, endEvent.clientY);
    if (basket) {
      handleBasketTap(color, basket, ball, colorIndex);
      return;
    }
    ball.style.zIndex = "";
    renderBalls();
  };

  ball.addEventListener("pointermove", move);
  ball.addEventListener("pointerup", end);
  ball.addEventListener("pointercancel", end);
}

function moveBallToPointer(event, ball) {
  const stageRect = ballStage.getBoundingClientRect();
  const x = ((event.clientX - stageRect.left) / stageRect.width) * 100;
  const y = ((event.clientY - stageRect.top) / stageRect.height) * 100;
  ball.style.setProperty("--x", `${Math.max(10, Math.min(90, x))}%`);
  ball.style.setProperty("--y", `${Math.max(12, Math.min(88, y))}%`);
}

function getBasketAtPoint(x, y) {
  return [...basketRow.querySelectorAll(".basket")].find((basket) => {
    const rect = basket.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
}

function newRound() {
  locked = false;
  sticker.textContent = "🙂";
  pickChoices();
  if (mode === "count") {
    countGoal = 5;
    countProgress = 0;
  }
  renderBaskets();
  renderBalls();
  updatePrompt();
}

function celebrate() {
  const partyColors = ["#e94f4f", "#3b82f6", "#f4b63f", "#35a86b", "#8b5cf6", "#f97316"];

  for (let index = 0; index < 18; index += 1) {
    const dot = document.createElement("span");
    dot.className = "confetti";
    dot.style.setProperty("--x", `${15 + Math.random() * 70}%`);
    dot.style.setProperty("--y", `${42 + Math.random() * 22}%`);
    dot.style.setProperty("--color", partyColors[index % partyColors.length]);
    celebration.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove());
  }
}

function reward(color, ball, colorIndex) {
  ball.classList.add("pop");
  sticker.textContent = "😀";
  playPopSound(colorIndex);
  playHappySound();
  celebrate();
}

function gentleTryAgain(ball) {
  sticker.textContent = "🙂";
  ball.classList.add("wiggle");
  feedbackText.textContent = `Try ${targetColor.name}.`;
  playTone(220, 0, 0.11, "sine", 0.045);
  playTone(180, 0.1, 0.14, "sine", 0.04);
  speak(`Try ${targetColor.name}.`);
  window.setTimeout(() => ball.classList.remove("wiggle"), 520);
}

function handleBallTap(color, ball, colorIndex) {
  if (locked) return;

  if (tournament) {
    locked = true;
    if (color.name === targetColor.name) {
      reward(color, ball, colorIndex);
      feedbackText.textContent = `Yes! +1`;
      speak("Yes! One star!");
      completeTournamentTurn(true);
      return;
    }

    gentleTryAgain(ball);
    feedbackText.textContent = `Oops. -0.5`;
    speak("Oops. Half a star down.");
    completeTournamentTurn(false);
    return;
  }

  if (mode === "free") {
    reward(color, ball, colorIndex);
    awardStars(1);
    ball.disabled = true;
    feedbackText.textContent = color.name;
    speak(color.name);
    window.setTimeout(() => {
      choices[colorIndex] = shuffle(colors.filter((entry) => !choices.some((choice) => choice.name === entry.name)))[0] || color;
      ball.remove();
      renderOneBall(choices[colorIndex], colorIndex);
    }, 720);
    return;
  }

  if (mode === "count") {
    countProgress += 1;
    reward(color, ball, colorIndex);
    awardStars(1);
    ball.disabled = true;
    feedbackText.textContent = `${countProgress}`;
    speak(String(countProgress));
    if (countProgress >= countGoal) {
      locked = true;
      window.setTimeout(() => {
        feedbackText.textContent = "Five pops!";
        speak("Five pops!");
        window.setTimeout(newRound, 1200);
      }, 500);
      return;
    }

    const remainingBalls = [...ballStage.querySelectorAll(".ball:not(.pop)")];
    if (remainingBalls.length === 0) {
      window.setTimeout(() => {
        choices = shuffle(colors).slice(0, Number(choiceCount.value));
        renderBalls();
      }, 560);
    }
    return;
  }

  if (mode === "memory") {
    const expected = memoryStep === 0 ? targetColor : secondTargetColor;
    if (color.name !== expected.name) {
      gentleTryAgain(ball);
      return;
    }

    reward(color, ball, colorIndex);
    awardStars(memoryStep === 1 ? 2 : 1);
    memoryStep += 1;
    if (memoryStep === 1) {
      feedbackText.textContent = `Now ${secondTargetColor.name}.`;
      speak(`Now ${secondTargetColor.name}.`);
      return;
    }

    locked = true;
    feedbackText.textContent = "You remembered!";
    speak("You remembered!");
    window.setTimeout(newRound, 1300);
    return;
  }

  if (mode === "sort") {
    feedbackText.textContent = `Move it to ${color.name}.`;
    targetColor = color;
    updatePrompt();
    return;
  }

  if (color.name === targetColor.name) {
    locked = true;
    reward(color, ball, colorIndex);
    awardStars(1);
    feedbackText.textContent = `Yes, ${color.name}!`;
    speak(`Yes, ${color.name}!`);
    window.setTimeout(newRound, 1300);
    return;
  }

  gentleTryAgain(ball);
}

function handleBasketTap(color, basket, ball, colorIndex = 0) {
  if (mode !== "sort") return;

  if (color.name === targetColor.name) {
    basket.classList.add("hit");
    if (ball) {
      ball.classList.add("pop");
      ball.disabled = true;
    }
    sticker.textContent = "😀";
    playPopSound(colorIndex);
    playHappySound();
    celebrate();
    awardStars(1);
    feedbackText.textContent = `${color.name} basket!`;
    speak(`${color.name} basket!`);
    window.setTimeout(newRound, 1200);
    return;
  }

  basket.classList.add("hit");
  playTone(210, 0, 0.12, "sine", 0.05);
  playTone(170, 0.12, 0.16, "sine", 0.04);
  window.setTimeout(() => basket.classList.remove("hit"), 400);
  speak(`Try ${targetColor.name}.`);
}

modeSelect.addEventListener("change", () => {
  if (tournament) return;
  mode = modeSelect.value;
  newRound();
});

repeatButton.addEventListener("click", () => {
  updatePrompt();
  playPromptCue();
});
parentButton.addEventListener("click", () => settingsPanel.classList.remove("hidden"));
playerBadge.addEventListener("click", () => settingsPanel.classList.remove("hidden"));
closeSettings.addEventListener("click", () => settingsPanel.classList.add("hidden"));
choiceCount.addEventListener("input", () => {
  choiceCountLabel.textContent = choiceCount.value;
  newRound();
});
voiceToggle.addEventListener("change", updatePrompt);
motionToggle.addEventListener("change", renderBalls);
resetToday.addEventListener("click", () => {
  scoreState.players.forEach((player) => {
    player.today = 0;
  });
  saveScores();
  renderPlayerChrome();
});
startTournament.addEventListener("click", startColorCup);
endTournament.addEventListener("click", () => endColorCup(false));
closePodium.addEventListener("click", () => {
  podiumPanel.classList.add("hidden");
  settingsPanel.classList.remove("hidden");
});
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = undefined;
    getPreferredVoice();
  };
}

scoreState = loadScores();
renderPlayers();
newRound();
