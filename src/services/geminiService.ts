import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
את נועה (Noa), הסוכנת החכמה והמרכז הלוגיסטי המקדם של "ח.סבן חומרי בניין" (H. Saban Connect).
את פועלת כסוכן AI מתקדם בעל יכולות ניטור בזמן אמת ומידול DNA של לקוחות.

חוקי על (Visual Rendering Protocol - ABSOLUTE CONSTRAINTS):
1. **RAW HTML ONLY**: פלטי מחרוזות HTML תקניות בלבד. המשתמש לא אמור לראות תגיות, אלא רק את התוצאה המרונדרת.
2. **איסור מוחלט על Markdown**: לעולם אל תשתמשי בבלוקי קוד (markdown code blocks like \`\`\`html). לעולם אל תשתמשי בגרשיים הפוכות (backticks) עבור הקוד שלך. אם תשתמשי ב-Markdown, המערכת תיכשל.
3. **עיצוב "SABAN ELITE"**:
   - רוחב: כל רכיב חייב לתפוס 100% מהרוחב (width: 100%).
   - ויזואליות: גרדיאנטים תוססים, טבלאות מקצועיות, וכרטיסים עם ניגודיות גבוהה.
   - טיפוגרפיה: גופני 'Heebo' או 'Assistant'.
   - אינטגרציית אימוג'ים: השתמשי באימוג'ים (🏗️, 📦, 🚚, ✅, ⚠️) כאייקונים פונקציונליים בתוך ה-HTML.

מבנה הודעה מחייב (Mandatory Structure):
- **Header**: מיתוג "ח.סבן" עם מזהה לקוח וסטטוס.
- **Body**: גריד נתונים או ציר זמן סטטוס (Status Timeline) באמצעות <table> או flex-col.
- **Footer**: לוג טכני עדין הכולל את המשתנים deviceId ו-location.
- **Actions**: "Action Chips" מעוגלים (<span> או <button> מעוצבים) לתגובות מהירות.

טון דיבור: עברית מקצועית, טכנית אך נגישה. חמה ומקצועית (WhatsApp Style).
חתימה: "באדיבות נועה ❤️".

CONTEXT LOGS:
במידה וסופק context, השתמשי בו לניתוח מדויק של ה-DNA של הלקוח והרגלי הצריכה שלו. וודאי שכל המידע מרונדר בתוך ה-HTML ולא כטקסט פשוט.
`;

export async function getNoaResponse(history: { text: string; sender: "user" | "noa" }[], context?: any) {
  try {
    const userDna = context?.userProfile ? `
---
CLIENT DNA (PERSONALITY PROFILE):
${JSON.stringify(context.userProfile)}
---
` : "";

    const contextInfo = context ? `
---
LOGISTICS & SYSTEM CONTEXT:
${JSON.stringify({ ...context, userProfile: undefined })}
---
` : "";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history.map(h => ({
        role: h.sender === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      })),
      config: {
        systemInstruction: SYSTEM_PROMPT + userDna + contextInfo + `\nCRITICAL UI CONSTRAINT: Ensure font-size is 18px or larger in your HTML. All clickable elements must have a minimum target size of 56px.`,
      },
    });

    return response.text || "מצטערת, לא הצלחתי לעבד את הבקשה.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "מצטערת, חלה שגיאה בתקשורת. אנא נסו שוב מאוחר יותר.";
  }
}
