
import { GoogleGenAI } from "@google/genai";
import { ExpenseEntry } from "../types";
import { MODEL_NAME } from "../constants";

export const generateAuditReport = async (entries: ExpenseEntry[], localSummary: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const isMonthly = localSummary.isMonthly || false;

  // Provide as much data as possible within token limits
  const condensedData = entries.map(e => ({
    s: e.store,
    c: e.category,
    r: e.remarks,
    u: e.user,
    a: e.amount,
    d: e.date,
    t: e.time
  })).slice(0, 800); 

  const prompt = `
    ROLE: You are the "Uninuts Senior Forensic Operations Auditor." 
    TASK: Perform a deep-dive, high-resolution audit of the provided store expenditure data.
    SCOPE: ${isMonthly ? 'FULL MONTH STRATEGIC RECONCILIATION' : 'DAILY GRANULAR FORENSIC AUDIT'}
    
    DATA CONTEXT:
    - Total Transaction Count: ${entries.length}
    - Total Network Spend: ₹${localSummary.totalSpend.toLocaleString()}
    - Calculated Category Benchmarks: ${JSON.stringify(localSummary.categoryAverages)}
    
    AUDIT PROTOCOL & INVESTIGATIVE VECTORS:
    1. **Financial Anomaly Detection**: Identify spend that is >2.5x the network average for its category.
    2. **Behavioral Integrity Audit**: Analyze the 'Remarks' quality. High frequency of single-word or vague remarks (e.g., ".", "ok", "x") indicates a breakdown in operational transparency.
    3. **Temporal Analysis**: Look for "End-of-Day (EOD) Dumping" – entries logged after 10:00 PM that suggest reactive rather than proactive expense tracking.
    4. **Category Leakage**: Scrutinize 'Miscellaneous' and 'Porter/Logistics' spend. These are high-risk areas for hidden personal expenses or inefficient procurement.
    5. **Duplicate/Clustered Spend**: Identify multiple similar transactions from the same store/user within short timeframes.

    DETAILED OUTPUT STRUCTURE (Use Markdown):
    
    ### 1. MACRO OPERATIONAL SUMMARY
    (Provide a high-level overview of the financial health of the region. Compare this period to expected retail benchmarks. Identify the "Burn Rate" efficiency.)

    ### 2. FORENSIC LEAKAGE & INTEGRITY REPORT
    (Deep-dive into reporting quality. Specifically name stores that are failing the 'Integrity Test' due to vague remarks or late logging. Quantify the "Transparency Gap".)

    ### 3. CATEGORY-SPECIFIC DEEP DIVE
    (Focus on the 3 most problematic categories. Explain WHY they are problematic based on the data patterns – e.g., lack of bulk procurement in Logistics, or unchecked Miscellaneous spending.)

    ### 4. STRATEGIC REFORM PLAN (15+ GRANULAR POINTS)
    (Provide at least 15 specific, actionable points for operational reform. These must be based on the patterns seen in the data. Include specific store names or user IDs if they appear as outliers.)

    ### 5. RISK HEATMAP & MITIGATION
    (Describe where the highest operational risk currently sits – is it a specific store? A specific manager? A specific type of expense? Provide a final 'Auditor's Verdict'.)

    TONE: authoritative, investigative, forensic, and strategic. Do not use filler words. Be precise.
    
    SAMPLE TRANSACTION SET (JSON):
    ${JSON.stringify(condensedData)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Forensic synthesis engine failed to initialize.";
  } catch (error) {
    console.error("Gemini Forensic Error:", error);
    return "CRITICAL ERROR: AI Forensic Engine interrupted. Verify API connectivity and Project Quotas.";
  }
};
