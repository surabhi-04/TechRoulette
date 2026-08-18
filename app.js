// TechRoulette - Core Logic and State Manager

// Default Configurations
const DEFAULT_PREP_SECONDS = 10 * 60; // 10 minutes
const TOPIC_XP_REWARD = 150; // XP per speech completed

// Application State
const state = {
    dataset: null,
    selectedLanguage: 'Java',
    streakCount: 0,
    lastPracticeDate: null,
    speechHistory: [],
    currentTab: 'mastery', // 'mastery', 'history', 'analytics', 'settings'
    workflowState: 'idle', // 'idle', 'prep', 'speaking'
    currentTopic: null,
    timerSecondsRemaining: DEFAULT_PREP_SECONDS,
    timerIsRunning: false,
    timerInterval: null,
    stopwatchSeconds: 0,
    stopwatchInterval: null,
    editorTheme: localStorage.getItem('techroulette_editor_theme') || localStorage.getItem('techtalk_editor_theme') || 'Dracula',
    isDarkTheme: (localStorage.getItem('techroulette_dark_theme') || localStorage.getItem('tec_dark_theme')) !== 'false',
    soundAlertsEnabled: (localStorage.getItem('techroulette_sound_alerts') || localStorage.getItem('tec_sound_alerts')) !== 'false',
    
    // User Profile
    profileName: 'CS Candidate',
    profileRole: 'Backend Engineer',
    avatarType: 'preset',
    avatarVal: '0',

    // Authentication State
    isAuthenticated: false,
    user: null
};

// Preset Avatars definition
const presetAvatars = [
    { gradient: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)', symbol: 'terminal' },
    { gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)', symbol: 'code' },
    { gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)', symbol: 'database' },
    { gradient: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)', symbol: 'architecture' },
    { gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', symbol: 'memory' },
    { gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', symbol: 'code_blocks' }
];

// Helper to render profile avatars dynamically
function renderAvatar(type, val, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (type === 'custom' && val) {
        container.innerHTML = `<img src="${val}" alt="User Avatar" class="w-full h-full rounded-full object-cover border border-slate-700">`;
        return;
    }
    
    const idx = (parseInt(val, 10) >= 0 && parseInt(val, 10) < presetAvatars.length) ? parseInt(val, 10) : 0;
    const preset = presetAvatars[idx];
    
    let iconSize = 'text-base';
    if (containerId === 'settings-profile-avatar') iconSize = 'text-2xl';
    else if (containerId === 'header-profile-btn') iconSize = 'text-lg';
    
    container.innerHTML = `
        <div class="w-full h-full rounded-full flex items-center justify-center text-white" style="background: ${preset.gradient};">
            <span class="material-symbols-outlined ${iconSize}" style="font-variation-settings: 'FILL' 1;">${preset.symbol}</span>
        </div>
    `;
}

// Gamification roll-up animation helper
function animateValue(className, start, end, duration) {
    const elements = document.querySelectorAll('.' + className);
    if (elements.length === 0) return;
    
    if (start === end) {
        elements.forEach(el => el.innerText = end);
        return;
    }
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        elements.forEach(el => el.innerText = current);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            elements.forEach(el => el.innerText = end);
        }
    };
    window.requestAnimationFrame(step);
}

// Terminal typewriter effect helper
function runTypewriterOutline(text, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = '';
    let index = 0;
    
    const cursor = document.createElement('span');
    cursor.className = 'cursor-blink';
    
    const interval = setInterval(() => {
        if (index < text.length) {
            element.innerHTML = text.substring(0, index + 1);
            element.appendChild(cursor);
            index++;
        } else {
            clearInterval(interval);
            element.addEventListener('focus', () => {
                const blinker = element.querySelector('.cursor-blink');
                if (blinker) blinker.remove();
            }, { once: true });
        }
    }, 12);
}

// Update profile components dynamically
function updateProfileDisplay() {
    renderAvatar(state.avatarType, state.avatarVal, 'header-profile-btn');
    renderAvatar(state.avatarType, state.avatarVal, 'settings-profile-avatar');
    
    const nameEl = document.getElementById('settings-profile-name');
    if (nameEl) nameEl.innerText = state.profileName;
    
    const roleEl = document.getElementById('settings-profile-role');
    if (roleEl) roleEl.innerText = state.profileRole;
}

// Domain icon mappings
const domainIcons = {
    "Computer Networks": "router",
    "Operating Systems": "memory",
    "Data Structures & Algorithms": "code_blocks",
    "Database Management Systems": "database",
    "Software Engineering & SDLC/STLC": "terminal",
    "System Design & Cloud Architecture": "architecture",
    "Computer Organization & Architecture": "developer_board"
};

