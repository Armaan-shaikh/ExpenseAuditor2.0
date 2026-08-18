# Backend Technical Documentation: Forensic Expense Auditor AI Agent

## 1. System Objective

The **Forensic Expense Auditor AI Agent** is an automated backend intelligence and financial reconciliation engine designed to audit, detect leakage, assess operational integrity, and identify anomalies across decentralized multi-unit retail and commercial store networks.

### Core Technical Problems Solved

- **High-Volume Tabular Ingestion & In-Memory Parsing**: Ingestion and normalization of unstandardized retail transaction spreadsheets (XLSX) containing thousands of operational expense records without requiring database-heavy ETL pipelines.
- **Deterministic Heuristic Anomaly Detection**: Algorithmic scoring of financial irregularities, including End-of-Day (EOD) expense dumping, unclassified expense masking (miscellaneous category leakage), micro-transaction clustering, and data non-compliance.
- **Behavioral & Data Integrity Profiling**: Real-time evaluation of logging quality and staff accountability using automated regex pattern analysis against lazy, vague, or non-compliant bookkeeping remarks.
- **Token-Optimized LLM Forensic Synthesis**: Semantic compression of tabular transaction batches into high-density JSON structures, combined with calculated network-level statistical baselines, for consumption by the Gemini generative AI model.
- **Strategic Reform & Remediation Generation**: Automated generation of deep forensic audit reports, prioritized operational risk rankings, store-level intervention roadmaps, and targeted audit-ready sub-datasets.

---

## 2. Architecture & Integrations (Tools & APIs)

The backend agent pipeline operates as a modular, high-performance data processing architecture composed of parsing layers, statistical evaluation engines, generative AI orchestration, and binary serialization utilities.

```
[Raw Spreadsheet (.xlsx)] 
           │
           ▼
┌──────────────────────────────────────────────┐
│  1. Ingestion & Normalization Layer          │
│     (xlsx / ArrayBuffer / Serial Converter)   │
└──────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  2. Deterministic Heuristic Engine           │
│     • Category Benchmarking                  │
│     • Regex Behavioral Filtering             │
│     • Temporal & EOD Cluster Detection       │
│     • 20+ Frequency Anomaly Aggregation     │
└──────────────────────────────────────────────┘
           │
           ├──────────────────────────────┐
           ▼                              ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ 3. Gemini Forensic Agent     │   │ 4. Specialized Binary Export │
│    • Schema Minification     │   │    • Required Invoices (>=100)│
│    • Context Window Packing  │   │    • Non-Compliant Entries   │
│    • Multi-Vector Prompting  │   │    • Patternized Datasets    │
│    • Model: gemini-3.5-flash │   │    (xlsx Serialization)      │
└──────────────────────────────┘   └──────────────────────────────┘
           │                              │
           ▼                              ▼
  [Raw Forensic Markdown]          [Exported XLSX Workbooks]
```

### Integrated Systems & Functional Roles

| Component / Tool | Type | Functional Role |
| :--- | :--- | :--- |
| **`@google/genai` (Google GenAI SDK)** | External LLM API | Interfaces with the Gemini foundation model family (`gemini-3.5-flash`) to generate structured forensic audit narratives, operational risk heatmaps, and strategic remediation plans. |
| **`xlsx` (SheetJS)** | Internal Binary Parser / Serializer | Reads raw binary `ArrayBuffer` input streams, translates Excel worksheet cells into JSON row records, computes serial dates, and constructs binary Excel workbooks for forensic audit exports. |
| **Deterministic Statistical Engine** | Internal Computational Module | Computes network category averages, variance baselines, store-level risk scores, and aggregates high-frequency repetitive transaction patterns. |
| **Regex Pattern Classification Engine** | Internal Rule Engine | Executes regular expression matching against `LAZY_REMARK_PATTERNS` to score operator compliance and documentation fidelity. |
| **Environment Configuration (`Vite define` / `loadEnv`)** | Security & Config | Safely injects and resolves `process.env.API_KEY` / `process.env.GEMINI_API_KEY` credentials at runtime for authenticated API calls. |

---

## 3. Input Specification

