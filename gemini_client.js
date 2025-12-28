/**
 * Gemini Client for LexiLens
 * Connects to Google's Gemini API for dynamic T&C Analysis.
 */

// ⚠️ REPLACE THIS WITH YOUR GEMINI API KEY
const API_KEY = "AIzaSyD15HqE5eJbbLiXmEc4YQuXx6plzxlNoew"; 

class GeminiAnalyzer {
    constructor() {
        // UPDATED MODEL: gemini-1.5-flash-latest (Confirmed available by diagnostic)
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    }

    async analyze(text) {
        if (!text || text.length < 50) return { error: "Text too short." };
        
        // --- VALIDATION REMOVED ---
        // I have removed the key check because it was causing confusion.
        // If the key is wrong, Google will just return an error, which we catch below.
        // --------------------------

        const prompt = `
        You are "LexiLens", a user advocate protecting people from bad legal terms.
        Analyze the following Terms & Conditions text.
        
        GOAL:
        1. Identify the 5 most important risks or weird clauses the user should know.
        2. Decide if the document is "Safe", "Caution", or "Not Recommended".
        
        OUTPUT FORMAT (Strict JSON only, no markdown):
        {
            "points": [
                {
                    "title": "Short Title (e.g. Data Selling)",
                    "explanation_en": "Simple explanation in English (Max 2-3 short sentences).",
                    "explanation_hi": "Same explanation in Hinglish (Roman Hindi) (Max 2-3 short sentences). Example: 'Ye point dangerous hai kyunki...'",
                    "severity": "CRITICAL" | "CAUTION" | "SAFE",
                    "type": "Data Risk" | "Money Risk" | "Legal Risk" | "User Rights"
                }
            ],
            "verdict": {
                "title": "Safe to Install" | "Install with Caution" | "Not Recommended",
                "color": "green" | "orange" | "red",
                "reason": "Short summary of why (e.g. 'Standard terms found' or 'Data selling detected')."
            }
        }

        RULES:
        - "CRITICAL": Data selling, hidden fees, zero liability, aggressive tracking.
        - "CAUTION": Arbitration, no refunds, standard data sharing.
        - "SAFE": Explicit user ownership, no data selling, privacy defaults.
        - Keep explanations CONCISE (2-3 lines max).
        - Ensure 'explanation_hi' is natural sounding Hinglish (not pure Hindi).
        
        TEXT TO ANALYZE:
        "${text.substring(0, 30000)}" 
        `; // Limit text to avoid token limits

        try {
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    // SAFETY SETTINGS: Prevent false blocking of legal text
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
                    ]
                })
            });

            const data = await response.json();
            
            if (data.error) {
                // If 404/403/500
                return { error: `Google API Error: ${data.error.message}` };
            }

            if (!data.candidates || data.candidates.length === 0) {
                 if (data.promptFeedback && data.promptFeedback.blockReason) {
                     return { error: `AI Blocked Data: ${data.promptFeedback.blockReason}` };
                }
                return { error: `AI No Candidates. Status: ${data.promptFeedback ? 'SafetyBlock' : 'Unknown'}` };
            }

            const rawText = data.candidates[0].content.parts[0].text;
            
            // Clean markdown if present
            const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(jsonStr);
            
            return result;

        } catch (error) {
            console.error("Gemini API Error:", error);
            return { error: `Analysis Error: ${error.message}` };
        }
    }
}

// Export
if (typeof window !== "undefined") {
    window.LexiLensAnalyzer = GeminiAnalyzer;
}