// Web Audio API Synthesizer (Zero external assets required)
const playClickTick = () => {
    if (!state.soundAlertsEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800 + Math.random() * 300, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
};

const playLandingChime = () => {
    if (!state.soundAlertsEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
};

const playAlertBeep = (type = 'stage-change') => {
    if (!state.soundAlertsEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        if (type === 'countdown-tick') {
            osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } else {
            // Stage transition chime (880Hz -> 1046.5Hz)
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        }
    } catch (e) {
        console.warn("Audio Context error", e);
    }
};

function playBeep(frequency = 440, type = 'sine', duration = 0.3) {
    if (!state.soundAlertsEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Audio context not allowed or supported yet.", e);
    }
}

// Format duration as mm:ss
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Theme Applier
function applyTheme() {
    if (state.isDarkTheme) {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#0B0F17';
    } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#F1F5F9';
    }
}

// Local Storage Helper
function saveState() {
    localStorage.setItem('techroulette_editor_theme', state.editorTheme);
    localStorage.setItem('techroulette_dark_theme', state.isDarkTheme);
    localStorage.setItem('techroulette_sound_alerts', state.soundAlertsEnabled);
    
    if (state.isAuthenticated && state.user) {
        localStorage.setItem(`techroulette_${state.user.username}_profile_role`, state.profileRole);
        localStorage.setItem(`techroulette_${state.user.username}_avatar_type`, state.avatarType);
        localStorage.setItem(`techroulette_${state.user.username}_avatar_val`, state.avatarVal);
        localStorage.setItem(`techroulette_${state.user.username}_current_streak`, state.streakCount);
        localStorage.setItem(`techroulette_${state.user.username}_last_practice_date`, state.lastPracticeDate || '');
    }
}

// Fetch and load cs_interview_topics_500.json
async function loadDataset() {
    try {
        const response = await fetch('./cs_interview_topics_500.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        state.dataset = await response.json();
        console.log(`Successfully loaded ${state.dataset.topics.length} interview topics.`);
        
        // Setup Auth event listeners
        setupAuthHandlers();
        
        // Check current session
        await checkAuthStatus();
    } catch (error) {
        console.error("Failed to load dataset: ", error);
        alert("Unable to load interview topics dataset. Please run a local web server.");
    }
}

// Initialize Application UI with State
function initializeUI() {
    // Apply global theme on start
    applyTheme();
    
    // Populate stats on dashboard
    updateStreakDisplay();
    updateRankAndXpDisplay();
    
    // Set active language button text
    updateLanguageButtons();
    
    // Render profile details
    updateProfileDisplay();
    
    // Build tabs navigation
    setupTabNavigation();

    // Render list views
    renderHistory();
    renderAnalytics();
    
    // Wire up events
    setupEventHandlers();
}

let prevStreak = 0;

// Update streak counts and display
function updateStreakDisplay(animate = true) {
    // 1. Get today's local date string
    const today = new Date().toISOString().split('T')[0];
    // 2. Get yesterday's local date string
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // 3. Evaluate status
    const lastPractice = state.lastPracticeDate;
    if (lastPractice === today) {
        // Keep current_streak as is (user already maintained their streak today)
    } else if (lastPractice === yesterday) {
        // Keep current_streak as is (streak is intact, pending today's practice)
    } else if (!lastPractice || lastPractice < yesterday) {
        // Reset current_streak = 0
        if (state.streakCount > 0) {
            state.streakCount = 0;
            // Save 0 to storage/database immediately
            saveState();
            if (state.isAuthenticated) {
                fetch('/api/user/streak/reset', { method: 'POST' })
                    .catch(err => console.error('Failed to reset streak on server:', err));
            }
        }
    }

    const currentStreak = state.streakCount;
    const streakElements = document.querySelectorAll('.streak-count');
    
    if (animate) {
        animateValue('streak-count', prevStreak, currentStreak, 1000);
        
        // Counter bump animation if the streak has increased
        if (currentStreak > prevStreak) {
            streakElements.forEach(el => {
                el.classList.remove('streak-bounce');
                void el.offsetWidth; // trigger reflow
                el.classList.add('streak-bounce');
                el.addEventListener('animationend', () => {
                    el.classList.remove('streak-bounce');
                }, { once: true });
            });
        }
    } else {
        streakElements.forEach(el => {
            el.innerText = currentStreak;
        });
    }
    prevStreak = currentStreak;
}

// Calculate Rank and Level from completed history
function updateRankAndXpDisplay() {
    const completedCount = state.speechHistory.length;
    const totalXp = completedCount * TOPIC_XP_REWARD;
    const level = Math.floor(totalXp / 1000) + 1;
    const nextLevelXp = level * 1000;
    const currentLevelXp = totalXp % 1000;
    const percentage = Math.floor((currentLevelXp / 1000) * 100);
    
    // Update labels
    document.querySelectorAll('.user-level').forEach(el => el.innerText = `Lvl ${level}`);
    document.querySelectorAll('.user-xp').forEach(el => el.innerText = `${totalXp.toLocaleString()} XP`);
    document.querySelectorAll('.global-tier').forEach(el => {
        if (level < 3) el.innerText = 'Novice';
        else if (level < 8) el.innerText = 'Competent';
        else if (level < 15) el.innerText = 'Expert';
        else el.innerText = 'Master';
    });

    // Update circular dashboard progress ring if present
    const rankPercentageText = document.querySelector('.rank-progress-percentage');
    if (rankPercentageText) {
        rankPercentageText.textContent = `${percentage}%`;
    }
    const rankProgressPath = document.querySelector('.rank-progress-path');
    if (rankProgressPath) {
        rankProgressPath.setAttribute('stroke-dasharray', `${percentage}, 100`);
    }

    // Dynamic rank mapping (just a simulated leaderboard number based on XP)
    const simulatedRank = Math.max(120, 10540 - Math.floor(totalXp * 1.5));
    document.querySelectorAll('.global-rank-display').forEach(el => {
        el.innerText = `#${simulatedRank.toLocaleString()}`;
    });
}

// Synchronize all Language selectors to match state
function updateLanguageButtons() {
    document.querySelectorAll('.selected-lang-label').forEach(el => {
        el.innerText = state.selectedLanguage.toUpperCase();
    });
    
    // Set selected attribute/class on option list if open
    const selectEl = document.getElementById('settings-pref-lang');
    if (selectEl) {
        selectEl.value = state.selectedLanguage;
    }
}

// Switch between Main Navigation Tabs
function setupTabNavigation() {
    const tabs = ['mastery', 'history', 'analytics', 'settings'];
    tabs.forEach(tabId => {
        const triggers = document.querySelectorAll(`[data-tab-trigger="${tabId}"]`);
        triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(tabId);
            });
        });
    });
}

let pendingTabId = null;

function switchTab(tabId) {
    const isSessionActive = state.workflowState === 'prep' || state.workflowState === 'speaking';
    
    if (isSessionActive && tabId !== 'mastery') {
        pendingTabId = tabId;
        const confirmModal = document.getElementById('session-confirm-modal');
        if (confirmModal) {
            confirmModal.classList.remove('hidden');
        }
        return; // Block the tab switch
    }
    
    executeTabSwitch(tabId);
}

function executeTabSwitch(tabId) {
    if (state.workflowState !== 'idle') {
        resetToDashboard();
    }

    state.currentTab = tabId;
    
    // Toggle active classes on bottoms nav links
    const tabs = ['mastery', 'history', 'analytics', 'settings'];
    tabs.forEach(t => {
        const triggers = document.querySelectorAll(`[data-tab-trigger="${t}"]`);
        triggers.forEach(el => {
            if (t === tabId) {
                el.classList.add('bg-indigo-500/10', 'text-indigo-400');
                el.classList.remove('text-slate-400');
                // Fill symbols settings check
                const symbol = el.querySelector('.material-symbols-outlined');
                if (symbol) symbol.style.fontVariationSettings = "'FILL' 1";
            } else {
                el.classList.remove('bg-indigo-500/10', 'text-indigo-400');
                el.classList.add('text-slate-400');
                const symbol = el.querySelector('.material-symbols-outlined');
                if (symbol) symbol.style.fontVariationSettings = "'FILL' 0";
            }
        });
        
        // Show/hide view panels
        const panel = document.getElementById(`view-panel-${t}`);
        if (panel) {
            if (t === tabId) {
                panel.classList.remove('view-hidden');
            } else {
                panel.classList.add('view-hidden');
            }
        }
    });

    if (tabId === 'history') renderHistory();
    if (tabId === 'analytics') renderAnalytics();
    if (tabId === 'settings') renderSettings();
}

