# DraftMate Evidence Intelligence — India-Focused AI Legal Workbench

> **Hackathon Edition (v1.0.0-PRO)**  
> Built for Indian Advocates, Corporate Legal Teams, and Arbitral Practitioners.  
> Compliant with the **Bharatiya Sakshya Adhiniyam, 2023 (BSA)**, **Bharatiya Nyaya Sanhita, 2023 (BNS)**, **Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)**, and the **Advocates Act, 1961**.

---

## 1. Project Overview

**DraftMate Evidence Intelligence** is a purpose-built legal intelligence workbench tailored specifically to the Indian judicial ecosystem. Unlike generic document analysis tools, DraftMate connects ground-truth case evidence directly to Indian statutory enactments and binding judicial precedents, providing a unified workspace for:

- **Matter Management & Evidence Dossiers**: Persistent litigation dockets linked with PDF, DOCX, and TXT exhibits.
- **Section 63 BSA Electronic Admissibility Audit**: Dynamic compliance auditing for electronic logs, emails, WhatsApp exports, and digital certificates (replacing erstwhile Section 65B IEA).
- **Legal Risk Radar**: Real contract clause inspection identifying unilateral arbitrator nominations (*Perkins Eastman* violations), uncapped consequential indemnity (*Section 73 Contract Act*), and excessive liquidated damages (*Section 74 Contract Act*).
- **Indian Citation Verification**: Cross-referencing against **India Code** and **Supreme Court of India** official registries. Unindexed or fictitious citations are honestly marked `Unverified` (zero fake cases).
- **AI Drafting Studio with Evidence Backing**: Court-styled pleadings and legal notices in English and Hindi, with factual claims explicitly cited to exhibit pages and unverified points tagged with `[INSERT PLACEHOLDER]`.
- **Targeted Paragraph Regeneration**: Revise individual clauses without altering approved document text.
- **Interactive Smart Redline**: Token/line-level visual diff between contract versions with Indian law risk tagging, individual change acceptance/rejection, and clean final draft resolution.
- **Real Binary PDF & Word DOCX Exports**: Server-side binary generation using `pdfkit` and `docx` complete with court header captions and the mandatory **Advocates Act, 1961** review disclaimer.
- **Bilingual Legal Voice Dictation**: Speech-to-text dictation in Indian English (`en-IN`) and Hindi (`hi-IN`) with an editable review console before text insertion.

---

## 2. Architecture & Tech Stack

```
DraftMate Evidence Intelligence
├── client/                     # React 18 + Vite Frontend (Port 3000)
│   ├── src/components/         # MatterWorkspace, DocumentEditor, BottomPanels, Sidebar, Header
│   ├── src/components/views/   # Dashboard, Matters, Documents, Drafting, Research, Risk, Verification, Redline, Settings
│   ├── src/components/common/  # VoiceInputButton (Web Speech API)
│   └── src/api/client.js       # Centralized REST API client & binary file downloader
│
├── server/                     # Express 5 Backend (Port 5001)
│   ├── data/                   # Persistent Atomic JSON Repositories
│   │   ├── mattersDb.json      # Saved matter dockets & CNR records
│   │   ├── documentsDb.json    # Processed documents & extracted factual coordinates
│   │   ├── draftsDb.json       # Persistent AI & edited drafts library
│   │   ├── redlineHistoryDb.json# Saved redline comparison sessions & audit trails
│   │   └── indianLegalKnowledge.json # India Code central acts & landmark precedents
│   ├── routes/                 # Express API Endpoints (/matters, /documents, /drafting, /drafts, /research, /analysis, /verification, /redline, /export, /config)
│   ├── services/               # Core Legal Intelligence Engines
│   │   ├── aiService.js        # Official @google/genai SDK (Gemini 2.0 Flash)
│   │   ├── citationService.js  # Citation extraction & India Code/SC registry verification
│   │   ├── documentService.js  # PDF, DOCX (Mammoth), and TXT parser with honest scan detection
│   │   ├── draftingService.js  # Evidence-grounded drafting & targeted paragraph revision
│   │   ├── evidenceService.js  # Ground-truth fact extractor & BSA 63 auditor
│   │   ├── exportService.js    # PDFKit (%PDF) & Docx (PK zip) binary report generator
│   │   ├── redlineService.js   # Word/line diff engine & decision merge resolver
│   │   └── riskAnalysisService.js # Indian Contract Act & Arbitration Act heuristic engine
│   └── uploads/                # Safe server-side uploaded file storage
```

