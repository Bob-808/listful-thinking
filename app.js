// Listful Thinking - base with two modes:
// 1) Classic Multiplayer (rotating players, elimination)
// 2) Moderator Challenge (1 moderator, 1 player, beat the score)
//
// IMPORTANT: Only the moderator ever sees the screen.
// Players answer verbally; moderator taps answers and wrong answers.

// ---------------------------------------------------------------------
// DATA PLACEHOLDER
// ---------------------------------------------------------------------
// Replace this with your existing 525-question data structure.
// Expected shape per question:
//
// {
//   id: 1,
//   category: "Geography",
//   question: "Name the provinces of Canada",
//   answers: ["Ontario", "Quebec", ...]
// }
//
// For now, a tiny sample so the file runs.

const testquestions = [
    {
        id: 1,
        category: "Sample",
        question: "Name the planets in the Solar System",
        answers: [
            "Mercury",
            "Venus",
            "Earth",
            "Mars",
            "Jupiter",
            "Saturn",
            "Uranus",
            "Neptune"
        ]
    },
    {
        id: 2,
        category: "Sample",
        question: "Name the days of the week",
        answers: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
        ]
    }
];

let questions = [];

async function loadQuestions() {
    const response = await fetch("questions.json");
    questions = await response.json();
}

// ---------------------------------------------------------------------
// GLOBAL STATE
// ---------------------------------------------------------------------

let gameMode = null; // "multiplayer" or "challenge"

let currentQuestion = null;
let remainingAnswers = [];
let usedQuestionIds = new Set();

// Multiplayer state
let players = [];
let currentPlayerIndex = 0;

// Challenge state
let challengeRound = 1;
let challengeCorrect = 0;
let challengeMisses = 0;

// DOM references
const modeSelectScreen = document.getElementById("mode-select-screen");
const instructionsScreen = document.getElementById("instructions-screen");
const gameScreen = document.getElementById("game-screen");

const btnModeMultiplayer = document.getElementById("btn-mode-multiplayer");
const btnModeChallenge = document.getElementById("btn-mode-challenge");
const btnInstructions = document.getElementById("btn-instructions");
const btnBackFromInstructions = document.getElementById("btn-back-from-instructions");
const btnBackToModes = document.getElementById("btn-back-to-modes");

const modeLabel = document.getElementById("mode-label");

const multiplayerPanel = document.getElementById("multiplayer-panel");
const challengePanel = document.getElementById("challenge-panel");

const playersContainer = document.getElementById("players-container");
const btnAddPlayer = document.getElementById("btn-add-player");

const challengeRoundSpan = document.getElementById("challenge-round");
const challengeCorrectSpan = document.getElementById("challenge-correct");
const challengeMissesSpan = document.getElementById("challenge-misses");

const questionText = document.getElementById("question-text");
const categoryText = document.getElementById("category-text");
const answersContainer = document.getElementById("answers-container");

const btnWrongAnswer = document.getElementById("btn-wrong-answer");
const btnNextQuestion = document.getElementById("btn-next-question");

const modalOverlay = document.getElementById("modal-overlay");
const modalMessage = document.getElementById("modal-message");
const btnModalClose = document.getElementById("btn-modal-close");

// ---------------------------------------------------------------------
// SCREEN MANAGEMENT
// ---------------------------------------------------------------------

function showScreen(screenId) {
    const screens = document.querySelectorAll(".screen");
    screens.forEach(s => s.classList.remove("active-screen"));

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add("active-screen");
    }
}

// ---------------------------------------------------------------------
// MODE SELECTION
// ---------------------------------------------------------------------

btnModeMultiplayer.addEventListener("click", () => {
    gameMode = "multiplayer";
    startMultiplayerMode();
});

btnModeChallenge.addEventListener("click", () => {
    gameMode = "challenge";
    startChallengeMode();
});

btnInstructions.addEventListener("click", () => {
    showScreen("instructions-screen");
});

btnBackFromInstructions.addEventListener("click", () => {
    showScreen("mode-select-screen");
});

btnBackToModes.addEventListener("click", () => {
    resetGameState();
    showScreen("mode-select-screen");
});

// ---------------------------------------------------------------------
// MODAL
// ---------------------------------------------------------------------

function showModal(message) {
    modalMessage.textContent = message;
    modalOverlay.classList.remove("hidden");
}

function hideModal() {
    modalOverlay.classList.add("hidden");
}

btnModalClose.addEventListener("click", hideModal);

// ---------------------------------------------------------------------
// MULTIPLAYER MODE
// ---------------------------------------------------------------------

function startMultiplayerMode() {
    modeLabel.textContent = "Classic Multiplayer (Moderator Only Screen)";
    multiplayerPanel.style.display = "block";
    challengePanel.style.display = "none";

    players = [];
    currentPlayerIndex = 0;
    usedQuestionIds.clear();

    // For now, add two default players; you can replace with your own UI.
    players.push({ name: "Player 1", eliminated: false });
    players.push({ name: "Player 2", eliminated: false });

    renderPlayers();
    loadRandomQuestion();
    showScreen("game-screen");
}

btnAddPlayer.addEventListener("click", () => {
    const newIndex = players.length + 1;
    players.push({ name: "Player " + newIndex, eliminated: false });
    renderPlayers();
});

function renderPlayers() {
    playersContainer.innerHTML = "";
    players.forEach((p, index) => {
        const div = document.createElement("div");
        div.classList.add("player-pill");
        if (index === currentPlayerIndex) {
            div.classList.add("active");
        }
        if (p.eliminated) {
            div.classList.add("eliminated");
        }
        div.textContent = p.name;
        playersContainer.appendChild(div);
    });
}

