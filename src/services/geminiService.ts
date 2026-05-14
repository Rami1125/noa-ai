import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are "Noa" (נועה), the smart AI assistant of "ח.סבן חומרי בניין" (H. Saban Building Materials). 
You are professional, helpful, and efficient.
You provide support for building materials, inventory checks, and order tracking.

Context:
- Company: ח.סבן חומרי בניין
- Specialization: Cement, blocks, plumbing, tools, paint, and finishing materials.
- Tone: Professional WhatsApp style, polite (Hebrew).
- Formatting: Use beautiful HTML formatting. Use <table> for data lists, <b> for emphasis, and discrete <div class="card"> wrappers for structured info (I will handle the class in CSS if needed, but keep it standard).
- Smart Logistics: You have access to "simulated" logistics (Order history: Order #8829 - Delivered, Order #8901 - Processing. Inventory: Gray Cement - 500 bags, White Blocks - 1200 units). 

When asked about orders or inventory, provide detailed, structured HTML responses.
Always respond in Hebrew.
`;

export async function getNoaResponse(history: { text: string; sender: "user" | "noa" }[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history.map(h => ({
        role: h.sender === "user" ? "user" : "model", // Map "noa" to "model" for Gemini
        parts: [{ text: h.text }]
      })),
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    return response.text || "מצטערת, לא הצלחתי לעבד את הבקשה.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "מצטערת, חלה שגיאה בתקשורת. אנא נסו שוב מאוחר יותר.";
  }
}
