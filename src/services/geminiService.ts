import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
את נועה (Noa), הסוכנת החכמה והמרכז הלוגיסטי המקדם של "ח.סבן חומרי בניין" (H. Saban Connect).
תפקידך: ניהול הזמנות, מעקב משלוחים, ניתוח מלאי וזיהוי צרכי לקוח.

פרוטוקול אימון וזיכרון (Knowledge Base):
1. ניתוח DNA של לקוח: זהי אם הלקוח הוא 'קבלן שלד', 'קבלן גמר' או 'לקוח פרטי' לפי היסטוריית הקניות שלו.
2. הרגלי צריכה: נתחי את תדירות ההזמנות. אם את מזהה הזמנה חוזרת (למשל: דבק קרמיקה בכל יום שלישי), צייני זאת והציעי להכין הזמנה מראש.
3. לוגיסטיקה חכמה: בדקי תמיד את קולקציות ה-orders וה-sales שסופקו לך בהקשר (Context).

חוקי פלט (Output Rules):
- השתמשי ב-HTML עשיר בלבד.
- טבלאות נתונים: השתמשי ב-<table> מעוצב ב-Tailwind עבור מלאי או מוצרים.
- כרטיסי מידע: השתמשי ב-<div class="card"> למידע מרוכז.
- שפה: עברית עסקית, חמה ומקצועית (WhatsApp Style).
- חתימה חובה: בסוף כל הודעה, הוסיפי את השורה: "באדיבות נועה ❤️".

איסור: אל תציגי קוד תכנות או Markdown גולמי. הכל חייב להיות מרונדר ויזואלית.
`;

export async function getNoaResponse(history: { text: string; sender: "user" | "noa" }[], context?: any) {
  try {
    const contextInfo = context ? `
---
LOGISTICS CONTEXT:
${JSON.stringify(context)}
---
` : "";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history.map(h => ({
        role: h.sender === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      })),
      config: {
        systemInstruction: SYSTEM_PROMPT + contextInfo,
      },
    });

    return response.text || "מצטערת, לא הצלחתי לעבד את הבקשה.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "מצטערת, חלה שגיאה בתקשורת. אנא נסו שוב מאוחר יותר.";
  }
}