The backend ingestion layer accepts binary Excel spreadsheet files and transforms them into strictly typed in-memory data structures.

### 3.1 Raw File Input (Binary Layer)

- **MIME Types**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`
- **File Format**: Standard Office Open XML Spreadsheet (`.xlsx`)
- **Binary Structure**: Ingested as a browser/Node `ArrayBuffer` or `Uint8Array`.

### 3.2 Expected Spreadsheet Column Schema

The parser expects a header row at index `0` followed by tabular records adhering to the following 0-indexed column structure:

| Index | Column Header | Expected Type | Description |
| :---: | :--- | :--- | :--- |
| `0` | Expense ID | `string \| number` | Unique identifier for the expense transaction |
| `1` | Store | `string` | Retail outlet / store location identifier |
| `2` | Category Name | `string` | Categorical classification (e.g., Logistic, Repair, Stationary) |
| `3` | Remarks | `string` | Free-text operational description provided by logging user |
| `4` | User | `string` | Identifier/name of the staff member logging the transaction |
| `5` | Date | `string \| number` | Date string (`YYYY-MM-DD`, `DD/MM/YYYY`) or Excel serial number |
| `6` | Time | `string` | Time of entry in 24-hour format (`HH:mm` or `HH:mm:ss`) |
| `7` | Total Amount | `number \| string` | Numerical transaction expenditure in local currency |

### 3.3 Intermediate Normalized In-Memory Schema (`ExpenseEntry`)

```typescript
export interface ExpenseEntry {
  expenseId: string; // Sanitized string representation of the transaction ID
  store: string;     // Store name or store code
  category: string;  // Standardized expense category
  remarks: string;   // Raw remark text
  user: string;      // User identifier
  date: string;      // Formatted date string (normalized from serial if necessary)
  time: string;      // Formatted time string
  amount: number;    // Floating point numerical value
}
```

### 3.4 Context & Operational State Payload

When invoking the AI Forensic Agent (`generateAuditReport`), the backend supplies the entries alongside an operational context object:

```typescript
interface AuditExecutionPayload {
  entries: ExpenseEntry[];
  localSummary: {
    totalSpend: number;
    categoryAverages: Record<string, number>;
    flaggedEntries: ExpenseEntry[];
    isMonthly: boolean; // Flag indicating daily granular vs. monthly strategic mode
  };
}
```

---

## 4. Analysis & Core Processing Logic

The agent execution pipeline executes in five sequential phases:

```
┌───────────────────────────┐
│ 1. Binary Ingestion & ETL │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 2. Statistical Baseline   │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 3. Heuristic Risk Scoring │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 4. Token Compression & AI │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 5. Report & Data Exports  │
└───────────────────────────┘
```

### Phase 1: Ingestion & Normalization (`services/excelParser.ts`)

1. **ArrayBuffer Conversion**: The incoming binary file is read via `FileReader.readAsArrayBuffer` and cast to `Uint8Array`.
2. **Sheet Extraction**: `XLSX.read(data, { type: 'array' })` parses the workbook; the primary worksheet at `workbook.SheetNames[0]` is selected.
3. **Row Matrix Transformation**: `XLSX.utils.sheet_to_json(worksheet, { header: 1 })` extracts rows as 2D arrays (`any[][]`).
4. **Header Stripping & Row Filtering**: Row `0` is discarded. Rows lacking an `Expense ID` (col `0`) or `Store` (col `1`) are filtered out.
5. **Serial Date Normalization**: If column `5` is a numeric Excel timestamp, it is normalized via `XLSX.utils.format_cell({ v: row[5], t: 'd' })`.
6. **Type Casting & Sanitization**: Strings are trimmed and coerced; amounts are parsed with `parseFloat(row[7]) || 0`.

### Phase 2: Deterministic Metrics & Statistical Baselines

The engine computes network-wide metrics in a single $O(N)$ pass over all parsed entries:

- **Total Network Spend**:
  $$\text{TotalSpend} = \sum_{i=1}^{N} \text{amount}_i$$
- **Store-Level Aggregations**:
  For each store $s \in S$, the system tracks total expenditure, entry count, category spend distributions, lazy remark occurrences, late-night entries, and miscellaneous spend.
- **Category Benchmark Averages**:
  $$\text{Benchmark}_{\text{cat}} = \frac{\sum_{e \in E_{\text{cat}}} \text{amount}_e}{|S|}$$
  Where $|S|$ is the count of unique stores in the dataset.

### Phase 3: Behavioral Pattern Detection & Risk Classification

#### 1. Regex Behavioral Integrity Audit
Remarks are evaluated against a collection of non-compliance regular expressions:
```typescript
export const LAZY_REMARK_PATTERNS = [
  /^[\.\,\s\-_]*$/, // Empty, whitespace, dots, commas, hyphens
  /^test$/i,        // Test entries
  /^w$/i,           // Single letter placeholders
  /^,,,$/,          // Punctuation strings
  /^none$/i,        // Non-descriptive declarations
  /^nil$/i,
  /^ok$/i,
  /^done$/i,
  /^x$/i
];
```
An entry is flagged as non-compliant if `LAZY_REMARK_PATTERNS.some(regex => regex.test(remarks.trim()))`.

#### 2. Temporal Analysis (End-of-Day Dumping)
Entries logged at or after 10:00 PM are flagged as potential reactive end-of-day dumps:
$$\text{isLate} = \text{parseInt}(\text{time.split(':')[0]}) \ge 22$$

#### 3. Store Risk Classification Matrix
Stores are assigned a composite risk score based on quantitative ratios:
- $\text{lazyRatio} = \frac{\text{lazyCount}}{\text{entryCount}}$
- $\text{lateRatio} = \frac{\text{lateCount}}{\text{entryCount}}$
- $\text{miscPct} = \frac{\text{miscSpend}}{\text{totalSpend}}$

```
IF (lazyRatio > 0.4) OR (lateRatio > 0.5 AND lazyRatio > 0.2) OR (miscPct > 0.15):
    RiskLevel = "High"
    RiskReason = [Critical data integrity issues | Suspicious financial activity | Systematic EOD dumping]