// Setup Event Handlers
function setupEventHandlers() {
    // Session Confirmation Modal button click handlers
    const stayBtn = document.getElementById('modal-session-stay');
    if (stayBtn) {
        stayBtn.addEventListener('click', () => {
            const confirmModal = document.getElementById('session-confirm-modal');
            if (confirmModal) confirmModal.classList.add('hidden');
            pendingTabId = null;
        });
    }

    const leaveBtn = document.getElementById('modal-session-leave');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
            const confirmModal = document.getElementById('session-confirm-modal');
            if (confirmModal) confirmModal.classList.add('hidden');
            
            if (pendingTabId) {
                executeTabSwitch(pendingTabId);
                pendingTabId = null;
            }
        });
    }

    // Spin button clicks
    const spinButtons = document.querySelectorAll('.spin-btn');
    spinButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            spinRoulette();
        });
    });

    // Language Dropdown in Header Toggle
    const langBtn = document.getElementById('header-lang-btn');
    const dropdown = document.getElementById('header-lang-dropdown');
    
    if (langBtn && dropdown) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        
        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });
    }

    // Set Language from Dropdown click
    const dropdownOptions = document.querySelectorAll('.lang-dropdown-option');
    dropdownOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = opt.dataset.lang;
            changeLanguage(lang);
        });
    });

    // Settings Dropdown preference change
    const settingsPrefLang = document.getElementById('settings-pref-lang');
    if (settingsPrefLang) {
        settingsPrefLang.addEventListener('change', (e) => {
            changeLanguage(e.target.value);
        });
    }

    // Prep Phase buttons
    const prepSpinAgainBtn = document.getElementById('prep-spin-again-btn');
    if (prepSpinAgainBtn) {
        prepSpinAgainBtn.addEventListener('click', () => {
            // Stop current timer
            clearInterval(state.timerInterval);
            state.timerIsRunning = false;
            
            // Switch views back to idle and immediately trigger spin
            document.getElementById('dashboard-idle-view').classList.remove('hidden');
            document.getElementById('dashboard-prep-view').classList.add('hidden');
            document.getElementById('dashboard-speaking-view').classList.add('hidden');
            
            spinRoulette();
        });
    }

    const prepSkipBtn = document.getElementById('prep-skip-btn');
    if (prepSkipBtn) {
        prepSkipBtn.addEventListener('click', () => {
            skipToSpeakingPhase();
        });
    }

    const prepCancelBtn = document.getElementById('prep-cancel-btn');
    if (prepCancelBtn) {
        prepCancelBtn.addEventListener('click', () => {
            resetToDashboard();
        });
    }

    // Speaking Phase buttons
    const speakFinishBtn = document.getElementById('speak-finish-btn');
    if (speakFinishBtn) {
        speakFinishBtn.addEventListener('click', () => {
            finishSpeech();
        });
    }

    const speakCancelBtn = document.getElementById('speak-cancel-btn');
    if (speakCancelBtn) {
        speakCancelBtn.addEventListener('click', () => {
            resetToDashboard();
        });
    }

    // Scratchpad notes sync to localStorage key value
    const scratchpad = document.getElementById('notes-scratchpad');
    if (scratchpad) {
        scratchpad.addEventListener('input', () => {
            if (state.currentTopic) {
                localStorage.setItem(`notes_${state.currentTopic.id}`, scratchpad.innerText);
            }
        });
    }

    // Settings view event wires
    const darkToggle = document.getElementById('settings-dark-mode');
    if (darkToggle) {
        darkToggle.addEventListener('change', (e) => {
            state.isDarkTheme = e.target.checked;
            saveState();
            applyTheme();
        });
    }

    const darkRow = document.getElementById('settings-dark-mode-row');
    if (darkRow) {
        darkRow.addEventListener('click', (e) => {
            if (e.target.id === 'settings-dark-mode' || e.target.closest('label')) return;
            const checkbox = document.getElementById('settings-dark-mode');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    }

    const soundToggle = document.getElementById('settings-sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            state.soundAlertsEnabled = e.target.checked;
            saveState();
            if (state.soundAlertsEnabled) {
                playAlertBeep('stage-change');
            }
        });
    }

    const soundRow = document.getElementById('settings-sound-mode-row');
    if (soundRow) {
        soundRow.addEventListener('click', (e) => {
            if (e.target.id === 'settings-sound-toggle' || e.target.closest('label')) return;
            const checkbox = document.getElementById('settings-sound-toggle');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    }

    const clearHistoryBtn = document.getElementById('settings-clear-history');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', async () => {
            if (confirm("Are you absolutely sure you want to delete your speech history and reset streak? This cannot be undone.")) {
                try {
                    const res = await fetch('/api/practice/sessions', { method: 'DELETE' });
                    if (res.ok) {
                        state.speechHistory = [];
                        state.streakCount = 0;
                        state.lastSpeechDate = null;
                        
                        updateStreakDisplay();
                        updateRankAndXpDisplay();
                        renderHistory();
                        renderAnalytics();
                        alert("History and streak reset successfully.");
                    } else {
                        alert("Failed to reset history. Please try again.");
                    }
                } catch (err) {
                    console.error(err);
                    alert("Network error clearing history.");
                }
            }
        });
    }

    // Settings Editor Theme select
    const themeSelect = document.getElementById('settings-editor-theme');
    if (themeSelect) {
        themeSelect.value = state.editorTheme;
        themeSelect.addEventListener('change', (e) => {
            state.editorTheme = e.target.value;
            saveState();
            applyEditorTheme();
        });
    }

    // Profile Modal Openers
    const headerProfileBtn = document.getElementById('header-profile-btn');
    if (headerProfileBtn) {
        headerProfileBtn.addEventListener('click', () => openProfileModal());
    }

    const settingsProfileEditBtn = document.getElementById('settings-profile-edit-btn');
    if (settingsProfileEditBtn) {
        settingsProfileEditBtn.addEventListener('click', () => openProfileModal());
    }

    // Profile Modal Action Controls
    const modalCancel = document.getElementById('modal-profile-cancel');
    if (modalCancel) {
        modalCancel.addEventListener('click', () => closeProfileModal());
    }

    const modalSave = document.getElementById('modal-profile-save');
    if (modalSave) {
        modalSave.addEventListener('click', () => saveProfileModal());
    }

    const profileModal = document.getElementById('profile-modal');
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                closeProfileModal();
            }
        });
    }

    const modalAvatarUrlInput = document.getElementById('modal-profile-avatar-url');
    if (modalAvatarUrlInput) {
        modalAvatarUrlInput.addEventListener('input', (e) => {
            if (e.target.value.trim() !== '') {
                highlightSelectedPreset(-1);
            } else {
                highlightSelectedPreset(modalSelectedPresetIdx);
            }
        });
    }
}

// Modal State Actions
let modalSelectedPresetIdx = 0;

function openProfileModal() {
    const modalName = document.getElementById('modal-profile-name');
    const modalRole = document.getElementById('modal-profile-role');
    const modalLang = document.getElementById('modal-profile-lang');
    const modalAvatarUrl = document.getElementById('modal-profile-avatar-url');
    
    if (modalName) {
        modalName.value = state.profileName;
        modalName.disabled = true; // Username is fixed by auth
        modalName.title = "Username cannot be changed";
        modalName.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (modalRole) modalRole.value = state.profileRole;
    if (modalLang) modalLang.value = state.selectedLanguage;
    
    if (state.avatarType === 'custom') {
        if (modalAvatarUrl) modalAvatarUrl.value = state.avatarVal;
        modalSelectedPresetIdx = 0;
    } else {
        if (modalAvatarUrl) modalAvatarUrl.value = '';
        modalSelectedPresetIdx = parseInt(state.avatarVal, 10) || 0;
    }
    
    renderPresetAvatarsGrid();
    highlightSelectedPreset(modalSelectedPresetIdx);
    
    document.getElementById('profile-modal').classList.remove('hidden');
}

function selectPresetInModal(index) {
    modalSelectedPresetIdx = index;
    highlightSelectedPreset(index);
    const urlField = document.getElementById('modal-profile-avatar-url');
    if (urlField) urlField.value = '';
}

function highlightSelectedPreset(index) {
    const grid = document.getElementById('modal-preset-avatars-grid');
    if (!grid) return;
    
    const buttons = grid.querySelectorAll('button');
    buttons.forEach((btn, idx) => {
        if (idx === index) {
            btn.classList.add('ring-4', 'ring-primary', 'border-white');
        } else {
            btn.classList.remove('ring-4', 'ring-primary', 'border-white');
        }
    });
}

function renderPresetAvatarsGrid() {
    const grid = document.getElementById('modal-preset-avatars-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    presetAvatars.forEach((preset, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `w-10 h-10 rounded-full flex items-center justify-center border border-slate-700/50 hover:scale-105 active:scale-95 transition-all relative`;
        btn.style.background = preset.gradient;
        btn.innerHTML = `<span class="material-symbols-outlined text-white text-base select-none" style="font-variation-settings: 'FILL' 1;">${preset.symbol}</span>`;
        btn.addEventListener('click', () => {
            selectPresetInModal(index);
        });
        grid.appendChild(btn);
    });
}

