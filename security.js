import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let inactivityTimer;
const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 Menit

/**
 * Memulai timer sesi. Jika tidak ada aktivitas, user akan di-logout otomatis.
 * @param {object} auth - Objek Firebase Auth
 */
export function startSessionTimer(auth) {
    const logout = () => {
        alert("Sesi Anda telah berakhir karena tidak aktif selama 15 menit. \nSistem akan logout otomatis demi keamanan data.");
        signOut(auth).catch((error) => console.error("Auto-logout error:", error));
    };

    const resetTimer = () => {
        clearTimeout(inactivityTimer);
        // Hanya set timer jika user benar-benar sedang login
        if (auth.currentUser) {
            inactivityTimer = setTimeout(logout, TIMEOUT_DURATION);
        }
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    
    resetTimer(); // Mulai timer segera
}

/**
 * Menghentikan timer sesi (dipanggil saat logout manual).
 */
export function stopSessionTimer() {
    clearTimeout(inactivityTimer);
}