---

## 3. Environment Variables & Setup

### Requirements
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **NPM**: v9.0.0 or higher
- **Modern Browser**: Chrome / Edge (recommended for Web Speech API dictation)

### Environment Configuration
The backend loads configuration from `.env` in the project root:

```env
# Server Port
PORT=5001

# Google Gemini API Key (Required for live LLM generation; deterministic heuristics run if omitted)
GEMINI_API_KEY=your_gemini_api_key_here
```

> [!NOTE]
> The server automatically reads `GEMINI_API_KEY` securely on the server side. It is **never** transmitted to the frontend or saved in client-accessible logs. If omitted, the workbench operates in a transparent **Heuristic Engine** mode and guides the user to configure the key in **Settings**.

---

## 4. Startup Commands

### Step 1: Install Dependencies
```bash
# Install root/server dependencies
npm install

# Install client dependencies
npm --prefix client install
```

### Step 2: Run Backend and Frontend
In two separate terminal windows (or using background tasks):

**Terminal 1 — Backend Server (Port 5001):**
```bash
npm run server
# or directly:
node server/index.js
```
*Output: `[DraftMate AI Backend] Server running on http://localhost:5001`*

**Terminal 2 — Frontend Client (Port 3000):**
```bash
npm run client
# or directly:
cd client && npm run dev
```
*Output: `Local: http://localhost:3000/`*

Open **`http://localhost:3000`** in your browser.

---

## 5. Automated Verification & Testing

The project includes an end-to-end test suite testing all 10 core workflows with real data and binary file generation:

```bash
# Run comprehensive 10-workflow E2E test suite (47 assertions)
node server/test_final_e2e.js

# Run Prompt 3D persistence and binary export test suite (26 assertions)
node server/test_prompt3d_full.js

# Build client production bundle (Vite)
npm run build
```

---

## 6. Hackathon Demo Walkthrough (3-Step Guide)

For judges and evaluators, follow this workflow to see all capabilities in action:

1. **Step 1: Explore Matter Docket & Ground-Truth Evidence**
   - Go to **Dashboard** or **Matters**. Select *Apex Biotech Ltd. v. Union of India* or *Tata Motors Commercial Division*.
   - In the **Central Document Editor**, inspect *Cloud Services Agreement* or *Witness Deposition*.
   - Look at the **Bottom Dock**:
     - Click **Evidence Summary** to view extracted facts with exact line numbers and page coordinates. Click any fact to jump to its source.
     - Click **BSA Electronic Admissibility** to view Section 63 compliance status.
2. **Step 2: Run Legal Risk Radar & Citation Verification**
   - Switch to **Risk Analysis** tab (or bottom **Legal Risk Radar**). Notice how the engine identifies:
     - Unilateral arbitrator nomination (*Critical Risk* under *Perkins Eastman Architects*).
     - Uncapped consequential indemnity (*High Risk* under *Section 73 Contract Act*).
     - Read the plain-English explanation and actionable recommended revision.
   - Switch to **Verification** tab: Enter an Indian precedent like `(2020) 7 SCC 1` or `Section 63 BSA 2023` to see real-time authoritative verification. Enter a fake citation to confirm honest unverified reporting.
3. **Step 3: AI Drafting Studio, Smart Redline & Real Binary Exports**
   - Switch to **AI Drafting**:
     - Click the **Microphone** icon to dictate instructions in English or Hindi.
     - Click **Generate Draft** to create a structured notice or pleading with grounded evidence citations.
     - Select a paragraph and click **Regenerate Paragraph** with custom revisions.
     - Click **Save Draft** to store it permanently in the matter repository.
     - Click **Export Draft** &rarr; Select **PDF** or **Word DOCX** to immediately download a court-styled legal document.
   - Switch to **Redline Compare**:
     - View the side-by-side or inline diff with similarity %.
     - Click **Accept** or **Reject** on individual changes.
     - Click **Apply Decisions** to generate the final resolved draft.
     - Click **Export Diff** to download the redline report in PDF or DOCX.

---

---

## 7. Public Cloud Deployment Guide

