import { citationService } from './citationService.js';

export const evidenceService = {
  /**
   * Deeply extracts facts, entities, timelines, and legal references from document text.
   * Records genuine source locations (page number, clause heading, line number).
   * Never invents source locations.
   */
  extractEvidence(text, metadata = {}) {
    if (!text || typeof text !== 'string') {
      return {
        extractedFacts: [],
        parties: [],
        datesAndDeadlines: [],
        financialObligations: [],
        clausesAndClaims: [],
        legalReferences: [],
        evidenceItems: [],
        timeline: [],
        bsaCompliance: { compliant: false, score: 0, missingItems: ['No text provided for analysis'] },
        contradictions: []
      };
    }

    const docTitle = metadata.title || metadata.originalName || 'Document';
    const docId = metadata.id || 'doc-active';
    const pages = metadata.pages || []; // Array of { pageNumber, text } if parsed from PDF
    const lines = text.split('\n');

    const extractedFacts = [];
    const parties = [];
    const datesAndDeadlines = [];
    const financialObligations = [];
    const clausesAndClaims = [];
    const legalReferences = [];
    const timeline = [];
    const contradictions = [];

    // Helper: Find page number for a given line index or text snippet if pages array exists
    const findPageForLine = (lineIdx, snippet) => {
      if (pages.length > 0) {
        for (const p of pages) {
          if (p.text && p.text.includes(snippet.trim().slice(0, 40))) {
            return `Page ${p.pageNumber}`;
          }
        }
      }
      return null;
    };

    // Helper: Determine location string
    const getLocationString = (lineIdx, snippet, clauseContext = null) => {
      const page = findPageForLine(lineIdx, snippet);
      if (page) {
        return clauseContext ? `${page} • ${clauseContext}` : `${page} (Line ${lineIdx + 1})`;
      }
      if (clauseContext) {
        return `${clauseContext} (Line ${lineIdx + 1})`;
      }
      return `Page mapping unavailable (Line ${lineIdx + 1})`;
    };

    // 1. EXTRACT PARTIES AND NAMES
    const partyPatterns = [
      { role: 'Plaintiff / Petitioner', regex: /^(?:plaintiff|petitioner|applicant|claimant|first\s+party):\s*(.+)/i },
      { role: 'Defendant / Respondent', regex: /^(?:defendant|respondent|opposite\s+party|accused|second\s+party):\s*(.+)/i },
      { role: 'Court / Bench', regex: /^(?:in\s+the\s+court\s+of|in\s+the\s+high\s+court\s+of|before\s+the\s+hon'ble):\s*(.+)/i },
      { role: 'Counsel / Advocate', regex: /(?:advocate|counsel|pleader|solicitor)\s+(?:for\s+[a-z\s]+)?:\s*([A-Z][a-zA-Z\s.,&]+)/i }
    ];

    let currentClauseHeading = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Track clause headings
      if (/^(?:clause|article|section|\d+\.|\d+\))\s+([A-Z0-9\s:.-]{3,60})/i.test(line)) {
        currentClauseHeading = line.slice(0, 50);
      }

      // Check party lines
      for (const pp of partyPatterns) {
        const match = pp.regex.exec(line);
        if (match && match[1]) {
          const rawName = match[1].replace(/,\s*having registered.*$/i, '').trim();
          if (rawName.length > 2 && rawName.length < 90) {
            const loc = getLocationString(i, line, currentClauseHeading);
            const factObj = {
              id: `fact-party-${parties.length + 1}`,
              category: 'Party / Name',
              fact: `${pp.role}: ${rawName}`,
              rawExcerpt: line.slice(0, 160),
              sourceDocumentId: docId,
              sourceDocumentName: docTitle,
              sourceLocation: loc,
              isGroundTruth: true
            };
            parties.push(factObj);
            extractedFacts.push(factObj);
          }
        }
      }

      // Between / Versus detection
      if (/between:\s*([A-Za-z0-9\s.,&]+?)(?:\s+and\s+|\s*\.\.\.|\n|$)/i.test(line)) {
        const m = /between:\s*([A-Za-z0-9\s.,&]+)/i.exec(line);
        if (m && m[1].length > 3) {
          const loc = getLocationString(i, line, currentClauseHeading);
          const factObj = {
            id: `fact-party-${parties.length + 1}`,
            category: 'Party / Name',
            fact: `Party (First Part): ${m[1].trim()}`,
            rawExcerpt: line.slice(0, 140),
            sourceDocumentId: docId,
            sourceDocumentName: docTitle,
            sourceLocation: loc,
            isGroundTruth: true
          };
          parties.push(factObj);
          extractedFacts.push(factObj);
        }
      }
    }

    // 2. EXTRACT DATES AND DEADLINES
    const dateRegex = /\b(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s+\d{4})\b/gi;
    const deadlineKeywords = /deadline|within\s+\d+\s+days|expires|period\s+of|next\s+hearing|returnable|limitation/i;
    const seenDates = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      dateRegex.lastIndex = 0;
      let dateMatch;
      while ((dateMatch = dateRegex.exec(line)) !== null) {
        const dStr = dateMatch[0];
        const isDeadline = deadlineKeywords.test(line);
        const loc = getLocationString(i, line, currentClauseHeading);

        if (!seenDates.has(dStr)) {
          seenDates.add(dStr);
          const factObj = {
            id: `fact-date-${datesAndDeadlines.length + 1}`,
            category: 'Date / Deadline',
            fact: isDeadline ? `Statutory / Contractual Deadline: ${dStr}` : `Event / Execution Date: ${dStr}`,
            rawExcerpt: line.length > 150 ? line.slice(0, 147) + '...' : line,
            sourceDocumentId: docId,
            sourceDocumentName: docTitle,
            sourceLocation: loc,
            isGroundTruth: true
          };
          datesAndDeadlines.push(factObj);
          extractedFacts.push(factObj);

          timeline.push({
            id: `tl-${timeline.length + 1}`,
            date: dStr,
            eventSummary: line.length > 120 ? line.slice(0, 117) + '...' : line,
            sourceLocation: loc,
            significance: isDeadline ? 'Statutory Deadline' : 'Litigious Event'
          });
        }
      }
    }

    // 3. EXTRACT FINANCIAL OBLIGATIONS & AMOUNTS
    const amountRegex = /(?:₹|Rs\.?|INR|USD|\$)\s*([\d,]+(?:\.\d{2})?)\s*(?:lakh|crore|million|cr|lakhs|crores)?/gi;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      amountRegex.lastIndex = 0;
      let amtMatch;
      while ((amtMatch = amountRegex.exec(line)) !== null) {
        const amtStr = amtMatch[0];
        const loc = getLocationString(i, line, currentClauseHeading);

        const factObj = {
          id: `fact-amt-${financialObligations.length + 1}`,
          category: 'Financial Obligation',
          fact: `Claim / Obligation Amount: ${amtStr}`,
          rawExcerpt: line.length > 150 ? line.slice(0, 147) + '...' : line,
          sourceDocumentId: docId,
          sourceDocumentName: docTitle,
          sourceLocation: loc,
          isGroundTruth: true
        };
        financialObligations.push(factObj);
        extractedFacts.push(factObj);
      }
    }

    // 4. EXTRACT IMPORTANT CLAUSES & FACTUAL CLAIMS
    const claimKeywords = [
      { type: 'Breach / Default Allegation', regex: /breach|default|failed to pay|unlawful|concocted|frivolous/i },
      { type: 'Arbitration / Dispute Clause', regex: /arbitrat|sole arbitrator|dispute resolution|seat of arbitration/i },
      { type: 'Indemnity / Liability Cap', regex: /indemnif|hold harmless|limitation of liability|consequential damages/i },
      { type: 'Jurisdiction & Governing Law', regex: /governing law|exclusive jurisdiction|courts at/i },
      { type: 'Admissibility & Electronic Evidence', regex: /electronic evidence|section 63|section 65b|audit trail|hash value/i }
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 25) continue;

      for (const ck of claimKeywords) {
        if (ck.regex.test(line)) {
          const loc = getLocationString(i, line, currentClauseHeading);
          const factObj = {
            id: `fact-claim-${clausesAndClaims.length + 1}`,
            category: 'Factual Claim / Clause',
            fact: `${ck.type}: ${line.slice(0, 90)}...`,
            rawExcerpt: line.length > 180 ? line.slice(0, 177) + '...' : line,
            sourceDocumentId: docId,
            sourceDocumentName: docTitle,
            sourceLocation: loc,
            isGroundTruth: true
          };
          clausesAndClaims.push(factObj);
          extractedFacts.push(factObj);
          break; // Avoid multi-tagging the same line
        }
      }
    }

    // 5. EXTRACT LEGAL REFERENCES & CITATIONS
    const citationsResult = citationService.extractCitations(text);
    for (const c of citationsResult.caseCitations) {
      const factObj = {
        id: `fact-law-${legalReferences.length + 1}`,
        category: 'Legal Reference',
        fact: `Case Law Precedent: ${c.caseTitle || c.rawCitation} (${c.court})`,
        rawExcerpt: c.rawCitation,
        sourceDocumentId: docId,
        sourceDocumentName: docTitle,
        sourceLocation: 'Extracted from text citations',
        isGroundTruth: true,
        precedentDetails: c
      };
      legalReferences.push(factObj);
      extractedFacts.push(factObj);
    }

    for (const s of citationsResult.statutoryCitations) {
      const factObj = {
        id: `fact-statute-${legalReferences.length + 1}`,
        category: 'Legal Reference',
        fact: `Statutory Provision: ${s.actTitle} - ${s.rawCitation}`,
        rawExcerpt: s.rawCitation,
        sourceDocumentId: docId,
        sourceDocumentName: docTitle,
        sourceLocation: s.crossReference ? `${s.crossReference}` : 'Statutory Reference',
        isGroundTruth: true
      };
      legalReferences.push(factObj);
      extractedFacts.push(factObj);
    }

    // 6. ADMISSIBILITY AUDIT & CONTRADICTIONS
    const evidenceItems = [];
    const hasElectronic = /email|whatsapp|chat log|server log|timestamp|hash/i.test(text);
    const hasCertificate63 = /section\s+63\s+(?:certificate|bsa|adhiniyam)|section\s+65b\s+(?:certificate|evidence\s+act)/i.test(text);
    const hasHash = /hash|sha-256|md5|audit trail/i.test(text);

    if (hasElectronic) {
      evidenceItems.push({
        title: 'Electronic Record / Transactional Logs',
        category: 'Electronic Evidence',
        admissibilityStandard: 'BSA 2023 Sec 63 / IEA Sec 65B',
        status: hasCertificate63 ? 'Certificate Referenced' : 'Defective - Missing Sec 63 Certificate',
        riskLevel: hasCertificate63 ? 'Low' : 'Critical',
        sourceLocation: hasCertificate63 ? 'Certificate referenced in text' : 'Page mapping unavailable'
      });
    }

    let bsaScore = 100;
    const missingRequirements = [];
    if (hasElectronic) {
      if (!hasCertificate63) {
        bsaScore -= 40;
        missingRequirements.push('Section 63 BSA Certificate (Mandatory under Arjun Panditrao Khotkar)');
      }
      if (!hasHash) {
        bsaScore -= 20;
        missingRequirements.push('Cryptographic Hash / Audit Trail details (BSA Sec 63(4))');
      }
    } else {
      bsaScore = 88;
    }

    if (hasElectronic && !hasCertificate63) {
      contradictions.push({
        title: 'Electronic Record Admissibility Vulnerability',
        severity: 'High',
        description: 'Electronic communications are referenced without accompanying Section 63 BSA / Section 65B IEA certificate. Inadmissible under Arjun Panditrao (2020) 7 SCC 1.',
        remedy: 'Draft and file a supporting Affidavit under Section 63 BSA from system administrator prior to marking exhibits.'
      });
    }

    if (/unilateral|sole\s+discretion\s+to\s+appoint/i.test(text)) {
      contradictions.push({
        title: 'Unilateral Arbitrator Appointment Clause Risk',
        severity: 'Critical',
        description: 'Clause confers unilateral power on one party to appoint sole arbitrator, violating Supreme Court precedent in Perkins Eastman (2020) 12 SCC 767.',
        remedy: 'Amend dispute resolution clause to provide for mutual consent or appointment by the High Court under Section 11(6).'
      });
    }

    return {
      extractedFactsCount: extractedFacts.length,
      extractedFacts,
      parties,
      datesAndDeadlines,
      financialObligations,
      clausesAndClaims,
      legalReferences,
      evidenceItems,
      timeline,
      bsaCompliance: {
        score: Math.max(20, bsaScore),
        status: bsaScore >= 80 ? 'Admissible' : bsaScore >= 50 ? 'Conditional / Defective' : 'Inadmissible',
        hasCertificate: hasCertificate63,
        hasAuditTrail: hasHash,
        missingRequirements
      },
      contradictions
    };
  }
};
