let questions = [];
let players = [];
let activePlayers = [];
let currentPlayerIndex = 0;
let currentQuestion = null;
let foundAnswers = [];
let shuffledQuestions = [];
let currentQuestionIndex = 0;
let Release = 1.12;
let DEV_MODE = false;

// Load JSON
async function oldloadQuestions() {
  const res = await fetch("questions.json");
  questions = await res.json();
}

async function loadQuestions() {
  try {
    const res = await fetch("questions.json");
    questions = await res.json();

    console.log("Loaded:", questions.length);
	//showModal("Welcome", "Game is starting!");

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

  // ✅ Copy and shuffle questions
  shuffledQuestions = [...questions];
  shuffleArray(shuffledQuestions);

  currentQuestionIndex = 0;

  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";

  nextQuestion();
}

function nextQuestion() {
  // ✅ If we've reached the end → reshuffle
  if (currentQuestionIndex >= shuffledQuestions.length) {
    shuffleArray(shuffledQuestions);
    currentQuestionIndex = 0;

    showModal("New Cycle", "Reshuffling questions...");
  }

  currentQuestion = shuffledQuestions[currentQuestionIndex];
  currentQuestionIndex++;

  activePlayers = [...players];
  currentPlayerIndex = 0;
  foundAnswers = [];

  document.getElementById("question").textContent = currentQuestion.question;

  renderPlayers();
  renderAnswers();
  updateTurn();
}

function renderPlayers() {
  const container = document.getElementById("players");

  container.innerHTML = activePlayers.map((p, i) => {
    const active = i === currentPlayerIndex ? "border:2px solid yellow;" : "";
    return `<div class="player" style="${active}">${p}</div>`;
  }).join("");
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

  if (index > -1) {
    // ✅ Already marked → UNDO it
    foundAnswers.splice(index, 1);
    element.classList.remove("found");
  } else {
    // ✅ Not marked → mark it
    foundAnswers.push(answer);
    element.classList.add("found");
  }

  checkEnd();
}

function markWrong() {
  const outPlayer = activePlayers[currentPlayerIndex];
  showModal("Elimination", outPlayer + " is out!");

  activePlayers.splice(currentPlayerIndex, 1);

  if (currentPlayerIndex >= activePlayers.length) {
    currentPlayerIndex = 0;
  }

  checkEnd();
  updateTurn();
}

function nextTurn() {
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

  renderPlayers();
}

function checkEnd() {
  // ✅ All answers found → move to next question
  if (foundAnswers.length === currentQuestion.answers.length) {
    showModal("Round Complete", players[currentPlayerIndex] + " found the last answer!");

    setTimeout(() => {
      nextQuestion();
    }, 800); // short delay so player sees message
  }

  // ✅ All players eliminated → also go to next question
  if (activePlayers.length === 0) {
    showModal("Round Over", "No players left!");

    setTimeout(() => {
      nextQuestion();
    }, 800);
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
    // ✅ Local test questions
    questions = [
      {
        question: "List the 3 primary colours",
        answers: ["Red", "Blue", "Yellow"]
      },
      {
        question: "List the 4 Beatles",
        answers: ["John", "Paul", "George", "Ringo"]
      }
    ];

    showModal(
      "DEV MODE",
      "Using local test data (" + questions.length + " questions)"
    );

  } else {
    // ✅ Load from JSON (GitHub / production)
    loadQuestions();
  }

  renderPlayersSetup();
};



