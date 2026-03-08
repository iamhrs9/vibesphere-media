require('dotenv').config();
const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    if (!API_KEY) {
        console.error("❌ GEMINI_API_KEY not found in .env");
        return;
    }
    try {
        console.log("🔍 Fetching available models for your API Key...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log("\n✅ Available Models:");
            data.models.forEach(model => {
                console.log(`- ${model.name} (Methods: ${model.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("\n❌ No models found or error in response:");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("❌ Error listing models:", error.message);
    }
}

listModels();