function saveProfileModal() {
    const modalName = document.getElementById('modal-profile-name').value.trim();
    const modalRole = document.getElementById('modal-profile-role').value.trim();
    const modalLang = document.getElementById('modal-profile-lang').value;
    const modalAvatarUrl = document.getElementById('modal-profile-avatar-url').value.trim();
    
    state.profileName = modalName || 'CS Candidate';
    state.profileRole = modalRole || 'Backend Engineer';
    
    if (modalAvatarUrl) {
        state.avatarType = 'custom';
        state.avatarVal = modalAvatarUrl;
    } else {
        state.avatarType = 'preset';
        state.avatarVal = modalSelectedPresetIdx.toString();
    }
    
    if (modalLang !== state.selectedLanguage) {
        changeLanguage(modalLang);
    }
    
    saveState();
    updateProfileDisplay();
    closeProfileModal();
}

function closeProfileModal() {
    document.getElementById('profile-modal').classList.add('hidden');
}

// Change global active language
async function changeLanguage(lang) {
    state.selectedLanguage = lang;
    saveState();
    updateLanguageButtons();
    playBeep(660, 'sine', 0.1);
    
    if (state.isAuthenticated) {
        try {
            await fetch('/api/user/language', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: lang })
            });
        } catch (err) {
            console.error('Failed to sync language preference to server:', err);
        }
    }
}

// Roulette spin transition with glowing visual feedback
function spinRoulette() {
    if (!state.dataset) return;
    
    // Filter topics applicable to the selected language
    const filteredTopics = state.dataset.topics.filter(t => 
        t.applicable_languages.includes("All") || 
        t.applicable_languages.includes(state.selectedLanguage)
    );

    if (filteredTopics.length === 0) {
        alert(`No topics available for language: ${state.selectedLanguage}`);
        return;
    }

    // Filter out already completed/spinned topics from speechHistory
    const completedTopicIds = Array.from(new Set(state.speechHistory.map(item => item.topicId || item.id)));
    let unrepeatedTopics = filteredTopics.filter(t => !completedTopicIds.includes(t.id));

    // Fallback if all topics of this language have been completed
    if (unrepeatedTopics.length === 0) {
        unrepeatedTopics = filteredTopics;
    }

    // Start API request to spin topic immediately (in parallel with the slot cycle)
    const spinPromise = fetch(`/api/practice/spin?language=${encodeURIComponent(state.selectedLanguage)}`).then(res => {
        if (!res.ok) throw new Error('API spin error');
        return res.json();
    }).catch(err => {
        console.warn('API spin failed, falling back locally:', err);
        const selectedTopic = unrepeatedTopics[Math.floor(Math.random() * unrepeatedTopics.length)];
        return { ...selectedTopic, isAI: false };
    });

    // Dynamic animation feedback - Decelerating Slot-spin
    const spinContainer = document.getElementById('roulette-spin-container');
    const spinButton = document.getElementById('main-spin-btn');
    const statusLabel = document.getElementById('roulette-status-label');
    
    if (spinContainer && spinButton) {
        // Disable spin button during animation
        spinButton.disabled = true;
        spinContainer.classList.add('slot-spin');
        spinContainer.classList.remove('reveal-glow');
        
        if (statusLabel) {
            statusLabel.innerText = "DRAWING...";
            statusLabel.classList.add('text-cyan-400');
            statusLabel.classList.remove('text-emerald-400');
        }
        
        let currentDelay = 60;
        const maxDelay = 380;
        
        async function cycle(delay) {
            // Click tick sound
            playClickTick();
            
            const tempTopic = filteredTopics[Math.floor(Math.random() * filteredTopics.length)];
            document.getElementById('roulette-topic-title').innerText = tempTopic.title;
            
            if (delay < maxDelay) {
                // Decelerate the speed: increase delay dynamically
                currentDelay += Math.floor(delay * 0.16 + 12);
                setTimeout(() => cycle(currentDelay), currentDelay);
            } else {
                // Land precisely on the topic returned by the API promise
                try {
                    const selectedTopic = await spinPromise;
                    state.currentTopic = selectedTopic;
                    document.getElementById('roulette-topic-title').innerText = selectedTopic.title;
                    
                    // Landing chime
                    playLandingChime();
                    
                    if (statusLabel) {
                        statusLabel.innerText = selectedTopic.isAI ? "AI GENERATED" : "YOUR TOPIC";
                        statusLabel.classList.remove('text-cyan-400');
                        statusLabel.classList.add('text-emerald-400', 'animate-bounce');
                        setTimeout(() => statusLabel.classList.remove('animate-bounce'), 1000);
                    }
                    
                    // Complete visual transition
                    setTimeout(() => {
                        spinContainer.classList.remove('slot-spin');
                        spinContainer.classList.add('reveal-glow');
                        spinButton.disabled = false;
                        enterPrepPhase(selectedTopic);
                    }, 1000);
                } catch (e) {
                    console.error('Error during landing:', e);
                    spinButton.disabled = false;
                    resetToDashboard();
                }
            }
        }
        
        cycle(currentDelay);
    } else {
        // Fallback if elements not present
        spinPromise.then(selectedTopic => {
            state.currentTopic = selectedTopic;
            enterPrepPhase(selectedTopic);
        });
    }
}

