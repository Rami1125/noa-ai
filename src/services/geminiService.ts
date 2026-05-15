import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
את נועה (Noa), הסוכנת החכמה, מנוע ה-Active Canvas והמוח התפעולי של "ח.סבן חומרי בניין" (SabanOS V31).
את המוח שמאחורי הלוגיסטיקה, הרכש וניהול ה-DNA המשפחתי.

Commander Rami הוא הסמכות הבלעדית (Commander-in-Chief). 
Harel Idelston הוא המנכ"ל (CEO) עם שליטה אקזקיוטיבית מלאה.

חוקי על (Operational Brain Protocol - SabanOS V31):
1. **Saban-Precision**: הטון שלך מהיר, מונע נתונים וטכני. אין מקום לדיבורים מיותרים.
2. **SIDDUR LOGIC**: כל הזמנה חייבת להיות משויכת למחסן (החרש או התלמיד) ולנהג (Hikmat, Ali, או אחרים שמופיעים במערכת).
3. **DRIVE INTELLIGENCE**: ניתוח קבצים (PDF/וכו') מתבצע אוטומטית לחילוץ לקוח, אתר בנייה ורשימת פריטים.
4. **RAW HTML ONLY**: תפוקת התוכן שלך היא אך ורק HTML נקי ומעוצב ל-WhatsApp (Mobile-Compact).
5. **UI STABILITY**: השתמשי בפונטים בגודל 18px+, כפתורים בגודל 56px+.

המטרות שלך:
- סנכרון לוגיסטי מושלם.
- Oversight למנכ"ל הראל.
- נאמנות מוחלטת למשפחת סבן.
`;

// Tool Definitions
const createOrder: FunctionDeclaration = {
  name: "create_order",
  description: "Create a new order in the Siddur system. Requires warehouse and driver assignment.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      customer: { type: Type.STRING },
      site: { type: Type.STRING },
      items: { 
        type: Type.ARRAY, 
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            qty: { type: Type.NUMBER }
          }
        }
      },
      warehouse: { type: Type.STRING, enum: ["החרש", "התלמיד"] },
      driver: { type: Type.STRING }
    },
    required: ["customer", "site", "items", "warehouse", "driver"]
  }
};

const updateOrder: FunctionDeclaration = {
  name: "update_order",
  description: "Update status or details of an existing order.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      orderId: { type: Type.STRING },
      status: { type: Type.STRING }
    },
    required: ["orderId", "status"]
  }
};

const getOrdersByDate: FunctionDeclaration = {
  name: "get_orders_by_date",
  description: "Retrieve orders for a specific date.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" }
    },
    required: ["date"]
  }
};

const planOptimizedRoute: FunctionDeclaration = {
  name: "plan_optimized_route",
  description: "Calculate the fastest delivery route for a driver.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      driver: { type: Type.STRING },
      date: { type: Type.STRING }
    },
    required: ["driver", "date"]
  }
};

const predictOrderEta: FunctionDeclaration = {
  name: "predict_order_eta",
  description: "Predict Estimated Time of Arrival for an order based on current traffic and queue.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      orderId: { type: Type.STRING }
    },
    required: ["orderId"]
  }
};

const getInventory: FunctionDeclaration = {
  name: "get_inventory",
  description: "Get real-time stock levels for building materials."
};

const analyzePdfContent: FunctionDeclaration = {
  name: "analyze_pdf_content",
  description: "Extract structured data from a PDF file in Google Drive.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileId: { type: Type.STRING }
    },
    required: ["fileId"]
  }
};

export const sabanTools = [
  { 
    functionDeclarations: [
      createOrder, updateOrder, getOrdersByDate, planOptimizedRoute,
      predictOrderEta, getInventory, analyzePdfContent
    ] 
  }
];

export async function getNoaResponse(history: { text: string; sender: "user" | "noa" }[], context?: any) {
  try {
    const userDna = context?.userProfile ? `
---
CLIENT DNA:
Identity: ${JSON.stringify(context.userProfile)}
Role Authority: ${context.userProfile.name === "Rami" || context.userProfile.name === "רמי" ? "SOLE AUTHORITY / COMMANDER" : "OPERATIONAL USER"}
---
` : "";

    const contextInfo = context ? `
---
SYSTEM CONTEXT:
${JSON.stringify({ ...context, userProfile: undefined, dnaTraining: undefined })}
---
` : "";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: history.map(h => `${h.sender === "user" ? "USER" : "NOA"}: ${h.text}`).join("\n") }]
        }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT + userDna + contextInfo + `\nADDRESSING RULES: 
- Rami: "אחי היקר" or "Commander".
- Harel: "המנכ"ל הראל".
MANDATORY FOOTER: SABAN-OS V31 | OPERATIONAL BRAIN: LOCKED | LOC: ${context?.location?.lat || 0},${context?.location?.lng || 0}`,
        tools: sabanTools,
      },
    });

    let text = response.text || "";
    text = text.replace(/```html/gi, "").replace(/```/g, "").replace(/^(html)/i, "").trim();
    
    return {
      text: text || "מעבד נתונים לוגיסטיים...",
      functionCalls: response.functionCalls
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "מצטערת, חלה שגיאה בתקשורת. המערכת בטעינה מחדש.",
      functionCalls: undefined
    };
  }
}
