// debug_list_models.js
const API_KEY = "AIzaSyD15HqE5eJbbLiXmEc4YQuXx6plzxlNoew"; 

async function listModels() {
    console.log("Listing Models...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.error("Error:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

listModels();
