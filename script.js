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
    feedback: "Listen, then pop.",
  },
  free: {
    name: "Pop",
    prompt: () => "Pop the balls",
    feedback: "Tap any color.",
  },
  sort: {
    name: "Sort",
    prompt: (color) => `Put ${color.name} away`,
    feedback: "Tap the matching basket.",
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
const modeButtons = [...document.querySelectorAll(".mode-button")];
const settingsPanel = document.querySelector("#settingsPanel");
const parentButton = document.querySelector("#parentButton");
const closeSettings = document.querySelector("#closeSettings");
const choiceCount = document.querySelector("#choiceCount");
const choiceCountLabel = document.querySelector("#choiceCountLabel");
const voiceToggle = document.querySelector("#voiceToggle");
const motionToggle = document.querySelector("#motionToggle");
const celebration = document.querySelector("#celebration");

let mode = "find";
let targetColor = colors[0];
let secondTargetColor = colors[1];
let choices = [];
let memoryStep = 0;
let countGoal = 5;
let countProgress = 0;
let locked = false;
let audioContext;

const positions = [
  { x: 28, y: 35, size: 170 },
  { x: 68, y: 38, size: 168 },
  { x: 35, y: 68, size: 160 },
  { x: 72, y: 70, size: 158 },
  { x: 50, y: 52, size: 150 },
];

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function speak(text) {
  if (!voiceToggle.checked || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.78;
  utterance.pitch = 1.12;
  window.speechSynthesis.speak(utterance);
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
  playTone(base, 0, 0.08, "sine", 0.1);
  playTone(base * 1.45, 0.08, 0.12, "triangle", 0.08);
}

function playHappySound() {
  [440, 554, 659, 880].forEach((tone, index) => {
    playTone(tone, index * 0.08, 0.12, "triangle", 0.08);
  });
}

function updatePrompt() {
  const text = modes[mode].prompt(targetColor, secondTargetColor);
  promptEl.textContent = text;
  feedbackText.textContent = modes[mode].feedback;
  speak(text);
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
    ballStage.appendChild(ball);
  });
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
  speak(`Try ${targetColor.name}.`);
  window.setTimeout(() => ball.classList.remove("wiggle"), 520);
}

function handleBallTap(color, ball, colorIndex) {
  if (locked) return;

  if (mode === "free") {
    reward(color, ball, colorIndex);
    feedbackText.textContent = color.name;
    speak(color.name);
    window.setTimeout(newRound, 900);
    return;
  }

  if (mode === "count") {
    countProgress += 1;
    reward(color, ball, colorIndex);
    feedbackText.textContent = `${countProgress}`;
    speak(String(countProgress));
    if (countProgress >= countGoal) {
      locked = true;
      window.setTimeout(() => {
        feedbackText.textContent = "Five pops!";
        speak("Five pops!");
        window.setTimeout(newRound, 1200);
      }, 500);
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
    feedbackText.textContent = `Tap the ${color.name} basket.`;
    targetColor = color;
    speak(`Tap the ${color.name} basket.`);
    return;
  }

  if (color.name === targetColor.name) {
    locked = true;
    reward(color, ball, colorIndex);
    feedbackText.textContent = `Yes, ${color.name}!`;
    speak(`Yes, ${color.name}!`);
    window.setTimeout(newRound, 1300);
    return;
  }

  gentleTryAgain(ball);
}

function handleBasketTap(color, basket) {
  if (mode !== "sort") return;

  if (color.name === targetColor.name) {
    basket.classList.add("hit");
    sticker.textContent = "😀";
    playHappySound();
    celebrate();
    feedbackText.textContent = `${color.name} basket!`;
    speak(`${color.name} basket!`);
    window.setTimeout(newRound, 1200);
    return;
  }

  basket.classList.add("hit");
  window.setTimeout(() => basket.classList.remove("hit"), 400);
  speak(`Try ${targetColor.name}.`);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    modeButtons.forEach((modeButton) => modeButton.classList.remove("active"));
    button.classList.add("active");
    mode = button.dataset.mode;
    newRound();
  });
});

repeatButton.addEventListener("click", updatePrompt);
parentButton.addEventListener("click", () => settingsPanel.classList.remove("hidden"));
closeSettings.addEventListener("click", () => settingsPanel.classList.add("hidden"));
choiceCount.addEventListener("input", () => {
  choiceCountLabel.textContent = choiceCount.value;
  newRound();
});
voiceToggle.addEventListener("change", updatePrompt);
motionToggle.addEventListener("change", renderBalls);

newRound();
