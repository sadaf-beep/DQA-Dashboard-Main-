import { InventoryFile } from "../types";
import { supabase } from "./storageService";

// All Gemini calls are proxied through the gemini-proxy edge function so the
// API key never ships in the client bundle. See
// supabase/functions/gemini-proxy/index.ts.

const invokeGemini = async (body: { mode: 'ask' | 'summary'; query?: string; data: unknown[] }): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', { body });
  if (error) {
    console.error("Gemini proxy error:", error);
    return "Sorry, I encountered an error while processing your request with the AI service. Please check your API configuration.";
  }
  if (data?.error) {
    console.error("Gemini proxy returned error:", data.error);
    return "Sorry, I encountered an error while processing your request with the AI service. Please check your API configuration.";
  }
  return data?.text || "";
};

export const geminiService = {
  /**
   * Analyzes inventory data based on a user query.
   */
  async askInventory(query: string, inventory: InventoryFile): Promise<string> {
    if (!inventory || inventory.data.length === 0) {
      return "No inventory data is currently loaded.";
    }
    const text = await invokeGemini({ mode: 'ask', query, data: inventory.data });
    return text || "I couldn't generate an answer based on the data provided.";
  },

  /**
   * Generates a quick summary of the inventory.
   */
  async generateSummary(inventory: InventoryFile): Promise<string> {
    if (!inventory || inventory.data.length === 0) return "";
    return invokeGemini({ mode: 'summary', data: inventory.data });
  }
};
