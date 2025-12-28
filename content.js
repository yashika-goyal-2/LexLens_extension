// content.js
// Runs on the webpage to detect and extract text

(function() {
    console.log("LexiLens: Content script loaded.");

    // --- 1. DETECTION LOGIC ---
    function isLegalPage() {
        const keywords = ['terms', 'privacy', 'policy', 'agreement', 'conditions', 'legal', 'tos', 'gdpr'];
        const url = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();

        // Check URL, Title, and H1
        const urlMatch = keywords.some(k => url.includes(k));
        const titleMatch = keywords.some(k => title.includes(k));
        
        let h1Match = false;
        const h1 = document.querySelector('h1');
        if (h1 && keywords.some(k => h1.innerText.toLowerCase().includes(k))) h1Match = true;

        if (urlMatch || titleMatch || h1Match) {
            console.log("LexiLens: Legal page detected.");
            return true;
        }
        return false;
    }

    // --- 2. EXTRACTION LOGIC ---
    function extractReadableText() {
        // A. Clone the body to avoid modifying the actual page
        const clone = document.body.cloneNode(true);

        // B. Remove Noise (Blacklist)
        const noiseTags = ['script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside', 'iframe', 'button', 'menu', 'form'];
        noiseTags.forEach(tag => {
            const elements = Array.from(clone.getElementsByTagName(tag));
            elements.forEach(el => el.remove());
        });

        // C. Target Content (Whitelist)
        const targetSelectors = 'p, li, section, article, h1, h2, h3, h4';
        const contentNodes = clone.querySelectorAll(targetSelectors);

        let extractedText = "";

        // D. Combine and Clean
        contentNodes.forEach(node => {
            let text = node.innerText.trim();
            if (text.length > 30) { 
                extractedText += text + "\n\n"; 
            }
        });

        return extractedText;
    }

    // --- 3. ANALYSIS & COMMUNICATION ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "analyzePage") {
            try {
                // Determine if RiskAnalyzer is available (injected via manifest)
                if (typeof LexiLensAnalyzer === 'undefined') {
                    // Fallback or error if injection failed
                    console.error("Risk Engine not loaded.");
                    sendResponse({ error: "Risk Engine missing" });
                    return;
                }

                const text = extractReadableText();
                const engine = new LexiLensAnalyzer();
                
                // ASYNC Call for Gemini (or partial async if using regex, but new client is async)
                Promise.resolve(engine.analyze(text))
                    .then(results => {
                        sendResponse({ results: results });
                    })
                    .catch(err => {
                        console.error("Analysis failed:", err);
                        sendResponse({ error: err.message || "Unknown error" });
                    });
                
                return true; // Indicates response will be sent asynchronously

            } catch (e) {
                console.error("Analysis failed:", e);
                sendResponse({ error: e.message });
            }
        }
        // Return true if we might answer async
        return true; 
    });

    // Auto-notify 
    if (isLegalPage()) {
        chrome.runtime.sendMessage({ action: "legalPageDetected" });
    }

})();
