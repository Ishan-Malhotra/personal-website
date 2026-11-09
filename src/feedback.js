/**
 * "Send me a text" form (replaced the old mailto chooser).
 * Opens in place, with no fade, when you walk into the east edge of the town.
 * Styled as a paper dialogue box, like the rest of the site. Posts to Formspree.
 *
 * Uses Formspree's AJAX API directly (fetch + Accept: application/json), so no
 * @formspree/ajax dependency. To switch forms, change the endpoint below.
 */
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgaajagq';

const isConfigured = () => !/YOUR_FORM_ID/.test(FORMSPREE_ENDPOINT);

/** Is a feedback form currently open? */
export function isFeedbackOpen() {
    return Boolean(document.getElementById('feedback-prompt'));
}

/**
 * Show the form. `onClose` runs once when it is dismissed (×, Esc, backdrop,
 * or the close button after sending).
 */
export function openFeedback({ onClose } = {}) {
    if (isFeedbackOpen()) return;
    const previousFocus = document.activeElement;

    const overlay = document.createElement('div');
    overlay.id = 'feedback-prompt';
    overlay.innerHTML = `
        <div class="feedback-card" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
            <button type="button" class="feedback-x" aria-label="Close">✕</button>
            <form class="feedback-form" novalidate>
                <h2 id="feedback-title">send me a text</h2>
                <label class="feedback-visually-hidden" for="feedback-email">Your email</label>
                <input id="feedback-email" name="email" type="email" placeholder="Your email"
                    autocomplete="email" inputmode="email" maxlength="200">
                <label class="feedback-visually-hidden" for="feedback-message">Message</label>
                <textarea id="feedback-message" name="message" rows="5" maxlength="5000"
                    placeholder="enter your message here"></textarea>
                <input type="text" name="_gotcha" class="feedback-visually-hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
                <input type="hidden" name="_subject" value="New text from ishan's space">
                <p class="feedback-status" role="status" aria-live="polite"></p>
                <button type="submit" class="feedback-send">SEND</button>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    const card = overlay.querySelector('.feedback-card');
    const form = overlay.querySelector('.feedback-form');
    const emailEl = overlay.querySelector('#feedback-email');
    const messageEl = overlay.querySelector('#feedback-message');
    const statusEl = overlay.querySelector('.feedback-status');
    const sendBtn = overlay.querySelector('.feedback-send');
    let closed = false;

    const setStatus = (text, kind = '') => {
        statusEl.textContent = text;
        statusEl.className = `feedback-status${kind ? ` is-${kind}` : ''}`;
    };

    function close() {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        if (previousFocus && previousFocus.focus) previousFocus.focus();
        if (onClose) onClose();
    }

    function onKey(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
            return;
        }
        if (e.key === 'Tab') {
            const focusables = [...card.querySelectorAll('button, input:not([type="hidden"]):not([tabindex="-1"]), textarea')]
                .filter((el) => !el.disabled && el.offsetParent !== null);
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }

    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.feedback-x').addEventListener('click', close);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = messageEl.value.trim();
        const email = emailEl.value.trim();

        if (!message) {
            setStatus('Write something first.', 'error');
            messageEl.focus();
            return;
        }
        if (email && !emailEl.checkValidity()) {
            setStatus("That email doesn't look right.", 'error');
            emailEl.focus();
            return;
        }
        if (!isConfigured()) {
            setStatus("The form isn't connected yet.", 'error');
            return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = 'SENDING…';
        setStatus('');

        try {
            const res = await fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' }
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const detail = Array.isArray(data.errors) ? data.errors.map((x) => x.message).join(' ') : '';
                throw new Error(detail || `HTTP ${res.status}`);
            }
            form.innerHTML = `
                <h2 id="feedback-title">sent!</h2>
                <p class="feedback-hint">Got it. I read every one of these.</p>
                <button type="button" class="feedback-send">CLOSE</button>`;
            const doneBtn = form.querySelector('.feedback-send');
            doneBtn.addEventListener('click', close);
            doneBtn.focus();
        } catch (err) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'SEND';
            setStatus(`Couldn't send that. ${err.message ? `(${err.message}) ` : ''}Try again?`, 'error');
        }
    });

    // Focus the first empty field.
    requestAnimationFrame(() => emailEl.focus());
}
