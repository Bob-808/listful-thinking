// ---------------------------------------------------------------------
// LOAD QUESTIONS
// ---------------------------------------------------------------------

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
let revealedAnswers = [];
let shuffledQuestions = [];
let currentQuestionIndex = 0;

// Multiplayer
let players = [];
let currentPlayerIndex = 0;

// Challenge
let challengeRound = 1;
let challengeCorrect = 0;
let challengeMisses = 0;

// ---------------------------------------------------------------------
// DOM REFERENCES
// ---------------------------------------------------------------------

const modeSelectScreen = document.getElementById("mode-select-screen");
const instructionsScreen = document.getElementById("instructions-screen");
const gameScreen = document.getElementById("game-screen");

const btnModeMultiplayer = document.getElementById("btn-mode-multiplayer");
const btnModeChallenge = document.getElementById("btn-mode-challenge");
const btnInstructions = document.getElementById("btn-instructions");
const btnBackFromInstructions = document.getElementById("btn-back-from-instructions");
const btnBackToModes = document.getElementById("btn-back-to-modes");

const modeLabel = document.getElementById("mode-label");
const questionCounter = document.getElementById("question-counter");

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

const btnWrongAnswer = document.getElementById("wrong-answer-btn");
const btnNextQuestion = document.getElementById("next-question-btn");

// Modal
const modalOverlay = document.getElementById("modal-overlay");
const modalMessage = document.getElementById("modal-message");
const modalInput = document.getElementById("modal-input");
const modalConfirm = document.getElementById("modal-confirm");
const modalCancel = document.getElementById("modal-cancel");
// ---------------------------------------------------------------------
// VERSION
// ---------------------------------------------------------------------
const APP_VERSION = "1.6.1";


let modalCallback = null;

// ---------------------------------------------------------------------
// SCREEN MANAGEMENT
// ---------------------------------------------------------------------

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active-screen"));
    document.getElementById(id).classList.add("active-screen");
}

// ---------------------------------------------------------------------
// MODAL SYSTEM
// ---------------------------------------------------------------------

function showMessageModal(message) {
    modalMessage.textContent = message;
    modalInput.classList.add("hidden");
    modalCancel.classList.add("hidden");
    modalOverlay.classList.remove("hidden");
    modalCallback = null;
}

function showInputModal(message, defaultValue, callback) {
    modalMessage.textContent = message;
    modalInput.classList.remove("hidden");
    modalInput.value = defaultValue || "";
    modalCancel.classList.remove("hidden");
    modalOverlay.classList.remove("hidden");
    modalCallback = callback;
}

modalConfirm.addEventListener("click", () => {
    if (modalCallback) modalCallback(modalInput.value);
    closeModal();
});

modalCancel.addEventListener("click", closeModal);

function closeModal() {
    modalOverlay.classList.add("hidden");
    modalInput.classList.add("hidden");
    modalCancel.classList.add("hidden");
    modalCallback = null;
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
    fetch("instructions.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("instructions-content").innerHTML = html;
            showScreen("instructions-screen");
        });
});
btnBackFromInstructions.addEventListener("click", () => showScreen("mode-select-screen"));

btnBackToModes.addEventListener("click", () => {
    resetGameState();
    showScreen("mode-select-screen");
});

// ---------------------------------------------------------------------
// MULTIPLAYER MODE
// ---------------------------------------------------------------------

function startMultiplayerMode() {
    modeLabel.textContent = "Classic Multiplayer";
    multiplayerPanel.style.display = "block";
    challengePanel.style.display = "none";

    players = [
        { name: "Player 1", score: 0, eliminated: false },
        { name: "Player 2", score: 0, eliminated: false }
    ];
    currentPlayerIndex = 0;

    shuffledQuestions = shuffleArray(questions);
    currentQuestionIndex = 0;

    renderPlayers();
    loadNextShuffledQuestion();
    showScreen("game-screen");
}

btnAddPlayer.addEventListener("click", () => {
    players.push({
        name: "Player " + (players.length + 1),
        score: 0,
        eliminated: false
    });
    renderPlayers();
});

function renderPlayers() {
    playersContainer.innerHTML = "";

    players.forEach((p, index) => {
        const div = document.createElement("div");
        div.classList.add("player-pill");

        if (index === currentPlayerIndex) div.classList.add("active");
        if (p.eliminated) div.classList.add("eliminated");

        div.textContent = `${p.name} — ${p.score}`;

        // Pencil icon
        const edit = document.createElement("span");
        edit.classList.add("edit-icon");
        edit.textContent = "✎";
        div.appendChild(edit);

        edit.addEventListener("click", (e) => {
            e.stopPropagation();
            showInputModal("Rename player:", p.name, (newName) => {
                if (newName.trim() !== "") {
                    p.name = newName.trim();
                    renderPlayers();
                }
            });
        });

        playersContainer.appendChild(div);
    });
}

function advanceToNextPlayer() {
    if (players.filter(p => !p.eliminated).length <= 1) {
        const winner = players.find(p => !p.eliminated);
        showMessageModal("Winner: " + (winner ? winner.name : "No one"));
        return;
    }

    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    } while (players[currentPlayerIndex].eliminated);

    renderPlayers();
}