function getActivePlayersCount() {
    return players.filter(p => !p.eliminated).length;
}

function advanceToNextPlayer() {
    // Prevent winner check before players exist
    if (players.length === 0) return;

    if (getActivePlayersCount() <= 1) {
        const winner = players.find(p => !p.eliminated);
        if (winner) {
            showModal("Winner: " + winner.name);
        } else {
            showModal("No winner. All players eliminated.");
        }
        return;
    }

    let attempts = 0;
    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        attempts++;
    } while (players[currentPlayerIndex].eliminated && attempts <= players.length);

    renderPlayers();
}


// ---------------------------------------------------------------------
// CHALLENGE MODE
// ---------------------------------------------------------------------

function startChallengeMode() {
    modeLabel.textContent = "Moderator Challenge (1 Moderator, 1 Player)";
    multiplayerPanel.style.display = "none";
    challengePanel.style.display = "block";

    challengeRound = 1;
    challengeCorrect = 0;
    challengeMisses = 0;
    usedQuestionIds.clear();

    updateChallengePanel();
    loadRandomQuestion();
    showScreen("game-screen");
}

function updateChallengePanel() {
    challengeRoundSpan.textContent = String(challengeRound);
    challengeCorrectSpan.textContent = String(challengeCorrect);
    challengeMissesSpan.textContent = String(challengeMisses);
}

function endChallengeRound(reason) {
    let message = "Round " + challengeRound + " ended.\n";
    message += "Correct answers: " + challengeCorrect + "\n";
    message += "Misses: " + challengeMisses + "\n";
    message += "Reason: " + reason + "\n\n";
    message += "Moderator and player can now swap roles and start the next round.";

    showModal(message);

    // Prepare for next round
    challengeRound += 1;
    challengeCorrect = 0;
    challengeMisses = 0;
    updateChallengePanel();
}

// ---------------------------------------------------------------------
// COMMON GAME LOGIC
// ---------------------------------------------------------------------

function resetGameState() {
    gameMode = null;
    currentQuestion = null;
    remainingAnswers = [];
    usedQuestionIds.clear();

    players = [];
    currentPlayerIndex = 0;

    challengeRound = 1;
    challengeCorrect = 0;
    challengeMisses = 0;

    answersContainer.innerHTML = "";
    questionText.textContent = "";
    categoryText.textContent = "";
}

function loadRandomQuestion() {
    if (questions.length === 0) {
        questionText.textContent = "No questions available.";
        categoryText.textContent = "";
        answersContainer.innerHTML = "";
        return;
    }

    // Simple random selection avoiding repeats until all used
    if (usedQuestionIds.size === questions.length) {
        usedQuestionIds.clear();
    }

    let q = null;
    let safety = 0;
    while (!q && safety < 1000) {
        const index = Math.floor(Math.random() * questions.length);
        const candidate = questions[index];
        if (!usedQuestionIds.has(candidate.id)) {
            q = candidate;
        }
        safety++;
    }

    if (!q) {
        q = questions[0];
    }

    usedQuestionIds.add(q.id);
    currentQuestion = q;
    remainingAnswers = q.answers.slice();

    renderQuestion();
    renderAnswers();
}

function renderQuestion() {
    if (!currentQuestion) return;
    questionText.textContent = currentQuestion.question;
    categoryText.textContent = currentQuestion.category ? currentQuestion.category : "";
}

function renderAnswers() {
    answersContainer.innerHTML = "";
    if (!currentQuestion) return;

    currentQuestion.answers.forEach(answer => {
        const btn = document.createElement("button");
        btn.classList.add("answer-button");
        btn.textContent = answer;
        btn.dataset.answer = answer;
        btn.addEventListener("click", () => handleAnswerClick(answer, btn));
        answersContainer.appendChild(btn);
    });
}

function handleAnswerClick(answer, buttonElement) {
    // Moderator taps when player gives a correct answer.
    // We reveal the answer and remove it from remainingAnswers.

    const index = remainingAnswers.indexOf(answer);
    if (index !== -1) {
        remainingAnswers.splice(index, 1);
        buttonElement.classList.add("revealed");

        if (gameMode === "challenge") {
            challengeCorrect += 1;
            updateChallengePanel();

            if (remainingAnswers.length === 0) {
                endChallengeRound("All answers found");
            }
        } else if (gameMode === "multiplayer") {
            // In multiplayer, you might choose to end the turn after one correct,
            // or let the player continue. For now, we let the moderator decide
            // when to move on using Wrong Answer or Next Question.
            if (remainingAnswers.length === 0) {
                showModal("All answers found for this question.");
            }
        }
    }
}

// Wrong answer button
btnWrongAnswer.addEventListener("click", () => {
    if (!currentQuestion) return;

    if (gameMode === "multiplayer") {
        // Eliminate current player and move to next
        if (players.length === 0) return;
        players[currentPlayerIndex].eliminated = true;
        renderPlayers();
        advanceToNextPlayer();
    } else if (gameMode === "challenge") {
        challengeMisses += 1;
        updateChallengePanel();
        endChallengeRound("Wrong answer");
    }
});

// Next question button
btnNextQuestion.addEventListener("click", () => {
    loadRandomQuestion();
});

// ---------------------------------------------------------------------
// INITIAL STATE
// ---------------------------------------------------------------------

//showScreen("mode-select-screen");
loadQuestions().then(() => {
    showScreen("mode-select-screen");
});

