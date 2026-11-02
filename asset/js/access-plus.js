(() => {
    const STORAGE_KEY = 'AccessibilityPlusSettings';
    // Saved by versions before the rename (aaAccessibilityPlus); read once and moved
    const OLD_STORAGE_KEY = 'aaAccessibilityPlusSettings';
    const CLASS_RE = /\bap-(text|contrast|links|font|spacing|motion|cursor)-[^\s]+/g;
    const CONTRAST_MODES = ['none', 'high', 'invert', 'grayscale'];
    const FONT_MODES = ['default', 'readable', 'dyslexic'];
    const DEFAULTS = {
        textScale: 100, contrast: 'none', links: false, font: 'default',
        spacing: false, motion: false, cursor: false, visited: false, pulseViews: 0, userPosition: null
    };

    const config = window.AccessibilityPlusConfig || {
        enableText: true, enableContrast: true, enableLinks: true, enableDyslexia: true,
        enableSpacing: true, enableMotion: true, enableCursor: true, fabPosition: 'bottom-right'
    };

    // Translated text from the module (config.strings). %1$s is filled in by f().
    const strings = config.strings || {};
    const T = (key) => strings[key] || '';
    const E = (key) => T(key).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const f = (key, value) => T(key).replace('%1$s', value);
    const CONTRAST_LABELS = { none: T('off'), high: T('contrastHigh'), invert: T('contrastInvert'), grayscale: T('contrastGray') };
    const FONT_LABELS = { default: T('fontDefault'), readable: T('fontReadable'), dyslexic: T('fontDyslexic') };

    let state = Object.assign({}, DEFAULTS);
    try {
        let saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) {
            saved = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
            if (saved) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
                localStorage.removeItem(OLD_STORAGE_KEY);
            }
        }
        if (saved && typeof saved === 'object') {
            // Settings saved before v1.1.04 used a dyslexia on/off flag
            if (saved.font === undefined && saved.dyslexia) saved.font = 'dyslexic';
            delete saved.dyslexia;
            Object.assign(state, saved);
        }
    } catch (e) { /* storage blocked: use defaults */ }
    if (!CONTRAST_MODES.includes(state.contrast)) state.contrast = 'none';
    if (!FONT_MODES.includes(state.font)) state.font = 'default';

    const saveState = () => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
    };

    // Page classes for the current settings; features the site has disabled are ignored
    const pageClasses = () => {
        const classes = [];
        if (config.enableText && state.textScale > 100) classes.push(`ap-text-${state.textScale}`);
        if (config.enableContrast && state.contrast !== 'none') classes.push(`ap-contrast-${state.contrast}`);
        if (config.enableLinks && state.links) classes.push('ap-links-highlight');
        if (config.enableDyslexia && state.font !== 'default') classes.push(`ap-font-${state.font}`);
        if (config.enableSpacing && state.spacing) classes.push('ap-spacing-on');
        if (config.enableMotion && state.motion) classes.push('ap-motion-stop');
        if (config.enableCursor && state.cursor) classes.push('ap-cursor-big');
        return classes;
    };

    const root = document.documentElement;
    const applyPageClasses = () => {
        root.className = root.className.replace(CLASS_RE, '').trim();
        root.classList.add(...pageClasses());
    };

    // This script loads in <head>, so apply saved settings now to avoid a flash at default settings
    applyPageClasses();

    document.addEventListener('DOMContentLoaded', () => {
        const activePos = state.userPosition || config.fabPosition;

        // Pulse the button on the first 3 page views only, until the panel has been opened
        let pulse = !state.visited && state.pulseViews < 3;
        if (pulse) {
            state.pulseViews++;
            saveState();
        }

        // 1. Create hidden ARIA live region for screen readers
        let liveRegion = document.getElementById('ap-live-announcer');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'ap-live-announcer';
            liveRegion.className = 'ap-sr-only';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(liveRegion);
        }

        const announce = (message) => {
            liveRegion.textContent = '';
            setTimeout(() => {
                liveRegion.textContent = message;
            }, 100);
        };

        const dots = (count) => `<span class="ap-btn-state" aria-hidden="true"></span><span class="ap-dots" aria-hidden="true">${'<i></i>'.repeat(count)}</span>`;

        const html = `
            <button id="ap-access-fab" class="pos-${activePos} ${pulse ? 'ap-heartbeat' : ''}" aria-label="${E('fabLabel')}" aria-expanded="false">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg>
            </button>

            <div id="ap-access-panel" class="pos-${activePos}" role="dialog" aria-modal="true" aria-label="${E('panelLabel')}">
                <div class="ap-panel-header">
                    <h2>${E('title')}</h2>
                    <div class="ap-header-actions">
                        <button class="ap-pos-btn ap-tooltip-target" data-pos="bottom-left" aria-label="${E('moveLeft')}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 4h7v16H4z" fill="currentColor"/></svg>
                        </button>
                        <button class="ap-pos-btn ap-tooltip-target" data-pos="bottom-right" aria-label="${E('moveRight')}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 4h7v16h-7z" fill="currentColor"/></svg>
                        </button>
                        <button class="ap-close-btn" title="${E('closePanel')}" aria-label="${E('closePanel')}">&times;</button>
                    </div>
                </div>

                <div class="ap-panel-body">
                    ${config.enableText ? `
                    <div class="ap-text-row">
                        <h3 id="ap-txt-label">${E('textSize')}</h3>
                        <div class="ap-stepper" role="group" aria-labelledby="ap-txt-label">
                            <button id="ap-txt-dec" class="ap-tooltip-target" aria-label="${E('decreaseText')}">&minus;</button>
                            <span id="ap-txt-val" class="ap-readonly-badge">${state.textScale}%</span>
                            <button id="ap-txt-inc" class="ap-tooltip-target" aria-label="${E('increaseText')}">+</button>
                        </div>
                    </div>` : ''}

                    <div class="ap-tools-grid">
                        ${config.enableContrast ? `
                        <button class="ap-tool-btn ap-grid-btn ap-tooltip-target" id="ap-cycle-contrast" aria-label="${E('contrast')}">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3ZM12 19V5C15.86 5 19 8.14 19 12C19 15.86 15.86 19 12 19Z"/></svg>
                            <span class="ap-btn-label">${E('contrast')}</span>
                            ${dots(3)}
                        </button>` : ''}

                        ${config.enableLinks ? `
                        <button class="ap-tool-btn ap-grid-btn ap-tooltip-target" id="ap-toggle-links" aria-label="${E('linksLabel')}" aria-pressed="false">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.9 12C3.9 10.29 5.29 8.9 7 8.9H11V7H7C4.24 7 2 9.24 2 12C2 14.76 4.24 17 7 17H11V15.1H7C5.29 15.1 3.9 13.71 3.9 12ZM8 13H16V11H8V13ZM17 7H13V8.9H17C18.71 8.9 20.1 10.29 20.1 12C20.1 13.71 18.71 15.1 17 15.1H13V17H17C19.76 17 22 14.76 22 12C22 9.24 19.76 7 17 7Z"/></svg>
                            <span class="ap-btn-label">${E('links')}</span>
                            <span class="ap-btn-state" aria-hidden="true"></span>
                        </button>` : ''}

                        ${config.enableDyslexia ? `
                        <button class="ap-tool-btn ap-grid-btn ap-tooltip-target" id="ap-cycle-font" aria-label="${E('font')}">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.93 13.5H14.07L12 7.98L9.93 13.5ZM12.75 3L20.25 21H17.7L15.9 16.2H8.1L6.3 21H3.75L11.25 3H12.75Z"/></svg>
                            <span class="ap-btn-label">${E('font')}</span>
                            ${dots(2)}
                        </button>` : ''}

                        ${config.enableSpacing ? `
                        <button class="ap-tool-btn ap-grid-btn ap-tooltip-target" id="ap-toggle-spacing" aria-label="${E('spacingLabel')}" aria-pressed="false">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 5h2v14H2zM20 5h2v14h-2zM8.6 15h1.8l.6-1.7h2.9l.6 1.7h1.8L13.2 7h-1.4L8.6 15zm3-3.3l.9-2.6.9 2.6h-1.8z"/></svg>
                            <span class="ap-btn-label">${E('spacing')}</span>
                            <span class="ap-btn-state" aria-hidden="true"></span>
                        </button>` : ''}

                        ${config.enableMotion ? `
                        <button class="ap-tool-btn ap-grid-btn ap-tooltip-target" id="ap-toggle-motion" aria-label="${E('motionLabel')}" aria-pressed="false">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM9 8h2v8H9zm4 0h2v8h-2z"/></svg>
                            <span class="ap-btn-label">${E('motion')}</span>
                            <span class="ap-btn-state" aria-hidden="true"></span>
                        </button>` : ''}

                        ${config.enableCursor ? `
                        <button class="ap-tool-btn ap-grid-btn ap-tooltip-target" id="ap-toggle-cursor" aria-label="${E('cursorLabel')}" aria-pressed="false">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 2v18l5-5 3.5 7 3-1.5L13 13.5h7z"/></svg>
                            <span class="ap-btn-label">${E('cursor')}</span>
                            <span class="ap-btn-state" aria-hidden="true"></span>
                        </button>` : ''}
                    </div>
                </div>

                <div class="ap-panel-footer">
                    <button class="ap-reset-btn ap-tooltip-target" aria-label="${E('resetLabel')}">${E('reset')}</button>
                    <button class="ap-close-panel-btn" aria-label="${E('closeLabel')}">${E('close')}</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        const fab = document.getElementById('ap-access-fab');
        const panel = document.getElementById('ap-access-panel');

        // Cycling buttons show the current setting as text and as filled dots
        const setStep = (btn, index, label) => {
            btn.querySelector('.ap-btn-state').textContent = label;
            btn.querySelectorAll('.ap-dots i').forEach((dot, i) => dot.classList.toggle('on', i < index));
        };

        const applyState = () => {
            applyPageClasses();

            const currentPos = state.userPosition || config.fabPosition;
            fab.className = fab.className.replace(/\bpos-[^\s]+/g, '');
            panel.className = panel.className.replace(/\bpos-[^\s]+/g, '');
            fab.classList.add(`pos-${currentPos}`);
            panel.classList.add(`pos-${currentPos}`);
            if (pulse) fab.classList.add('ap-heartbeat');

            document.querySelectorAll('.ap-pos-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-pos') === currentPos);
            });

            const txtVal = document.getElementById('ap-txt-val');
            if (txtVal) txtVal.innerText = `${state.textScale}%`;

            const contrastBtn = document.getElementById('ap-cycle-contrast');
            if (contrastBtn) {
                const index = CONTRAST_MODES.indexOf(state.contrast);
                contrastBtn.classList.toggle('active', index > 0);
                contrastBtn.setAttribute('aria-label', f('contrastState', CONTRAST_LABELS[state.contrast]));
                setStep(contrastBtn, index, CONTRAST_LABELS[state.contrast]);
            }

            const fontBtn = document.getElementById('ap-cycle-font');
            if (fontBtn) {
                const index = FONT_MODES.indexOf(state.font);
                fontBtn.classList.toggle('active', index > 0);
                fontBtn.setAttribute('aria-label', f('fontState', FONT_LABELS[state.font]));
                setStep(fontBtn, index, FONT_LABELS[state.font]);
            }

            [['ap-toggle-links', 'links'], ['ap-toggle-spacing', 'spacing'], ['ap-toggle-motion', 'motion'], ['ap-toggle-cursor', 'cursor']].forEach(([id, key]) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.classList.toggle('active', state[key]);
                    btn.setAttribute('aria-pressed', state[key] ? 'true' : 'false');
                    btn.querySelector('.ap-btn-state').textContent = state[key] ? T('on') : T('off');
                }
            });

            // Lets the theme react, e.g. pause the home page carousel when motion is stopped
            document.dispatchEvent(new CustomEvent('AccessibilityPlus:change', { detail: Object.assign({}, state) }));

            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 50);
        };

        const update = (message) => {
            saveState();
            applyState();
            announce(message);
        };

        const openPanel = () => {
            panel.classList.add('ap-open');
            fab.setAttribute('aria-expanded', 'true');
            document.body.classList.add('ap-panel-active-lock');
            fab.classList.remove('ap-heartbeat');
            pulse = false;
            state.visited = true;
            saveState();
            announce(T('menuOpened'));

            document.querySelector('.ap-close-panel-btn').focus();
            document.addEventListener('keydown', handleKeyDown);
        };

        const closePanel = () => {
            panel.classList.remove('ap-open');
            fab.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('ap-panel-active-lock');
            announce(T('menuClosed'));

            // Force tooltip closed by adding suppression class and blurring focus
            fab.classList.add('ap-hide-tooltip');
            fab.blur();

            fab.focus();
            document.removeEventListener('keydown', handleKeyDown);
        };

        fab.addEventListener('mouseleave', () => fab.classList.add('ap-hide-tooltip'));
        fab.addEventListener('mouseenter', () => fab.classList.remove('ap-hide-tooltip'));
        fab.addEventListener('focus', () => {
            if (!panel.classList.contains('ap-open')) {
                fab.classList.add('ap-hide-tooltip');
            }
        });
        fab.addEventListener('blur', () => fab.classList.remove('ap-hide-tooltip'));

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closePanel();
                return;
            }

            if (e.key === 'Tab') {
                // Skip controls hidden by CSS (e.g. Big Cursor on touch screens)
                const focusableElements = Array.from(panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
                    .filter(el => el.offsetParent !== null);
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        };

        fab.addEventListener('click', () => {
            if (panel.classList.contains('ap-open')) {
                closePanel();
            } else {
                openPanel();
            }
        });

        document.querySelector('.ap-close-btn').addEventListener('click', closePanel);
        document.querySelector('.ap-close-panel-btn').addEventListener('click', closePanel);

        document.querySelector('.ap-reset-btn').addEventListener('click', () => {
            Object.assign(state, {
                textScale: 100, contrast: 'none', links: false, font: 'default', spacing: false, motion: false, cursor: false
            });
            update(T('resetDone'));
        });

        document.querySelectorAll('.ap-pos-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                state.userPosition = e.currentTarget.getAttribute('data-pos');
                update(T(state.userPosition === 'bottom-left' ? 'movedLeft' : 'movedRight'));
            });
        });

        if (config.enableText) {
            document.getElementById('ap-txt-inc').addEventListener('click', () => {
                if (state.textScale < 200) {
                    state.textScale += 10;
                    update(f('textIncreased', state.textScale));
                }
            });
            document.getElementById('ap-txt-dec').addEventListener('click', () => {
                if (state.textScale > 100) {
                    state.textScale -= 10;
                    update(f('textDecreased', state.textScale));
                }
            });
        }

        if (config.enableContrast) {
            document.getElementById('ap-cycle-contrast').addEventListener('click', () => {
                state.contrast = CONTRAST_MODES[(CONTRAST_MODES.indexOf(state.contrast) + 1) % CONTRAST_MODES.length];
                update(state.contrast === 'none' ? T('contrastModeOff') : f('contrastMode', CONTRAST_LABELS[state.contrast]));
            });
        }

        if (config.enableDyslexia) {
            document.getElementById('ap-cycle-font').addEventListener('click', () => {
                state.font = FONT_MODES[(FONT_MODES.indexOf(state.font) + 1) % FONT_MODES.length];
                update(state.font === 'default' ? T('fontRestored') : f('fontEnabled', FONT_LABELS[state.font]));
            });
        }

        const toggles = [
            // Announcements are whole sentences (e.g. linksOn / linksOff) so they translate correctly
            [config.enableLinks, 'ap-toggle-links', 'links'],
            [config.enableSpacing, 'ap-toggle-spacing', 'spacing'],
            [config.enableMotion, 'ap-toggle-motion', 'motion'],
            [config.enableCursor, 'ap-toggle-cursor', 'cursor'],
        ];
        toggles.forEach(([enabled, id, key]) => {
            if (!enabled) return;
            document.getElementById(id).addEventListener('click', () => {
                state[key] = !state[key];
                update(T(key + (state[key] ? 'On' : 'Off')));
            });
        });

        applyState();
    });
})();