ELSE IF (lazyRatio > 0.15) OR (lateRatio > 0.3) OR (lazyCount > 3):
    RiskLevel = "Medium"
    RiskReason = [Inconsistent documentation quality | Delayed reporting patterns]
ELSE:
    RiskLevel = "Low"
    RiskReason = "Consistent reporting and high data integrity."
```

#### 4. High-Frequency Repetitive Spending Pattern Detection ($\ge 20\times$)
The engine groups entries by composite tuple `(store, category)`. For each group, an amount frequency histogram is built. If any specific amount occurs $\ge 20$ times, the pattern is isolated:
$$\text{Frequency}(\text{store}, \text{category}, \text{amount}) \ge 20 \implies \text{Flagged as Systematic Micro-spend}$$

#### 5. Critical Outlier Isolation Rules
Transactions matching any of the following boundary rules are flagged as critical operational anomalies:
- $\text{Amount} > 5,000$: Exceeds single-transaction operational limits.
- $\text{Amount} > 1,500 \land \text{isLazy}$: High-value spend with documentation compliance failure.
- $\text{Amount} > 2,000 \land \text{isLate}$: High-value unverified end-of-day dump.
- $\text{Category} = \text{"Miscellaneous"} \land \text{Amount} > 1,000$: High-value unclassified leakage.

### Phase 4: Token Optimization & LLM Orchestration (`services/geminiAudit.ts`)

To maximize context utility within LLM token constraints, the agent executes data compression prior to dispatching prompts to the Gemini model:

1. **Payload Minification (Tuple Key Mapping)**:
   Verbose object keys are compressed into single-character keys:
   ```json
   {
     "s": "Store_Alpha",
     "c": "Porter",
     "r": "goods moving",
     "u": "Manager_1",
     "a": 450,
     "d": "2026-08-15",
     "t": "14:20"
   }
   ```
2. **Context Window Slicing**: The transaction array is sliced to a maximum of 800 dense records (`entries.slice(0, 800)`).
3. **Forensic Prompt Synthesis**:
   - **System Persona**: `Uninuts Senior Forensic Operations Auditor`.
   - **Scope Parameterization**: Adapts instructions between `FULL MONTH STRATEGIC RECONCILIATION` and `DAILY GRANULAR FORENSIC AUDIT`.
   - **Context Injection**: Injects Total Network Spend, Category Benchmark averages, and the compressed transaction JSON payload.
   - **Investigative Vectors**:
     - *Vector 1*: Spend $>2.5\times$ network category benchmark.
     - *Vector 2*: Behavioral integrity and remarks transparency gap.
     - *Vector 3*: EOD transaction dumping patterns.
     - *Vector 4*: Miscellaneous & Porter/Logistics procurement leakage.
     - *Vector 5*: Duplicate and clustered micro-spend.
4. **Model Execution**:
   Calls `ai.models.generateContent({ model: 'gemini-3.5-flash', contents: prompt })` via the Google GenAI SDK.
5. **Fault Recovery**: Intercepts network/quota exceptions and returns structured fallback error messages without crashing the runtime.

---

## 5. Output Specification

The agent backend produces three distinct forms of raw outputs:

### 5.1 Raw LLM Audit Report Output (Markdown Payload)

The Gemini engine returns a raw Markdown string structured according to a strict five-tier forensic hierarchy:

```markdown
### 1. MACRO OPERATIONAL SUMMARY
- Financial health assessment of the store network.
- Burn rate efficiency metrics compared to regional retail benchmarks.

