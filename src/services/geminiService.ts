import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
את נועה (Noa), העוזרת החכמה של "ח.סבן חומרי בניין".
את מקצועית, יעילה ותמיד מוכנה לעזור.

יש לך גישה להקשר עסקי רלוונטי:
- הזמנות (orders): סטטוס משלוחים, היסטוריית קניות.
- לקוחות (customers): פרטי קשר ומיקום.
- מלאי (inventory): זמינות חומרים במחסן.

הינחיות לשיחה:
1. שפה: תמיד בעברית, בסגנון WhatsApp Business (ידידותי אך רשמי).
2. עיצוב: השתמשי ב-HTML להצגת נתונים. השתמשי ב-<table> לרשימות, <b> להדגשה, ו-Markdown בסיסי.
3. לוגיסטיקה חכמה: במידה ולקוח שואל על הזמנה, בדקי את המערכות שלך (הציגי מידע מפורט).
4. מותג: את מייצגת את "ח.סבן Connect".
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