// Enter Prep Phase (10 mins countdown)
function enterPrepPhase(topic) {
    state.workflowState = 'prep';
    state.timerSecondsRemaining = DEFAULT_PREP_SECONDS;
    state.timerIsRunning = false;
    
    // Show prep section, hide idle section
    document.getElementById('dashboard-idle-view').classList.add('hidden');
    document.getElementById('dashboard-prep-view').classList.remove('hidden');
    document.getElementById('dashboard-speaking-view').classList.add('hidden');
    
    // Hydrate Topic Data in Prep view
    document.getElementById('prep-topic-title').innerText = topic.title;
    
    // Hydrate category badges with bouncy slide-in stagger animations
    const diffBadge = document.getElementById('prep-topic-difficulty');
    const domainBadge = document.getElementById('prep-topic-domain');
    
    if (diffBadge) {
        diffBadge.innerText = topic.difficulty;
        diffBadge.classList.remove('badge-enter');
        void diffBadge.offsetWidth; // Force redraw reflow
        diffBadge.classList.add('badge-enter');
        diffBadge.style.animationDelay = '50ms';
    }
    
    if (domainBadge) {
        domainBadge.innerText = topic.domain;
        domainBadge.classList.remove('badge-enter');
        void domainBadge.offsetWidth; // Force redraw reflow
        domainBadge.classList.add('badge-enter');
        domainBadge.style.animationDelay = '200ms';
    }

    const sourceBadge = document.getElementById('prep-topic-source-badge');
    if (sourceBadge) {
        sourceBadge.classList.remove('badge-enter');
        void sourceBadge.offsetWidth; // Force redraw reflow
        sourceBadge.classList.add('badge-enter');
        sourceBadge.style.animationDelay = '350ms';
        
        if (topic.isAI) {
            sourceBadge.innerText = '✨ AI Generated (Real-Time)';
            sourceBadge.className = 'rounded px-2 py-0.5 font-code-md text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 badge-enter';
        } else {
            sourceBadge.innerText = '📚 Curated CS Core';
            sourceBadge.className = 'rounded px-2 py-0.5 font-code-md text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700/50 badge-enter';
        }
    }
    
    // Set domain icon
    const iconEl = document.getElementById('prep-topic-icon');
    if (iconEl) {
        iconEl.innerText = domainIcons[topic.domain] || 'terminal';
    }

    // Hydrate research point bullets with cascade slide-in delays
    const bulletList = document.getElementById('prep-research-points');
    if (bulletList) {
        bulletList.innerHTML = '';
        topic.key_research_points.forEach((point, index) => {
            const li = document.createElement('li');
            li.className = 'flex items-start gap-3 text-slate-300 font-body-sm text-sm leading-relaxed badge-enter';
            li.style.animationDelay = `${(index + 2) * 150}ms`;
            li.innerHTML = `
                <span class="material-symbols-outlined text-indigo-400 text-base mt-0.5" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                <span>${point}</span>
            `;
            bulletList.appendChild(li);
        });
    }

    // Typewriter effect on outline scratchpad
    const scratchpad = document.getElementById('notes-scratchpad');
    if (scratchpad) {
        const savedNotes = localStorage.getItem(`notes_${topic.id}`);
        if (savedNotes) {
            scratchpad.innerHTML = savedNotes;
        } else {
            const outlineTemplate = `// Outline talking points here...\n// 1. Definition & Technical mechanism\n// 2. Real-world Software Engineering architectural use case\n// 3. Time/Space complexity, Resource & Memory tradeoffs`;
            runTypewriterOutline(outlineTemplate, 'notes-scratchpad');
        }
    }

    // Reset Prep Timer Display
    updatePrepTimerDisplay();
    
    // Set Start/Pause button visual
    updatePrepTimerControlsVisual();
    
    // Play alert beep
    playBeep(880, 'sine', 0.2);
    
    // Autostart prep timer immediately to reduce clicks
    startPrepTimer();
}

// Prep Timer Tick logic
function startPrepTimer() {
    if (state.timerIsRunning) return;
    state.timerIsRunning = true;
    updatePrepTimerControlsVisual();
    
    const timerElement = document.getElementById('prep-timer-display');
    if (timerElement) {
        timerElement.classList.add('pulse-digits');
    }

    state.timerInterval = setInterval(() => {
        state.timerSecondsRemaining--;
        updatePrepTimerDisplay();
        
        // Tick warning in last 3 seconds
        if (state.timerSecondsRemaining === 3 || state.timerSecondsRemaining === 2 || state.timerSecondsRemaining === 1) {
            playAlertBeep('countdown-tick');
        }
        
        // Visual indicator warning on last 1 minute
        if (state.timerSecondsRemaining === 60) {
            playBeep(587.33, 'triangle', 0.5); // Warm alert sound
        }
        
        if (state.timerSecondsRemaining <= 0) {
            clearInterval(state.timerInterval);
            state.timerIsRunning = false;
            playAlertBeep('stage-change');
            enterSpeakingPhase();
        }
    }, 1000);
}

function pausePrepTimer() {
    if (!state.timerIsRunning) return;
    clearInterval(state.timerInterval);
    state.timerIsRunning = false;
    updatePrepTimerControlsVisual();
    
    const timerElement = document.getElementById('prep-timer-display');
    if (timerElement) {
        timerElement.classList.remove('pulse-digits');
    }
}

function updatePrepTimerDisplay() {
    const timerDisplay = document.getElementById('prep-timer-display');
    if (timerDisplay) {
        timerDisplay.innerText = formatTime(state.timerSecondsRemaining);
    }
    
    // Update circular progress ring
    const ring = document.getElementById('prep-progress-ring');
    if (ring) {
        const maxOffset = 276.4; // Circumference for r=44
        const offset = maxOffset - (state.timerSecondsRemaining / DEFAULT_PREP_SECONDS) * maxOffset;
        ring.style.strokeDashoffset = offset;
        
        // Decaying color transition in the last 60s
        if (state.timerSecondsRemaining <= 60) {
            ring.classList.remove('stroke-primary');
            ring.style.stroke = '#EF4444'; // Red color
        } else {
            ring.classList.add('stroke-primary');
            ring.style.stroke = ''; // Default primary theme
        }
    }
}

function updatePrepTimerControlsVisual() {
    const playPauseBtn = document.getElementById('prep-start-pause-btn');
    if (!playPauseBtn) return;
    
    const label = playPauseBtn.querySelector('span:not(.material-symbols-outlined)');
    const icon = playPauseBtn.querySelector('.material-symbols-outlined');
    
    if (state.timerIsRunning) {
        if (label) label.innerText = "PAUSE PREP";
        if (icon) icon.innerText = "pause";
        playPauseBtn.classList.remove('bg-indigo-500/10', 'text-indigo-400');
        playPauseBtn.classList.add('bg-slate-700', 'text-white');
    } else {
        if (label) label.innerText = "START PREP";
        if (icon) icon.innerText = "play_arrow";
        playPauseBtn.classList.add('bg-indigo-500/10', 'text-indigo-400');
        playPauseBtn.classList.remove('bg-slate-700', 'text-white');
    }
}

function skipToSpeakingPhase() {
    pausePrepTimer();
    enterSpeakingPhase();
}

// Enter Speaking Phase
function enterSpeakingPhase() {
    state.workflowState = 'speaking';
    state.stopwatchSeconds = 0;
    
    // Switch views
    document.getElementById('dashboard-idle-view').classList.add('hidden');
    document.getElementById('dashboard-prep-view').classList.add('hidden');
    document.getElementById('dashboard-speaking-view').classList.remove('hidden');

    // Populate Speaking details
    document.getElementById('speak-topic-title').innerText = state.currentTopic.title;
    document.getElementById('speak-topic-domain').innerText = state.currentTopic.domain;
    
    // Format speaking card tag
    const speakTag = document.getElementById('speak-topic-tag');
    if (speakTag) {
        speakTag.innerText = state.selectedLanguage;
    }

    // Reset Stopwatch Display
    updateStopwatchDisplay();
    
    // Play transition alert chime (stage-change)
    playAlertBeep('stage-change');

    // Start stopwatch interval
    state.stopwatchInterval = setInterval(() => {
        state.stopwatchSeconds++;
        updateStopwatchDisplay();
    }, 1000);
}