DraftMate Evidence Intelligence is fully configured for production deployment. You can choose between a **Unified Single-Service Deployment** (Recommended) or a **Decoupled Architecture**.

### Option A: Unified Web Service on Render (Recommended)
> **Why Recommended:** A single public URL serves both the React UI and the Express backend. Eliminates cross-origin CORS complexity, prevents cookie/download header issues, keeps all persistent databases and binary exports together, and includes automatic HTTPS.

1. **Push your repository to GitHub / GitLab:**
   ```bash
   git init
   git add .
   git commit -m "DraftMate Evidence Intelligence v1.0.0-PRO"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/draftmate-ai.git
   git push -u origin main
   ```
   *(Note: The root `.gitignore` protects your `.env` file and confidential `server/uploads/` documents from being pushed).*

2. **Create a Web Service on Render ([render.com](https://render.com)):**
   - Click **New +** &rarr; Select **Web Service**.
   - Connect your GitHub repository.
   - Configure the service settings:
     - **Name**: `draftmate-evidence-ai` (or your preferred name)
     - **Region**: Singapore / Frankfurt / Oregon
     - **Environment**: `Node`
     - **Build Command**: `npm install && npm --prefix client install && npm run build`
     - **Start Command**: `npm start`
     - **Plan**: Free or Starter
   - Add **Environment Variables** in the Render dashboard:
     - `PORT`: `10000` (Render's standard port)
     - `NODE_ENV`: `production`
     - `GEMINI_API_KEY`: *(Paste your Google Gemini API key here securely)*
   - Click **Deploy Web Service**.

3. **Obtain your Public HTTPS URL:**
   - Once the deployment build completes (usually ~2 minutes), Render will display your public secure link at the top of the dashboard:  
     `https://draftmate-evidence-ai.onrender.com`
   - Open the URL in your browser: The full Dark Navy and Gold workbench is live with all features enabled!

---

### Option B: Unified Deployment on Railway ([railway.app](https://railway.app))
1. Click **New Project** &rarr; **Deploy from GitHub repo**.
2. Select your repository.
3. In **Variables**, add:
   - `GEMINI_API_KEY`: `your_key_here`
   - `NODE_ENV`: `production`
4. Under **Settings** &rarr; **Networking**, click **Generate Domain**.
5. Railway provides your public HTTPS URL: `https://draftmate-ai.up.railway.app`.

---

### Option C: Decoupled Deployment (Vercel Frontend + Render Backend)
If you prefer hosting the React client separately on Vercel:

1. **Deploy Backend on Render:**
   - Follow Option A for the backend repository.
   - Add Environment Variable:  
     `CORS_ORIGIN`: `https://your-frontend.vercel.app`
   - Obtain backend URL: `https://draftmate-backend.onrender.com`.

2. **Deploy Frontend on Vercel ([vercel.com](https://vercel.com)):**
   - Click **Add New Project** &rarr; Import your GitHub repository.
   - Set **Root Directory**: `client`
   - Under **Environment Variables**, add:  
     `VITE_API_URL`: `https://draftmate-backend.onrender.com`
   - Click **Deploy**.
   - Vercel automatically deploys your frontend to `https://your-frontend.vercel.app`.

---

## 8. Known Boundaries & Limitations

1. **Scanned PDF Text Extraction**: PDFs without an embedded text layer are detected honestly and flagged with an advisory notice explaining that local OCR is required. DraftMate does not invent text for unreadable scanned images without a configured OCR binary.
2. **Official Court Repositories**: Authoritative citation verification is performed against the primary indexed central enactments on India Code and landmark Supreme Court/High Court reported judgments. Unindexed lower trial court orders or niche state tribunals are marked `Unverified` pending advocate inspection.
3. **Web Speech API Support**: Voice dictation relies on Chromium Web Speech API standards (native in Chrome, Edge, and Chromium browsers). In unsupported browsers, an informative fallback tooltip is rendered without breaking the UI.
4. **Professional Legal Review**: Generated documents are explicitly designated as drafts requiring verification and signoff by an enrolled Advocate under the **Advocates Act, 1961**.

---

## 9. License & Acknowledgments

Developed for the **Google Antigravity Hackathon**. Inspired by the procedural and statutory modernization of Indian law under the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), and Bharatiya Sakshya Adhiniyam (BSA).
