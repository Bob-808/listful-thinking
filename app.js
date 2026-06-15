let questions = [];
let players = [];
let activePlayers = [];
let currentPlayerIndex = 0;
let currentQuestion = null;
let foundAnswers = [];
let shuffledQuestions = [];
let currentQuestionIndex = 0;
let Release = 1.52;
let DEV_MODE = false;

let scores = {};
let answerFinders = {};

// Load JSON
async function loadQuestions() {
  try {
    const res = await fetch("questions.json");
    questions = await res.json();

    showModal(
      "Welcome",
      "Welcome to the greatest game ever created by man or machine!!! " +
      questions.length +
      " questions not for the faint of heart. Release: " +
      Release
    );

  } catch (e) {
    showModal("Error Loading!", "Failed to load questions!");
    console.error(e);
  }
}

function addPlayer() {
  const input = document.getElementById("playerInput");
  const name = input.value.trim();

  if (!name) return;

  players.push(name);
  input.value = "";
  renderPlayersSetup();
}

function renderPlayersSetup() {
  const list = document.getElementById("playerList");
  list.innerHTML = players.map(p => `<div>${p}</div>`).join("");
}

function startGame() {
  if (players.length < 2) {
    showModal("Game Requirements", "Need at least 2 players");
    return;
  }

  // Initialize scores
  scores = {};
  players.forEach(p => scores[p] = 0);

  // Shuffle questions
  shuffledQuestions = [...questions];
  shuffleArray(shuffledQuestions);

  currentQuestionIndex = 0;

  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";

  nextQuestion();
}

function nextQuestion() {
  window.scrollTo({ top: 0, behavior: "smooth" });

  // If we've reached the end → reshuffle
  if (currentQuestionIndex >= shuffledQuestions.length) {
    shuffleArray(shuffledQuestions);
    currentQuestionIndex = 0;
    showModal("New Cycle", "Reshuffling questions...");
  }

  currentQuestion = shuffledQuestions[currentQuestionIndex];
  currentQuestionIndex++;

  // Preserve turn order across rounds
  const nextStart = (currentPlayerIndex + 1) % players.length;

  activePlayers = [...players];
  currentPlayerIndex = nextStart;

  foundAnswers = [];
  answerFinders = {};

  document.getElementById("question").textContent = currentQuestion.question;
  document.getElementById("categoryLabel").textContent =
    currentQuestion.category || "";

  renderAnswers();
  renderScoreboard();
  updateTurn();
}

function renderAnswers() {
  const container = document.getElementById("answers");

  container.innerHTML = currentQuestion.answers.map(a => {
    return `
      <div class="answer"
           onclick="markAnswer('${escapeQuotes(a)}', this)">
        ${a}
      </div>
    `;
  }).join("");
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'");
}

function markAnswer(answer, element) {
  const index = foundAnswers.indexOf(answer);

  // Undo
  if (index > -1) {
    foundAnswers.splice(index, 1);
    element.classList.remove("found");

    const lastFinder = answerFinders[answer];
    if (lastFinder) {
      scores[lastFinder] -= 1;
      delete answerFinders[answer];
      renderScoreboard();
    }

    return;
  }

  // Mark new answer
  foundAnswers.push(answer);
  element.classList.add("found");

  const currentPlayer = activePlayers[currentPlayerIndex];
  scores[currentPlayer] += 1;
  answerFinders[answer] = currentPlayer;

  renderScoreboard();

  nextTurn();
  checkEnd();
}

function markWrong() {
  const outPlayer = activePlayers[currentPlayerIndex];

  showModal("Wrong Answer", outPlayer + " is out for this round!");

  activePlayers.splice(currentPlayerIndex, 1);

  if (activePlayers.length === 0) {
    checkEnd();
    return;
  }

  if (currentPlayerIndex >= activePlayers.length) {
    currentPlayerIndex = 0;
  }

  updateTurn();
}

function nextTurn() {
  if (activePlayers.length === 0) return;

  currentPlayerIndex++;

  if (currentPlayerIndex >= activePlayers.length) {
    currentPlayerIndex = 0;
  }

  updateTurn();
}

function updateTurn() {
  if (activePlayers.length === 0) return;

  document.getElementById("currentPlayer").textContent =
    "Current: " + activePlayers[currentPlayerIndex];

  renderScoreboard();
}

function renderScoreboard() {
  const board = document.getElementById("scoreboard");

  board.innerHTML = players
    .map(p => {
      const isActive = activePlayers[currentPlayerIndex] === p;
      return `
        <div class="score-item" style="${isActive ? "border-color: var(--accent);" : ""}">
          <span class="name">${p}</span>
          <span class="points">${scores[p]}</span>
        </div>
      `;
    })
    .join("");
}

function checkEnd() {
  if (foundAnswers.length === currentQuestion.answers.length) {
    showModal("Round Complete", "All answers found!");
    setTimeout(() => nextQuestion(), 800);
  }

  if (activePlayers.length === 0) {
    showModal("Round Over", "No players left!");
    setTimeout(() => nextQuestion(), 800);
  }
}

function showModal(title, message) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMessage").textContent = message;
  document.getElementById("modal").classList.add("active");
}

function closeModal() {
  document.getElementById("modal").classList.remove("active");
}

// preload
window.onload = function () {
  if (DEV_MODE) {
    questions = [
      {
        question: "List the 3 primary colours",
        answers: ["Red", "Blue", "Yellow"],
        category: "Art"
      },
      {
        question: "List the 4 Beatles",
        answers: ["John", "Paul", "George", "Ringo"],
        category: "Music"
      }
    ];

    showModal("DEV MODE", "Using local test data (" + questions.length + " questions)");
  } else {
    loadQuestions();
  }

  renderPlayersSetup();
};
