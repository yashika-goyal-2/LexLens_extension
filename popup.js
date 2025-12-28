// popup.js
// Orchestrates the analysis and renders the UI

document.addEventListener('DOMContentLoaded', () => {
    main();
});

let currentData = null;
let currentLang = 'en'; 

function main() {
    initLexiLens();

    const toggle = document.getElementById('lang-toggle');
    const label = document.getElementById('lang-label');
    
    toggle.addEventListener('change', (e) => {
        currentLang = e.target.checked ? 'hi' : 'en';
        label.innerText = e.target.checked ? "HINGLISH" : "ENGLISH";
        if (currentData) {
            renderUI(currentData);
        }
    });
}

function initLexiLens() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab) return renderError("No active tab found.");

        chrome.tabs.sendMessage(currentTab.id, {action: "analyzePage"}, (response) => {
            if (chrome.runtime.lastError) {
                if (currentTab.url.startsWith("chrome://")) {
                    return renderError("Cannot analyze browser system pages.");
                }
                return renderError("Please refresh the page to wake up LexiLens.");
            }

            if (!response || response.error) {
                return renderError(response ? response.error : "Analysis failed.");
            }

            const results = response.results;
            if (results && results.error) {
                return renderError(results.error);
            }

            if (!results || !results.verdict) {
                return renderError("Analysis failed to produce results.");
            }

            currentData = results; 
            renderUI(results);
        });
    });
}

function renderUI(data) {
    // Hide Log on success to look clean, or keep it? Kept hidden if clean.
    // document.getElementById('debug-log').style.display = 'none';

    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.remove();

    const contentBox = document.getElementById('content-area');
    contentBox.innerHTML = "";
    contentBox.style.display = 'flex';
    contentBox.style.flexDirection = 'column';
    contentBox.style.gap = '16px';


    // --- A. VERDICT BOX ---
    const verdictBox = document.createElement('div');
    verdictBox.className = "verdict-box"; 

    if (data.verdict.color === 'red') verdictBox.classList.add('verdict-red');
    else if (data.verdict.color === 'orange') verdictBox.classList.add('verdict-orange');
    else verdictBox.classList.add('verdict-green');

    const icon = data.verdict.color === 'red' ? '⛔' : data.verdict.color === 'orange' ? '✋' : '✅';

    verdictBox.innerHTML = `
        <div class="verdict-icon">${icon}</div>
        <h2 class="verdict-title">${data.verdict.title}</h2>
        <p class="verdict-reason">${data.verdict.reason}</p>
    `;
    contentBox.appendChild(verdictBox);

    // --- B. LIST HEADER ---
    const listHeader = document.createElement('h3');
    listHeader.className = "list-header";
    listHeader.innerText = "Top 5 Things You Should Know";
    contentBox.appendChild(listHeader);

    // --- C. POINTS LIST ---
    const list = document.createElement('div');
    list.className = "points-list";

    data.points.forEach((point) => {
        const item = document.createElement('div');
        item.className = "point-card";

        let icon = "ℹ️";
        if (point.severity === 'CRITICAL') icon = "⚠️";
        if (point.severity === 'CAUTION') icon = "🔸";
        if (point.severity === 'SAFE') icon = "🛡️";

        // LANGUAGE LOGIC
        const explanationEnv = currentLang === 'hi' ? (point.explanation_hi || point.explanation) : (point.explanation_en || point.explanation);
        
        item.innerHTML = `
            <div class="point-icon">${icon}</div>
            <div class="point-content">
                <div class="point-title">${point.title}</div>
                <div class="point-explanation">${explanationEnv}</div>
                ${point.type ? `<span class="tag">${point.type}</span>` : ''}
            </div>
        `;
        list.appendChild(item);
    });
    contentBox.appendChild(list);

    // --- D. FOOTER ---
    const btn = document.createElement('button');
    btn.className = "rescan-btn";
    btn.innerText = "Rescan Page";
    btn.onclick = () => window.location.reload();
    contentBox.appendChild(btn);
}

function renderError(msg) {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.remove();

    const contentBox = document.getElementById('content-area');
    contentBox.innerHTML = `
        <div class="error-state">
            <span class="error-icon">😴</span>
            <h3 style="margin: 0; color: #374151;">LexiLens Result</h3>
            <p>${msg}</p>
        </div>
    `;
}