// Update stopwatch display with exact color bounds
function updateStopwatchDisplay() {
    const seconds = state.stopwatchSeconds;
    const stopwatchDisplay = document.getElementById('speak-stopwatch-display');
    const colorBar = document.getElementById('speak-progress-color-indicator');
    
    if (stopwatchDisplay) {
        stopwatchDisplay.innerText = formatTime(seconds);
        
        // Remove existing colors
        stopwatchDisplay.classList.remove('text-yellow-400', 'text-emerald-400', 'text-rose-500');
        if (colorBar) {
            colorBar.classList.remove('bg-yellow-400', 'bg-emerald-400', 'bg-rose-500');
        }

        // Apply rules:
        // Yellow (0:00 - 1:59) -> 0 to 119 seconds
        // Green (2:00 - 5:00) -> 120 to 300 seconds
        // Red (> 5:00) -> > 300 seconds
        if (seconds < 120) {
            stopwatchDisplay.classList.add('text-yellow-400');
            if (colorBar) colorBar.classList.add('bg-yellow-400');
        } else if (seconds <= 300) {
            stopwatchDisplay.classList.add('text-emerald-400');
            if (colorBar) colorBar.classList.add('bg-emerald-400');
            
            // Soft cue beep at exactly 2:00 (green threshold)
            if (seconds === 120) {
                playBeep(880, 'sine', 0.1);
            }
        } else {
            stopwatchDisplay.classList.add('text-rose-500');
            if (colorBar) colorBar.classList.add('bg-rose-500');
            
            // Soft alert beep at exactly 5:00 (red threshold)
            if (seconds === 301) {
                playBeep(440, 'triangle', 0.4);
            }
        }
    }
}

// Finish speaking, record item, save state and reset
async function finishSpeech() {
    clearInterval(state.stopwatchInterval);
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const clientLocalDate = `${year}-${month}-${day}`;

    try {
        const res = await fetch('/api/practice/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topicId: state.currentTopic.id,
                topicTitle: state.currentTopic.title,
                domain: state.currentTopic.domain,
                durationSeconds: state.stopwatchSeconds,
                clientLocalDate: clientLocalDate
            })
        });
        
        const data = await res.json();
        if (res.ok) {
            // Update local state based on backend response
            state.streakCount = data.current_streak;
            state.lastPracticeDate = data.last_practice_date;
            
            const speechEntry = {
                id: state.currentTopic.id,
                topicId: state.currentTopic.id,
                title: state.currentTopic.title,
                topicTitle: state.currentTopic.title,
                domain: state.currentTopic.domain,
                language: state.selectedLanguage,
                date: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                durationSeconds: state.stopwatchSeconds,
                speechDuration: state.stopwatchSeconds
            };

            // Add to history
            state.speechHistory.unshift(speechEntry);
            
            // Clean up temporary scratch notes to free localStorage
            localStorage.removeItem(`notes_${state.currentTopic.id}`);

            // Update dashboard statistics
            updateStreakDisplay();
            updateRankAndXpDisplay();

            // Alert completion
            playBeep(1046.5, 'sine', 0.25);
            setTimeout(() => {
                alert(`Congratulations! You completed your talk on "${state.currentTopic.title}" in ${formatTime(state.stopwatchSeconds)}.\nYou earned +150 XP!`);
                resetToDashboard();
            }, 200);
        } else {
            alert(`Error saving speech session: ${data.error || 'Unknown error'}`);
            resetToDashboard();
        }
    } catch (err) {
        console.error(err);
        alert('Network error saving speech session. Session not recorded.');
        resetToDashboard();
    }
}

// Back to main state
function resetToDashboard() {
    // Clear intervals
    clearInterval(state.timerInterval);
    clearInterval(state.stopwatchInterval);
    
    state.timerIsRunning = false;
    state.workflowState = 'idle';
    state.currentTopic = null;

    // Reset elements visual cues
    const timerDisplay = document.getElementById('prep-timer-display');
    if (timerDisplay) {
        timerDisplay.classList.remove('pulse-digits', 'pulse-active', 'text-yellow-400');
    }
    
    const titleEl = document.getElementById('roulette-topic-title');
    if (titleEl) {
        titleEl.innerText = "Spin to generate a random Computer Science interview topic matching your language...";
    }
    
    const statusLabel = document.getElementById('roulette-status-label');
    if (statusLabel) {
        statusLabel.innerText = "YOUR TOPIC";
        statusLabel.className = "font-label-caps text-[10px] text-cyan-400 font-bold uppercase tracking-widest transition-all";
    }
    
    const spinContainer = document.getElementById('roulette-spin-container');
    if (spinContainer) {
        spinContainer.classList.remove('slot-spin', 'reveal-glow');
    }
    
    const spinButton = document.getElementById('main-spin-btn');
    if (spinButton) {
        spinButton.disabled = false;
    }

    // Switch screens
    document.getElementById('dashboard-idle-view').classList.remove('hidden');
    document.getElementById('dashboard-prep-view').classList.add('hidden');
    document.getElementById('dashboard-speaking-view').classList.add('hidden');
}

// Render Settings View details
function renderSettings() {
    const darkToggle = document.getElementById('settings-dark-mode');
    if (darkToggle) {
        darkToggle.checked = state.isDarkTheme;
    }

    const soundToggle = document.getElementById('settings-sound-toggle');
    if (soundToggle) {
        soundToggle.checked = state.soundAlertsEnabled;
    }
}

// Apply visual syntax themes to code elements
function applyEditorTheme() {
    const scratchpad = document.getElementById('notes-scratchpad');
    if (!scratchpad) return;

    // Remove existing themes
    scratchpad.className = "font-code-md text-code-md whitespace-pre-wrap outline-none w-full h-full resize-none overflow-y-auto min-h-[160px]";
    
    switch (state.editorTheme) {
        case 'Monokai Pro':
            scratchpad.style.backgroundColor = '#2d2a2e';
            scratchpad.style.color = '#fcfcfa';
            break;
        case 'Nord':
            scratchpad.style.backgroundColor = '#2e3440';
            scratchpad.style.color = '#d8dee9';
            break;
        case 'One Dark':
            scratchpad.style.backgroundColor = '#282c34';
            scratchpad.style.color = '#abb2bf';
            break;
        case 'Dracula':
        default:
            scratchpad.style.backgroundColor = '#282a36';
            scratchpad.style.color = '#f8f8f2';
            break;
    }
}

// Render Duration Badge (e.g. 3m 45s)
function formatDurationBadge(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
        return `${m}m ${s}s`;
    }
    return `${s}s`;
}

