// ✅ Конфиг Neynar
const CLIENT_ID = "e7fda24b-27de-4b5a-a5d1-c4d6f5efb32d";
const API_KEY = "89B0E323-2843-4849-BF88-BB67B3F18DB8";
const REDIRECT_URI = "https://twincaster.vercel.app/auth";

// 🧠 Глобальные переменные
let currentUserIndex = 0;
let users = [];
let currentUser = null;
let mediaRecorder;

// 📦 Сохраняем и загружаем лайки
const getLikes = () => JSON.parse(localStorage.getItem("likes") || "[]");
const saveLike = (user) => {
    const likes = getLikes();
    if (!likes.find(u => u.id === user.id)) {
        likes.push(user);
        localStorage.setItem("likes", JSON.stringify(likes));
    }
};

// ✅ Авторизация через Neynar
function checkAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code && !localStorage.getItem("farcaster_token")) {
        fetch("https://api.neynar.com/v2/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                code,
                redirect_uri: REDIRECT_URI
            })
        })
            .then(res => res.json())
            .then(data => {
                localStorage.setItem("farcaster_token", data.access_token);
                location.href = REDIRECT_URI; // убираем ?code
            });
    } else if (localStorage.getItem("farcaster_token")) {
        hideAuth();
        fetchCurrentUser();
    }
}

// 🧑 Получаем текущего пользователя
async function fetchCurrentUser() {
    const token = localStorage.getItem("farcaster_token");

    try {
        const res = await fetch("https://api.neynar.com/v2/farcaster/user", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Api-Key": API_KEY
            }
        });

        const json = await res.json();
        currentUser = json.result.user;
        fetchRecommendedUsers();
    } catch (err) {
        console.error("Ошибка при получении текущего пользователя:", err);
    }
}

// 🌎 Получаем других кастеров
async function fetchRecommendedUsers() {
    showLoader();

    try {
        const res = await fetch("https://api.neynar.com/v2/farcaster/feed/global", {
            headers: {
                "Accept": "application/json",
                "Api-Key": API_KEY
            }
        });

        const json = await res.json();
        users = json.casts
            .map(cast => {
                const author = cast.author;
                return {
                    id: author.fid,
                    username: author.username,
                    avatar_url: author.pfp.url,
                    bio: author.profile.bio.text || "",
                    last_cast: cast.text
                };
            })
            .filter(u => u.id !== currentUser.fid); // не показываем себя

        if (users.length > 0) {
            loadUserProfile();
        }
    } catch (e) {
        console.error("Ошибка загрузки профилей:", e);
        showOfflineMessage();
    } finally {
        hideLoader();
    }
}

// 🎴 Показываем профиль
function loadUserProfile() {
    const user = users[currentUserIndex];
    if (!user) return;

    document.getElementById("user-avatar").src = user.avatar_url;
    document.getElementById("username").textContent = "@" + user.username;
    document.getElementById("user-bio").textContent = user.bio || "No bio";
    document.getElementById("last-cast").textContent = `Last cast: "${user.last_cast}"`;

    // Показываем “Match %” как случайное число для MVP
    const matchScore = Math.floor(Math.random() * 60) + 40;
    document.getElementById("match-score").textContent = `Match: ${matchScore}%`;

    document.getElementById("app").classList.remove("hidden");
}

// ➡️ Следующий профиль
function showNextProfile() {
    currentUserIndex++;
    if (currentUserIndex >= users.length) {
        alert("Вы просмотрели всех пользователей 💜");
        return;
    }
    loadUserProfile();
}

// 💘 Лайк
function likeUser() {
    const likedUser = users[currentUserIndex];
    saveLike(likedUser);

    // Простая симуляция match
    const match = Math.random() < 0.2;
    if (match) {
        alert(`🔥 It's a match with @${likedUser.username}!`);
    }

    showNextProfile();
}

// ❌ Пропуск
function skipUser() {
    showNextProfile();
}

// 🎥 Видео-рекординг
document.getElementById("record-btn").addEventListener("click", async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 320 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
            audio: true
        });

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/webm;codecs=vp9,opus",
            bitsPerSecond: 2500000
        });

        const chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.start();

        setTimeout(() => {
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());

            const videoBlob = new Blob(chunks, { type: "video/webm" });
            const videoUrl = URL.createObjectURL(videoBlob);

            const videoElement = document.getElementById("user-video");
            videoElement.src = videoUrl;
            videoElement.classList.remove("hidden");
        }, 5000);
    } catch (error) {
        console.error("Video error:", error);
        alert("Please allow camera and microphone access");
    }
});

// 🧩 Утилиты
function hideAuth() {
    document.getElementById("auth-section").classList.add("hidden");
}

function showLoader() {
    document.getElementById("loader").classList.remove("hidden");
}

function hideLoader() {
    document.getElementById("loader").classList.add("hidden");
}

function showOfflineMessage() {
    const msg = document.createElement("div");
    msg.className = "offline-message";
    msg.textContent = "Offline mode: showing cached profiles";
    document.body.prepend(msg);
}

// 🧠 События
function setupEventListeners() {
    document.getElementById("connect-btn").addEventListener("click", () => {
        const authUrl = `https://api.neynar.com/v2/oauth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
        window.location.href = authUrl;
    });

    document.getElementById("like-btn").addEventListener("click", likeUser);
    document.getElementById("skip-btn").addEventListener("click", skipUser);
}

// 🟣 Запуск
document.addEventListener("DOMContentLoaded", () => {
    initServiceWorker();
    checkAuth();
    setupEventListeners();
});

// 🔧 Service Worker
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log("SW registered"))
            .catch(err => console.error("SW error:", err));
    }
}
