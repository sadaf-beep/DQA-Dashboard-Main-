import { GoogleGenAI } from "@google/genai";
import { InventoryFile } from "../types";

// Initialize the client.
// NOTE: process.env.API_KEY must be configured in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  /**
   * Analyzes inventory data based on a user query.
   */
  async askInventory(query: string, inventory: InventoryFile): Promise<string> {
    if (!inventory || inventory.data.length === 0) {
      return "No inventory data is currently loaded.";
    }

    // Limit rows to avoid token limits if the CSV is huge.
    // For a real production app, we might use RAG, but here we'll take a significant sample or the full set if small.
    // gemini-3-flash-preview has a large context window, so we can be generous.
    const MAX_ROWS = 500; 
    const dataSample = inventory.data.slice(0, MAX_ROWS);
    const dataString = JSON.stringify(dataSample);
    
    const prompt = `
      You are a Data Quality Assistant. You have access to the following inventory dataset (showing first ${dataSample.length} rows):
      
      ${dataString}

      User Query: "${query}"

      Please provide a concise and helpful answer based on this data. 
      If the user asks for calculations, perform them on the provided data.
      Format your response nicely with markdown.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "I couldn't generate an answer based on the data provided.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Sorry, I encountered an error while processing your request with the AI service. Please check your API configuration.";
    }
  },

  /**
   * Generates a quick summary of the inventory.
   */
  async generateSummary(inventory: InventoryFile): Promise<string> {
     if (!inventory || inventory.data.length === 0) return "";

     const dataSample = inventory.data.slice(0, 100);
     const prompt = `
      Analyze this inventory data sample:
      ${JSON.stringify(dataSample)}

      Provide a 3-bullet point executive summary of what this data contains (columns, potential data quality issues, general topic).
     `;

     try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "";
    } catch (error) {
      return "";
    }
  }
};