// Render Speech History List
function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (state.speechHistory.length === 0) {
        historyList.innerHTML = `
            <div class="glass-panel rounded-xl p-8 text-center text-slate-400">
                <span class="material-symbols-outlined text-4xl mb-2 text-slate-500">history_toggle_off</span>
                <p class="font-body-md text-sm">No speeches completed yet. Spinned topics will appear here.</p>
            </div>
        `;
        return;
    }

    historyList.innerHTML = '';
    state.speechHistory.forEach(item => {
        const itemDate = new Date(item.date || item.timestamp).toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const icon = domainIcons[item.domain] || 'terminal';
        const durationText = formatDurationBadge(item.durationSeconds || item.speechDuration || 0);
        
        const card = document.createElement('div');
        card.className = 'glass-panel rounded-xl p-4 flex justify-between items-center gap-4 border border-slate-700/50 hover:border-slate-600 transition-colors';
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                    <span class="material-symbols-outlined text-xl">${icon}</span>
                </div>
                <div>
                    <h3 class="font-body-md text-sm font-semibold text-slate-100 line-clamp-1">${item.title || item.topicTitle}</h3>
                    <div class="flex gap-2 items-center mt-1 text-[11px] text-slate-400 font-label-caps">
                        <span>${item.language}</span>
                        <span>•</span>
                        <span class="text-indigo-300 font-semibold">${item.domain}</span>
                    </div>
                </div>
            </div>
            <div class="text-right whitespace-nowrap flex flex-col items-end">
                <span class="px-2 py-0.5 rounded text-[11px] font-bold font-code-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${durationText}</span>
                <div class="text-[10px] text-slate-500 mt-1">${itemDate}</div>
            </div>
        `;
        historyList.appendChild(card);
    });
}

// Render dynamic user proficiency charts on Analytics View
function renderAnalytics() {
    const domainGrid = document.getElementById('analytics-domains-grid');
    if (!domainGrid) return;

    // Calculate domain statistics
    const stats = {};
    if (state.dataset) {
        state.dataset.domains.forEach(d => {
            stats[d] = {
                completed: 0,
                total: state.dataset.topics.filter(t => t.domain === d).length,
                percentage: 0
            };
        });
    }

    // Tally from history
    state.speechHistory.forEach(item => {
        if (stats[item.domain]) {
            stats[item.domain].completed++;
        }
    });

    // Recompute percentages (capped)
    Object.keys(stats).forEach(d => {
        const item = stats[d];
        if (item.total > 0) {
            item.percentage = Math.min(100, Math.round((item.completed / 10) * 100)); // Say 10 speeches is master level for a domain
        }
    });

    domainGrid.innerHTML = '';
    
    // Sort domains by percentage descending
    const sortedDomains = Object.keys(stats).sort((a, b) => stats[b].percentage - stats[a].percentage);

    sortedDomains.forEach(domain => {
        const item = stats[domain];
        const icon = domainIcons[domain] || 'terminal';
        
        let rankLabel = "NOVICE";
        let colorClass = "text-slate-400";
        if (item.percentage >= 80) {
            rankLabel = "EXPERT";
            colorClass = "text-indigo-400";
        } else if (item.percentage >= 40) {
            rankLabel = "COMPETENT";
            colorClass = "text-secondary";
        } else if (item.percentage > 0) {
            rankLabel = "LEARNER";
            colorClass = "text-yellow-400";
        }

        const card = document.createElement('div');
        card.className = 'glass-panel rounded-xl p-4 flex flex-col items-center border border-slate-700/50';
        card.innerHTML = `
            <div class="w-full flex justify-between items-start mb-4">
                <span class="material-symbols-outlined text-indigo-400">${icon}</span>
                <span class="font-label-caps text-[9px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">${rankLabel}</span>
            </div>
            <div class="w-20 h-20 mb-3">
                <svg class="circular-chart ${colorClass}" viewBox="0 0 36 36">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                    <path class="circle stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke-dasharray="${item.percentage}, 100"></path>
                    <text class="percentage" x="18" y="20.35">${item.percentage}%</text>
                </svg>
            </div>
            <h3 class="font-body-md text-xs font-semibold text-slate-200 text-center line-clamp-1 w-full" title="${domain}">${domain}</h3>
            <div class="text-[10px] text-slate-500 mt-1 font-label-caps">${item.completed} Spoken</div>
        `;
        domainGrid.appendChild(card);
    });

    // Populate overall details
    const overallXp = state.speechHistory.length * TOPIC_XP_REWARD;
    const overallLevel = Math.floor(overallXp / 1000) + 1;
    
    const overallLevelEl = document.getElementById('analytics-overall-level');
    if (overallLevelEl) overallLevelEl.innerText = `Lvl ${overallLevel} · ${overallXp.toLocaleString()} XP`;

    const overallCountEl = document.getElementById('analytics-overall-count');
    if (overallCountEl) overallCountEl.innerText = state.speechHistory.length;
}

// Apply editor theme settings load
window.addEventListener('DOMContentLoaded', () => {
    loadDataset();
    applyEditorTheme();
});

// --- Authentication and Inline Form Validation Core Logic ---

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const user = await response.json();
            state.isAuthenticated = true;
            state.user = user;
            
            // Sync user data to state
            state.streakCount = user.current_streak;
            state.lastPracticeDate = user.last_practice_date;
            state.selectedLanguage = user.preferred_language;
            state.profileName = user.username;
            
            // Load user profile preferences based on username
            state.profileRole = localStorage.getItem(`techroulette_${user.username}_profile_role`) || localStorage.getItem(`techtalk_${user.username}_profile_role`) || 'Backend Engineer';
            state.avatarType = localStorage.getItem(`techroulette_${user.username}_avatar_type`) || localStorage.getItem(`techtalk_${user.username}_avatar_type`) || 'preset';
            state.avatarVal = localStorage.getItem(`techroulette_${user.username}_avatar_val`) || localStorage.getItem(`techtalk_${user.username}_avatar_val`) || '0';
            
            // Fetch practice history from SQLite DB
            const histRes = await fetch('/api/practice/sessions');
            if (histRes.ok) {
                const dbHistory = await histRes.json();
                state.speechHistory = dbHistory.map(item => ({
                    id: item.topic_id,
                    topicId: item.topic_id,
                    title: item.topic_title,
                    topicTitle: item.topic_title,
                    domain: item.domain,
                    language: state.selectedLanguage,
                    date: item.completed_at,
                    timestamp: item.completed_at,
                    durationSeconds: item.duration_seconds,
                    speechDuration: item.duration_seconds
                }));
            }
            
            // Hide Auth screen overlay and show navigation logout controls
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('header-logout-btn').classList.remove('hidden');
            
            // Initialize/Refresh UI
            initializeUI();
        } else {
            // Unauthenticated: reveal Auth card, hide header logout controls
            state.isAuthenticated = false;
            state.user = null;
            document.getElementById('auth-container').classList.remove('hidden');
            document.getElementById('header-logout-btn').classList.add('hidden');
        }
    } catch (err) {
        console.error('Error checking auth status:', err);
        state.isAuthenticated = false;
        state.user = null;
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('header-logout-btn').classList.add('hidden');
    }
}

function switchAuthTab(tab) {
    const signInTab = document.getElementById('auth-tab-signin');
    const signUpTab = document.getElementById('auth-tab-signup');
    const signInForm = document.getElementById('auth-form-signin');
    const signUpForm = document.getElementById('auth-form-signup');
    const errBanner = document.getElementById('auth-general-error');
    
    errBanner.classList.add('hidden');
    
    if (tab === 'signin') {
        signInTab.className = "py-2.5 text-xs font-label-caps font-bold rounded-md bg-indigo-500 text-white transition-all shadow-sm";
        signUpTab.className = "py-2.5 text-xs font-label-caps font-bold rounded-md text-slate-400 hover:text-slate-200 transition-all";
        signInForm.classList.remove('hidden');
        signUpForm.classList.add('hidden');
    } else {
        signUpTab.className = "py-2.5 text-xs font-label-caps font-bold rounded-md bg-indigo-500 text-white transition-all shadow-sm";
        signInTab.className = "py-2.5 text-xs font-label-caps font-bold rounded-md text-slate-400 hover:text-slate-200 transition-all";
        signUpForm.classList.remove('hidden');
        signInForm.classList.add('hidden');
    }
}

// Inline Form Validation Checks
function checkUsernameField() {
    const input = document.getElementById('signup-username');
    const err = document.getElementById('signup-username-err');
    const val = input.value.trim();
    
    // Length: 3-20 characters, alphanumeric and underscores, must start with a lowercase letter
    const isValid = /^[a-z][a-z0-9_]{2,19}$/.test(val);
    if (!isValid && val.length > 0) {
        err.classList.remove('hidden');
        input.classList.add('border-rose-500/70', 'focus:border-rose-500', 'focus:ring-rose-500');
        input.classList.remove('border-slate-700/60', 'focus:border-primary', 'focus:ring-primary');
        return false;
    } else {
        err.classList.add('hidden');
        input.classList.remove('border-rose-500/70', 'focus:border-rose-500', 'focus:ring-rose-500');
        input.classList.add('border-slate-700/60', 'focus:border-primary', 'focus:ring-primary');
        return isValid;
    }
}

function checkEmailField() {
    const input = document.getElementById('signup-email');
    const err = document.getElementById('signup-email-err');
    const val = input.value.trim().toLowerCase();
    
    const isValid = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(val);
    if (!isValid && val.length > 0) {
        err.classList.remove('hidden');
        input.classList.add('border-rose-500/70', 'focus:border-rose-500', 'focus:ring-rose-500');
        input.classList.remove('border-slate-700/60', 'focus:border-primary', 'focus:ring-primary');
        return false;
    } else {
        err.classList.add('hidden');
        input.classList.remove('border-rose-500/70', 'focus:border-rose-500', 'focus:ring-rose-500');
        input.classList.add('border-slate-700/60', 'focus:border-primary', 'focus:ring-primary');
        return isValid;
    }
}

function checkPasswordField() {
    const input = document.getElementById('signup-password');
    const err = document.getElementById('signup-password-err');
    const val = input.value;
    
    const hasUpper = /[A-Z]/.test(val);
    const hasLower = /[a-z]/.test(val);
    const hasDigit = /\d/.test(val);
    const hasSpecial = /[@$!%*?&#]/.test(val);
    const isValid = val.length >= 8 && hasUpper && hasLower && hasDigit && hasSpecial;
    
    if (!isValid && val.length > 0) {
        err.classList.remove('hidden');
        input.classList.add('border-rose-500/70', 'focus:border-rose-500', 'focus:ring-rose-500');
        input.classList.remove('border-slate-700/60', 'focus:border-primary', 'focus:ring-primary');
        return false;
    } else {
        err.classList.add('hidden');
        input.classList.remove('border-rose-500/70', 'focus:border-rose-500', 'focus:ring-rose-500');
        input.classList.add('border-slate-700/60', 'focus:border-primary', 'focus:ring-primary');
        return isValid;
    }
}

function checkConfirmField() {
    const passInput = document.getElementById('signup-password');
    const confirmInput = document.getElementById('signup-confirm');
    const err = document.getElementById('signup-confirm-err');
    
    const isValid = passInput.value === confirmInput.value;
    if (!isValid && confirmInput.value.length > 0) {
        err.classList.remove('hidden');
        confirmInput.classList.add('border-rose-500/70', 'focus:border-rose-500', 'focus:ring-rose-500');
        confirmInput.classList.remove('border-slate-700/60', 'focus:border-primary', 'focus:ring-primary');
        return false;
    } else {
        err.classList.add('hidden');
        confirmInput.classList.remove('border-rose-500/70', 'focus:border-rose-500', 'focus:ring-rose-500');
        confirmInput.classList.add('border-slate-700/60', 'focus:border-primary', 'focus:ring-primary');
        return isValid;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const loginId = document.getElementById('signin-loginid').value.trim();
    const password = document.getElementById('signin-password').value;
    const rememberMe = document.getElementById('signin-rememberme').checked;
    
    const errBanner = document.getElementById('auth-general-error');
    const errText = document.getElementById('auth-general-error-text');
    
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId, password, rememberMe })
        });
        
        const data = await res.json();
        if (res.ok) {
            errBanner.classList.add('hidden');
            document.getElementById('signin-loginid').value = '';
            document.getElementById('signin-password').value = '';
            
            await checkAuthStatus();
        } else {
            errText.innerText = data.error || 'Invalid credentials.';
            errBanner.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        errText.innerText = 'Network error. Please check backend connection.';
        errBanner.classList.remove('hidden');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const isUserValid = checkUsernameField();
    const isEmailValid = checkEmailField();
    const isPassValid = checkPasswordField();
    const isConfirmValid = checkConfirmField();
    
    const errBanner = document.getElementById('auth-general-error');
    const errText = document.getElementById('auth-general-error-text');
    
    if (!isUserValid || !isEmailValid || !isPassValid || !isConfirmValid) {
        errText.innerText = 'Please correct the validation errors below.';
        errBanner.classList.remove('hidden');
        return;
    }
    
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    const preferredLanguage = document.getElementById('signup-lang').value;
    
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, confirmPassword, preferredLanguage })
        });
        
        const data = await res.json();
        if (res.ok) {
            errBanner.classList.add('hidden');
            document.getElementById('signup-username').value = '';
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-confirm').value = '';
            
            await checkAuthStatus();
        } else {
            errText.innerText = data.error || 'Registration failed.';
            errBanner.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        errText.innerText = 'Network error. Please check backend connection.';
        errBanner.classList.remove('hidden');
    }
}

async function handleLogout() {
    if (!confirm("Are you sure you want to log out?")) return;
    try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (res.ok) {
            state.isAuthenticated = false;
            state.user = null;
            state.speechHistory = [];
            
            // Reset to idle mastery state
            state.workflowState = 'idle';
            state.currentTopic = null;
            clearInterval(state.timerInterval);
            clearInterval(state.stopwatchInterval);
            
            document.getElementById('auth-container').classList.remove('hidden');
            document.getElementById('header-logout-btn').classList.add('hidden');
            
            switchAuthTab('signin');
            switchTab('mastery');
        } else {
            alert("Logout failed. Please try again.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error during logout.");
    }
}

function setupAuthHandlers() {
    const signInTab = document.getElementById('auth-tab-signin');
    const signUpTab = document.getElementById('auth-tab-signup');
    
    if (signInTab) signInTab.addEventListener('click', () => switchAuthTab('signin'));
    if (signUpTab) signUpTab.addEventListener('click', () => switchAuthTab('signup'));
    
    const signInForm = document.getElementById('auth-form-signin');
    if (signInForm) signInForm.addEventListener('submit', handleLogin);
    
    const signUpForm = document.getElementById('auth-form-signup');
    if (signUpForm) signUpForm.addEventListener('submit', handleRegister);
    
    const usernameInput = document.getElementById('signup-username');
    if (usernameInput) usernameInput.addEventListener('input', checkUsernameField);
    
    const emailInput = document.getElementById('signup-email');
    if (emailInput) emailInput.addEventListener('input', checkEmailField);
    
    const passwordInput = document.getElementById('signup-password');
    if (passwordInput) passwordInput.addEventListener('input', () => {
        checkPasswordField();
        checkConfirmField();
    });
    
    const confirmInput = document.getElementById('signup-confirm');
    if (confirmInput) confirmInput.addEventListener('input', checkConfirmField);
    
    const headerLogout = document.getElementById('header-logout-btn');
    if (headerLogout) headerLogout.addEventListener('click', handleLogout);
    
    const settingsLogout = document.getElementById('settings-logout-btn');
    if (settingsLogout) settingsLogout.addEventListener('click', handleLogout);
}

// Browser-Level Tab/Window Close Guard
window.addEventListener('beforeunload', (e) => {
    const isSessionActive = state.workflowState === 'prep' || state.workflowState === 'speaking';
    if (isSessionActive) {
        e.preventDefault();
        e.returnValue = '';
    }
});
