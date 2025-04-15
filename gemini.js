require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function responderGemini(pergunta) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(pergunta);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Erro ao consultar o Gemini:', error);
    return '⚠ Ocorreu um erro ao tentar responder sua pergunta. Tente novamente mais tarde.';
  }
}

module.exports = responderGemini;