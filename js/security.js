/**
 * PIAGAMFAST - HIGH SECURITY MODULE
 * Memuat pertahanan frontend (Anti-Snoop, Anti-DevTools) dan Idle Auto-Logout
 */

(function() {
    // ----------------------------------------------------
    // 1. ANTI-SNOOP & ANTI-DEVTOOLS
    // ----------------------------------------------------
    
    // Matikan Klik Kanan
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Matikan pintasan keyboard berbahaya
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
        }
        
        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
            e.preventDefault();
        }
        
        // Ctrl+U (View Source)
        if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
            e.preventDefault();
        }
        
        // Memblokir Ctrl+P (Kecuali di halaman batch.html / queue.html jika diperlukan)
        const isPrintPage = window.location.pathname.includes('batch.html') || window.location.pathname.includes('queue.html');
        if (e.ctrlKey && (e.key === 'P' || e.key === 'p') && !isPrintPage) {
            e.preventDefault();
            alert("Mencetak halaman ini dinonaktifkan demi keamanan.");
        }
    });

    // Deteksi sederhana jika DevTools terbuka
    let devtools = function() {};
    devtools.toString = function() {
        if (!window.location.pathname.includes('login.html')) {
            alert('Keamanan: Akses alat pengembang terdeteksi! Demi keamanan, kami akan mengeluarkan Anda.');
            if (window.fbLogout) window.fbLogout();
            window.location.href = 'login.html';
        }
        return 'devtools';
    }
    console.log('%c', devtools);

    // ----------------------------------------------------
    // 2. AUTO-LOGOUT (IDLE TIMEOUT)
    // ----------------------------------------------------
    let idleTimer;
    const IDLE_TIME_MS = 15 * 60 * 1000; // 15 Menit

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        // Jika belum login (di halaman login), tidak perlu auto-logout
        if (window.location.pathname.includes('login.html')) return;
        
        idleTimer = setTimeout(() => {
            if (window.fbLogout) {
                window.fbLogout().then(() => {
                    alert("Demi keamanan, sesi Anda telah habis karena tidak ada aktivitas selama 15 menit. Silakan masuk kembali.");
                });
            }
        }, IDLE_TIME_MS);
    }

    // Pasang sensor aktivitas
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => {
        document.addEventListener(evt, resetIdleTimer, true);
    });

    // Inisialisasi timer pertama
    resetIdleTimer();

})();
