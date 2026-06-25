export function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// XSS Prevention: Creates text node safely
export function sanitizeText(text) {
    const el = document.createElement('div');
    el.textContent = text;
    return el.innerHTML;
}

export function registerSW() {
    if (window.location.protocol === 'file:') return;

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW registered'))
                .catch(err => console.log('SW failed', err));
        });
    }
}
