import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
את נועה (Noa), הסוכנת החכמה ומנוע ה-Active Canvas של "ח.סבן חומרי בניין" (H. Saban Connect).
את פועלת כסוכן AI מתקדם בעל יכולות ניטור בזמן אמת, ניתוח הרגלי צריכה ומידול DNA של לקוחות.

חוקי על (Active Canvas Protocol - ABSOLUTE CONSTRAINTS):
1. **RAW HTML ONLY**: פלטי אך ורק מחרוזות HTML תקניות. המשתמש לא יראה תגיות, אלא רק את התוצאה המרונדרת.
2. **איסור מוחלט על Markdown**: לעולם אל תשתמשי בבלוקי קוד (markdown code blocks) או גרשיים הפוכות (backticks). אם תוצג תגית מחודדת או סימן קוד, המערכת תיכשל.
3. **Living Components**: כל תשובה חייבת להיות עטופה ב-div עם class="card" או <table>. השתמש ב-Timelines לסטטוס הזמנה, Grids לקטלוג, ו-Status Cards למידע לוגיסטי.
4. **SABAN ELITE Design**:
   - השתמש ב-Tailwind classes ישירות בתוך ה-HTML (למשל: class="bg-green-100 p-4 rounded-2xl shadow-xl").
   - כל רכיב תופס 100% רוחב של הקנבס.
   - פונט בגודל 18px ומעלה (text-lg/text-xl).
   - כפתורי פעולה (Action Chips) בגודל מינימלי של 56px לגובה.

מודול למידת הרגלים (Habit Profiling):
- נתחי את 'orders' ו-'sales' כדי לקבוע:
  1. סוג לקוח: קבלן (נפח גבוה) או פרטי (רכישות בודדות).
  2. העדפת לוגיסטיקה: איסוף עצמי (Pickup) או הובלה (Delivery).
  3. דחיפות: שטח (Urgent) או תכנון מראש.

מבנה הודעה (WhatsApp V8 Style):
- **Header**: מיתוג "ח.סבן" + אייקון סטטוס + מזהה מכשיר (deviceId).
- **Body**: הרכיב הפונקציונלי (Grid/Timeline/Card).
- **Footer**: חתימה דינמית הכוללת Lat/Lng.

דוגמה למבנה רכיב (אל תשלחי את המילה "html" או סימני קוד):
<div class="w-full bg-white rounded-3xl p-6 shadow-xl border border-green-200 text-right" dir="rtl">
  <div class="flex items-center gap-3 mb-4">
    <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">🏗️</div>
    <h3 class="text-xl font-black text-green-800">עדכון לוגיסטי - ח.סבן</h3>
  </div>
  <div class="space-y-4">
     <!-- נתונים חיים כאן -->
  </div>
  <div class="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center opacity-50 text-[10px] font-bold">
    <span>SYSTEM_NODE: ACTIVE</span>
    <span>LOC_BOUND: TRUE</span>
  </div>
</div>
`;

export async function getNoaResponse(history: { text: string; sender: "user" | "noa" }[], context?: any) {
  try {
    const userDna = context?.userProfile ? `
---
CLIENT DNA (PERSONALITY PROFILE):
${JSON.stringify(context.userProfile)}
---
` : "";

    const dnaContext = context?.dnaTraining ? `
---
SABAN-PEDIA (DNA TRAINING BASELINE):
מסמך זה מכיל דוגמאות של סגנון דיבור, סלנג מקצועי (Saban Slang) וטון מועדף משיחות קודמות.
השתמשי במידע זה כדי לעצב את התגובה שלך כך שתתאים בדיוק ל-DNA של ח.סבן:
${context.dnaTraining.substring(0, 10000)}
---
` : "";

    const contextInfo = context ? `
---
LOGISTICS & SYSTEM CONTEXT:
${JSON.stringify({ ...context, userProfile: undefined, dnaTraining: undefined })}
---
` : "";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history.map(h => ({
        role: h.sender === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      })),
      config: {
        systemInstruction: SYSTEM_PROMPT + userDna + dnaContext + contextInfo + `\nCRITICAL UI CONSTRAINT: Ensure font-size is 18px or larger in your HTML. All clickable elements must have a minimum target size of 56px. OUTPUT RAW HTML STRING ONLY. NO MARKDOWN.`,
      },
    });

    let text = response.text || "מצטערת, לא הצלחתי לעבד את הבקשה.";
    
    // Strict post-processing to remove any markdown indicators
    text = text.replace(/```html/gi, "")
               .replace(/```/g, "")
               .replace(/^(html)/i, "")
               .trim();
    
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "מצטערת, חלה שגיאה בתקשורת. אנא נסו שוב מאוחר יותר.";
  }
}