// ---------------------------------------------------------------------
// CHALLENGE MODE
// ---------------------------------------------------------------------

function startChallengeMode() {
    modeLabel.textContent = "Moderator Challenge";
    multiplayerPanel.style.display = "none";
    challengePanel.style.display = "block";

    challengeRound = 1;
    challengeCorrect = 0;
    challengeMisses = 0;

    shuffledQuestions = shuffleArray(questions);
    currentQuestionIndex = 0;

    updateChallengePanel();
    loadNextShuffledQuestion();
    showScreen("game-screen");
}

function updateChallengePanel() {
    challengeRoundSpan.textContent = challengeRound;
    challengeCorrectSpan.textContent = challengeCorrect;
    challengeMissesSpan.textContent = challengeMisses;
}

function endChallengeRound(reason) {
    showMessageModal(
        `Round ${challengeRound} ended.\nCorrect: ${challengeCorrect}\nMisses: ${challengeMisses}\nReason: ${reason}`
    );

    challengeRound++;
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
    revealedAnswers = [];
    players = [];
    currentPlayerIndex = 0;
    answersContainer.innerHTML = "";
    questionText.textContent = "";
    categoryText.textContent = "";
}

function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function loadNextShuffledQuestion() {
    if (currentQuestionIndex >= shuffledQuestions.length) {
        shuffledQuestions = shuffleArray(questions);
        currentQuestionIndex = 0;
    }

    revealedAnswers = [];

    currentQuestion = shuffledQuestions[currentQuestionIndex++];
    remainingAnswers = currentQuestion.answers.slice();

    questionCounter.textContent =
        `Question ${currentQuestionIndex} of ${shuffledQuestions.length}`;

    renderQuestion();
    renderAnswers();
}

function renderQuestion() {
    questionText.textContent = currentQuestion.question;
    categoryText.textContent = currentQuestion.category || "";
}

function renderAnswers() {
    answersContainer.innerHTML = "";

    currentQuestion.answers.forEach(answer => {
        const btn = document.createElement("button");
        btn.classList.add("answer-button");
        btn.textContent = answer;

        btn.addEventListener("click", () => handleAnswerClick(answer, btn));

        answersContainer.appendChild(btn);
    });

    // NEW: normalize bubble sizes
    requestAnimationFrame(normalizeAnswerBubbleSizes);
}

function normalizeAnswerBubbleSizes() {
    const buttons = Array.from(document.querySelectorAll(".answer-button"));
    if (buttons.length === 0) return;

    // Reset sizes first
    buttons.forEach(btn => {
        btn.style.width = "";
        btn.style.height = "";
    });

    // Measure largest width + height
    let maxWidth = 0;
    let maxHeight = 0;

    buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.width > maxWidth) maxWidth = rect.width;
        if (rect.height > maxHeight) maxHeight = rect.height;
    });

    // Apply uniform size
    buttons.forEach(btn => {
        btn.style.width = `${maxWidth}px`;
        btn.style.height = `${maxHeight}px`;
    });
}

function handleAnswerClick(answer, buttonElement) {
    const isRevealed = revealedAnswers.includes(answer);

    if (!isRevealed) {
        revealedAnswers.push(answer);
        buttonElement.classList.add("revealed");

        const idx = remainingAnswers.indexOf(answer);
        if (idx !== -1) remainingAnswers.splice(idx, 1);

        if (gameMode === "challenge") {
            challengeCorrect++;
            updateChallengePanel();
            if (remainingAnswers.length === 0) {
                endChallengeRound("All answers found");
            }
        }

        if (gameMode === "multiplayer") {
            buttonElement.dataset.playerIndex = currentPlayerIndex;
            players[currentPlayerIndex].score++;
            renderPlayers();
            advanceToNextPlayer();

            if (remainingAnswers.length === 0) {
                showMessageModal("All answers found!");
            }
        }

    } else {
        revealedAnswers = revealedAnswers.filter(a => a !== answer);
        buttonElement.classList.remove("revealed");
        remainingAnswers.push(answer);

        if (gameMode === "challenge") {
            challengeCorrect--;
            updateChallengePanel();
        }

        if (gameMode === "multiplayer") {
            const idx = Number(buttonElement.dataset.playerIndex);
            if (!isNaN(idx)) {
                players[idx].score--;
                renderPlayers();
            }
        }
    }
}

// ---------------------------------------------------------------------
// CONTROL BUTTONS
// ---------------------------------------------------------------------

btnWrongAnswer.addEventListener("click", () => {
    if (!currentQuestion) return;

    if (gameMode === "multiplayer") {
        players[currentPlayerIndex].eliminated = true;
        renderPlayers();
        advanceToNextPlayer();
    }

    if (gameMode === "challenge") {
        challengeMisses++;
        updateChallengePanel();
        endChallengeRound("Wrong answer");
    }
});

btnNextQuestion.addEventListener("click", () => {
    loadNextShuffledQuestion();
});

// ---------------------------------------------------------------------
// INITIALIZE
// ---------------------------------------------------------------------

loadQuestions().then(() => {
    showScreen("mode-select-screen");
});
	document.getElementById("version-label").textContent = `v${APP_VERSION}`;