### 2. FORENSIC LEAKAGE & INTEGRITY REPORT
- Identification of non-compliant stores failing data integrity standards.
- Quantification of the "Transparency Gap" (lazy remark ratios, late logging).

### 3. CATEGORY-SPECIFIC DEEP DIVE
- Root-cause analysis of the top 3 high-risk spending categories.
- Analysis of unbundled micro-procurement vs. centralized vendor contracts.

### 4. STRATEGIC REFORM PLAN (15+ GRANULAR POINTS)
- Minimum of 15 targeted, store-specific and network-wide corrective actions.
- Specific store identifiers and personnel accountability recommendations.

### 5. RISK HEATMAP & MITIGATION
- Risk concentration mapping (store, manager, or expense category level).
- Final Auditor's Verdict.
```

### 5.2 Structured In-Memory Metrics (`types.ts`)

In addition to the AI narrative, the backend computes structured metric models:

```typescript
export interface StoreMetric {
  storeName: string;
  totalSpend: number;
  topCategory: string;
  remarksQuality: 'Good' | 'Lazy';
  riskLevel: 'Low' | 'Medium' | 'High';
  riskReason: string;
  entriesCount: number;
  goodPoint?: string;
  badPoint?: string;
}

export interface AuditSummary {
  totalSpend: number;
  avgSpendPerStore: number;
  topCategory: string;
  storeMetrics: StoreMetric[];
  redFlags: string[];
  geminiAnalysis?: string;
}
```

### 5.3 Specialized Exportable Datasets (Binary XLSX Workbooks)

The backend exposes deterministic serialization pipelines to construct three forensic Excel workbooks:

#### 1. Expenses Requiring Physical Invoices (`Uninuts_Audit_Required_Bills.xlsx`)
- **Filter Criteria**:
  - `Category` $\in$ `['Stationary', 'Logistic expense', 'Porter', 'Repair & Maintenance', 'Asset', 'Miscellaneous expenses', 'Maintenance']`
  - `Amount` $\ge 100$
- **Workbook Structure**: Single worksheet named `Expenses_Needing_Bills`.

#### 2. Non-Compliant / Lazy Remark Dataset (`Uninuts_Lazy_Entries_{mode}_Audit.xlsx`)
- **Filter Criteria**:
  - Remarks matching `LAZY_REMARK_PATTERNS`.
- **Workbook Structure**: Single worksheet named `Lazy_Entries_Audit`.

#### 3. Repetitive Spending Cluster Dataset (`Uninuts_Pattern_Detection_Benchmark_20_{mode}.xlsx`)
- **Filter Criteria**:
  - Transactions belonging to a `(store, category, amount)` tuple with $\ge 20$ occurrences.
- **Workbook Structure**: Single worksheet named `Patternized_Entries_Audit`.
