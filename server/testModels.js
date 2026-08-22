import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  
  if (data.models) {
    const textModels = data.models
      .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
      .map(m => m.name.replace("models/", ""));
    console.log("Text generation models available:", textModels);
  } else {
    console.log("No models returned", data);
  }
}

run();
