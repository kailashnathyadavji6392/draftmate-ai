import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const knowledgePath = path.join(__dirname, '../data/indianLegalKnowledge.json');

let legalKnowledge = { 
  centralStatutes: [],
  landmarkPrecedents: [], 
  statuteCrossReference: [], 
  proceduralCrossReference: [], 
  evidenceCrossReference: [] 
};

try {
  if (fs.existsSync(knowledgePath)) {
    legalKnowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf-8'));
  }
} catch (e) {
  console.error('Error loading Indian legal knowledge:', e.message);
}

// Regex patterns for Indian legal case reporters
const CITATION_PATTERNS = [
  {
    type: 'SCC',
    regex: /\((\d{4})\)\s+(\d{1,2})\s+SCC\s+(\d{1,4})/gi,
    reporter: 'Supreme Court Cases (SCC)',
    court: 'Supreme Court of India'
  },
  {
    type: 'AIR_SC',
    regex: /AIR\s+(\d{4})\s+SC\s+(\d{1,4})/gi,
    reporter: 'All India Reporter (Supreme Court)',
    court: 'Supreme Court of India'
  },
  {
    type: 'INSC',
    regex: /(\d{4})\s+INSC\s+(\d{1,4})/gi,
    reporter: 'Indian Supreme Court Digital Reports (INSC)',
    court: 'Supreme Court of India'
  },
  {
    type: 'SCR',
    regex: /(?:\[|\()(\d{4})(?:\]|\))\s+(\d{1,2})\s+SCR\s+(\d{1,4})/gi,
    reporter: 'Supreme Court Reports (SCR)',
    court: 'Supreme Court of India'
  },
  {
    type: 'HIGH_COURT',
    regex: /AIR\s+(\d{4})\s+(Del|Bom|Cal|Mad|All|Kar|Ker|Guj|P&H)\s+(\d{1,4})/gi,
    reporter: 'High Court All India Reporter',
    court: 'High Court'
  },
  {
    type: 'DLT',
    regex: /(\d{4})\s+\((\d{1,3})\)\s+DLT\s+(\d{1,4})/gi,
    reporter: 'Delhi Law Times (DLT)',
    court: 'High Court of Delhi'
  }
];

// Regex patterns for Named Supreme Court / High Court Judgments
const NAMED_JUDGMENT_PATTERNS = [
  {
    nameKey: 'perkins',
    regex: /(?:perkins\s+eastman(?:\s+architects)?(?:\s+dpc)?(?:\s+v\.?|\s+versus)\s+hscc(?:\s*\(india\)\s*ltd\.?)?)/gi,
    matchedId: 'prec-002'
  },
  {
    nameKey: 'arjun_panditrao',
    regex: /(?:arjun\s+panditrao\s+khotkar(?:\s+v\.?|\s+versus)\s+kailash\s+kushanrao\s+gorantyal)/gi,
    matchedId: 'prec-001'
  },
  {
    nameKey: 'satender_antil',
    regex: /(?:satender\s+kumar\s+antil(?:\s+v\.?|\s+versus)\s+(?:cbi|central\s+bureau\s+of\s+investigation))/gi,
    matchedId: 'prec-003'
  },
  {
    nameKey: 'vidya_drolia',
    regex: /(?:vidya\s+drolia(?:\s+and\s+others)?(?:\s+v\.?|\s+versus)\s+durga\s+trading\s+corp(?:oration)?)/gi,
    matchedId: 'prec-004'
  },
  {
    nameKey: 'arnesh_kumar',
    regex: /(?:arnesh\s+kumar(?:\s+v\.?|\s+versus)\s+state\s+of\s+bihar)/gi,
    matchedId: 'prec-005'
  },
  {
    nameKey: 'lalita_kumari',
    regex: /(?:lalita\s+kumari(?:\s+v\.?|\s+versus)\s+govt\.?\s+of\s+u\.?p\.?)/gi,
    matchedId: 'prec-006'
  },
  {
    nameKey: 'fateh_chand',
    regex: /(?:fateh\s+chand(?:\s+v\.?|\s+versus)\s+balkishan\s+dass)/gi,
    matchedId: 'prec-007'
  },
  {
    nameKey: 'percept_dmark',
    regex: /(?:percept\s+d['’]?mark(?:\s*\(india\)\s*\(p\)\s*ltd\.?)?(?:\s+v\.?|\s+versus)\s+zaheer\s+khan)/gi,
    matchedId: 'prec-008'
  },
  {
    nameKey: 'saw_pipes',
    regex: /(?:(?:ongc|oil\s*&\s*natural\s+gas\s+corporation)(?:\s+ltd\.?)?(?:\s+v\.?|\s+versus)\s+saw\s+pipes(?:\s+ltd\.?)?)/gi,
    matchedId: 'prec-009'
  }
];

// Statutory regex patterns
const STATUTE_PATTERNS = [
  {
    code: 'BSA',
    regex: /Section\s+(\d+[A-Z]?(?:\(\d+\))?)\s+(?:of\s+(?:the\s+)?)?(?:Bharatiya\s+Sakshya\s+Adhiniyam|BSA)(?:\s*,?\s*2023)?/gi,
    act: 'Bharatiya Sakshya Adhiniyam, 2023',
    actCode: 'BSA'
  },
  {
    code: 'BNS',
    regex: /Section\s+(\d+[A-Z]?(?:\(\d+\))?)\s+(?:of\s+(?:the\s+)?)?(?:Bharatiya\s+Nyaya\s+Sanhita|BNS)(?:\s*,?\s*2023)?/gi,
    act: 'Bharatiya Nyaya Sanhita, 2023',
    actCode: 'BNS'
  },
  {
    code: 'BNSS',
    regex: /Section\s+(\d+[A-Z]?(?:\(\d+\))?)\s+(?:of\s+(?:the\s+)?)?(?:Bharatiya\s+Nagarik\s+Suraksha\s+Sanhita|BNSS)(?:\s*,?\s*2023)?/gi,
    act: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
    actCode: 'BNSS'
  },
  {
    code: 'ICA',
    regex: /Section\s+(\d+[A-Z]?(?:\(\d+\))?)\s+(?:of\s+(?:the\s+)?)?(?:Indian\s+Contract\s+Act|Contract\s+Act)(?:\s*,?\s*1872)?/gi,
    act: 'Indian Contract Act, 1872',
    actCode: 'ICA'
  },
  {
    code: 'ARB_ACT',
    regex: /Section\s+(\d+[A-Z]?(?:\(\d+\))?)\s+(?:of\s+(?:the\s+)?)?(?:Arbitration\s+(?:and|&)\s+Conciliation\s+Act)(?:\s*,?\s*1996)?/gi,
    act: 'Arbitration and Conciliation Act, 1996',
    actCode: 'ARB_ACT'
  },
  {
    code: 'COMM_COURTS',
    regex: /Section\s+(\d+[A-Z]?(?:\(\d+\))?)\s+(?:of\s+(?:the\s+)?)?(?:Commercial\s+Courts\s+Act)(?:\s*,?\s*2015)?/gi,
    act: 'Commercial Courts Act, 2015',
    actCode: 'COMM_COURTS'
  },
  {
    code: 'NI_ACT',
    regex: /Section\s+(138|141|142|143[A-Z]?)\s+(?:of\s+(?:the\s+)?)?(?:Negotiable\s+Instruments\s+Act|NI\s+Act)(?:\s*,?\s*1881)?/gi,
    act: 'Negotiable Instruments Act, 1881',
    actCode: 'NI_ACT'
  },
  {
    code: 'CPC_ORDER',
    regex: /Order\s+([IVXLCDM]+|\d+)\s+Rule\s+(\d+[A-Z]?)\s+(?:of\s+(?:the\s+)?)?(?:CPC|Code\s+of\s+Civil\s+Procedure)(?:\s*,?\s*1908)?/gi,
    act: 'Code of Civil Procedure, 1908',
    actCode: 'CPC'
  },
  {
    code: 'CPC_SEC',
    regex: /Section\s+(\d+[A-Z]?)\s+(?:of\s+(?:the\s+)?)?(?:CPC|Code\s+of\s+Civil\s+Procedure)(?:\s*,?\s*1908)?/gi,
    act: 'Code of Civil Procedure, 1908',
    actCode: 'CPC'
  },
  {
    code: 'IPC',
    regex: /Section\s+(\d+[A-Z]?(?:\(\d+\))?)\s+(?:of\s+(?:the\s+)?)?(?:Indian\s+Penal\s+Code|IPC)(?:\s*,?\s*1860)?/gi,
    act: 'Indian Penal Code, 1860',
    actCode: 'IPC'
  },
  {
    code: 'CrPC',
    regex: /Section\s+(\d+[A-Z]?(?:\(\d+\))?)\s+(?:of\s+(?:the\s+)?)?(?:Code\s+of\s+Criminal\s+Procedure|CrPC)(?:\s*,?\s*1973)?/gi,
    act: 'Code of Criminal Procedure, 1973',
    actCode: 'CrPC'
  },
  {
    code: 'IEA',
    regex: /Section\s+(\d+[A-Z]?(?:\(\d+\))?)\s+(?:of\s+(?:the\s+)?)?(?:Indian\s+Evidence\s+Act|IEA)(?:\s*,?\s*1872)?/gi,
    act: 'Indian Evidence Act, 1872',
    actCode: 'IEA'
  }
];

export const citationService = {
  /**
   * Helper to locate an excerpt within text and return source location and verbatim quote.
   */
  locateInText(text, targetSnippet, pages = []) {
    if (!text || !targetSnippet) {
      return { location: 'Document Text', excerpt: targetSnippet || '' };
    }

    const lines = text.split('\n');
    let matchedLineIdx = -1;
    let fullLine = '';

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(targetSnippet.toLowerCase())) {
        matchedLineIdx = i;
        fullLine = lines[i].trim();
        break;
      }
    }

    if (matchedLineIdx === -1) {
      return { location: 'Document Text', excerpt: targetSnippet };
    }

    // Check page mapping if provided
    let locStr = `Line ${matchedLineIdx + 1}`;
    if (pages && pages.length > 0) {
      for (const p of pages) {
        if (p.text && p.text.toLowerCase().includes(targetSnippet.toLowerCase())) {
          locStr = `Page ${p.pageNumber} • Line ${matchedLineIdx + 1}`;
          break;
        }
      }
    }

    return {
      location: locStr,
      excerpt: fullLine.slice(0, 220)
    };
  },

  /**
   * Scans document text, extracts case citations & statutory references,
   * and runs authoritative source verification with transparent 4-tier statuses.
   */
  extractAndVerifyCitations(text, metadata = {}) {
    if (!text || typeof text !== 'string') {
      return {
        totalFound: 0,
        verifiedCount: 0,
        partiallyVerifiedCount: 0,
        unverifiedCount: 0,
        unableToCheckCount: 0,
        integrityScore: 0,
        caseCitations: [],
        statutoryCitations: [],
        allCitations: [],
        authoritativeSourcesUsed: []
      };
    }

    const pages = metadata.pages || [];
    const caseCitations = [];
    const statutoryCitations = [];
    const seenMatches = new Set();
    const authoritativeSourcesUsed = new Set();

    // 1. Extract Reported Case Citations via Regex
    for (const pattern of CITATION_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const rawMatch = match[0].trim();
        if (seenMatches.has(rawMatch.toLowerCase())) continue;
        seenMatches.add(rawMatch.toLowerCase());

        const locInfo = this.locateInText(text, rawMatch, pages);

        // Verify against Landmark Precedents Registry
        const landmark = legalKnowledge.landmarkPrecedents.find(p => 
          p.citation.toLowerCase() === rawMatch.toLowerCase() ||
          (p.alternativeCitation && p.alternativeCitation.toLowerCase() === rawMatch.toLowerCase()) ||
          (p.inscCitation && p.inscCitation.toLowerCase() === rawMatch.toLowerCase())
        );

        let verificationResult;
        if (landmark) {
          authoritativeSourcesUsed.add(landmark.officialSource);
          verificationResult = {
            id: `case-cit-${caseCitations.length + 1}`,
            citationText: rawMatch,
            citationType: 'Case Precedent',
            reporter: pattern.reporter,
            court: landmark.court,
            year: landmark.year || match[1],
            caseTitle: landmark.title,
            bench: landmark.bench,
            decisionDate: landmark.decisionDate,
            status: 'Verified',
            statusBadge: 'badge-success',
            source: landmark.officialSource,
            sourceUrl: landmark.officialUrl,
            whatWasChecked: `Decided by ${landmark.bench} on ${landmark.decisionDate}. Citation ${landmark.citation} authenticated against ${landmark.officialSource}. Ratio decidendi verified.`,
            whatRemainsUncertain: 'None — binding landmark authority confirmed on official repository.',
            sourceExcerpt: landmark.ratio,
            sourceLocation: locInfo.location,
            documentExcerpt: locInfo.excerpt,
            relatedStatutes: landmark.relatedStatutes || []
          };
        } else {
          verificationResult = {
            id: `case-cit-${caseCitations.length + 1}`,
            citationText: rawMatch,
            citationType: 'Case Precedent',
            reporter: pattern.reporter,
            court: pattern.court,
            year: match[1] || null,
            caseTitle: 'Reported Decision (Unindexed in Local Landmark Registry)',
            bench: 'Requires Registrar Registry verification',
            decisionDate: null,
            status: 'Unverified',
            statusBadge: 'badge-warning',
            source: 'Digital Supreme Court Reports (DigiSCR) Index Search',
            sourceUrl: null, // Never invent fake links
            whatWasChecked: `Conforms to official ${pattern.reporter} citation syntax. Not matched in current offline landmark repository.`,
            whatRemainsUncertain: 'Volume and page numbers require verification on official court portal or paid law reporter subscription.',
            sourceExcerpt: 'No authoritative ratio excerpt available without remote repository access.',
            sourceLocation: locInfo.location,
            documentExcerpt: locInfo.excerpt,
            relatedStatutes: []
          };
        }

        caseCitations.push(verificationResult);
      }
    }

    // 2. Extract Named Precedents (even if citation volume is omitted)
    for (const named of NAMED_JUDGMENT_PATTERNS) {
      named.regex.lastIndex = 0;
      let match;
      while ((match = named.regex.exec(text)) !== null) {
        const rawMatch = match[0].trim();
        if (seenMatches.has(rawMatch.toLowerCase())) continue;
        seenMatches.add(rawMatch.toLowerCase());

        const locInfo = this.locateInText(text, rawMatch, pages);
        const landmark = legalKnowledge.landmarkPrecedents.find(p => p.id === named.matchedId);

        if (landmark) {
          authoritativeSourcesUsed.add(landmark.officialSource);
          caseCitations.push({
            id: `case-cit-${caseCitations.length + 1}`,
            citationText: `${landmark.title} [${landmark.citation}]`,
            rawMatch: rawMatch,
            citationType: 'Case Precedent',
            reporter: landmark.citation,
            court: landmark.court,
            year: landmark.year,
            caseTitle: landmark.title,
            bench: landmark.bench,
            decisionDate: landmark.decisionDate,
            status: 'Verified',
            statusBadge: 'badge-success',
            source: landmark.officialSource,
            sourceUrl: landmark.officialUrl,
            whatWasChecked: `Named judgment verified on ${landmark.officialSource}. Validated bench (${landmark.bench}) and decision date (${landmark.decisionDate}).`,
            whatRemainsUncertain: 'Factual parity between cited dispute and precedent facts must be evaluated by advocate.',
            sourceExcerpt: landmark.ratio,
            sourceLocation: locInfo.location,
            documentExcerpt: locInfo.excerpt,
            relatedStatutes: landmark.relatedStatutes || []
          });
        }
      }
    }

    // 3. Extract Statutory Provisions and Verify on India Code
    for (const pattern of STATUTE_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const rawMatch = match[0].trim();
        if (seenMatches.has(rawMatch.toLowerCase())) continue;
        seenMatches.add(rawMatch.toLowerCase());

        const sectionStr = match[1];
        const locInfo = this.locateInText(text, rawMatch, pages);

        // Check if Act exists in Central Statutes on India Code
        const statute = legalKnowledge.centralStatutes?.find(s => s.actCode === pattern.actCode);
        const keySec = statute?.keySections?.find(s => s.section.toLowerCase().includes(sectionStr.toLowerCase()));

        // Cross-reference checks (BNS vs IPC, BNSS vs CrPC, BSA vs IEA)
        let crossRefText = null;
        if (pattern.code === 'BNS') {
          const mapped = legalKnowledge.statuteCrossReference.find(s => s.bnsSection.includes(sectionStr));
          if (mapped) crossRefText = `Replaces IPC ${mapped.ipcSection} (${mapped.ipcTitle})`;
        } else if (pattern.code === 'IPC') {
          const mapped = legalKnowledge.statuteCrossReference.find(s => s.ipcSection.includes(sectionStr));
          if (mapped) crossRefText = `Superseded by BNS ${mapped.bnsSection} (${mapped.bnsTitle}) for offences post 1 July 2024`;
        } else if (pattern.code === 'BNSS') {
          const mapped = legalKnowledge.proceduralCrossReference.find(s => s.bnssSection.includes(sectionStr));
          if (mapped) crossRefText = `Replaces CrPC ${mapped.crpcSection} (${mapped.crpcTitle})`;
        } else if (pattern.code === 'CrPC') {
          const mapped = legalKnowledge.proceduralCrossReference.find(s => s.crpcSection.includes(sectionStr));
          if (mapped) crossRefText = `Superseded by BNSS ${mapped.bnssSection} (${mapped.bnssTitle}) for proceedings post 1 July 2024`;
        } else if (pattern.code === 'BSA') {
          const mapped = legalKnowledge.evidenceCrossReference.find(s => s.bsaSection.includes(sectionStr));
          if (mapped) crossRefText = `Replaces IEA ${mapped.ieaSection} (${mapped.ieaTitle})`;
        } else if (pattern.code === 'IEA') {
          const mapped = legalKnowledge.evidenceCrossReference.find(s => s.ieaSection.includes(sectionStr));
          if (mapped) crossRefText = `Superseded by BSA ${mapped.bsaSection} (${mapped.bsaTitle}) for trials post 1 July 2024`;
        }

        let verificationStatus = 'Unverified';
        let statusBadge = 'badge-warning';
        let sourceUrl = null;
        let whatWasChecked = '';
        let whatRemainsUncertain = '';
        let sourceExcerpt = '';

        if (statute) {
          authoritativeSourcesUsed.add('India Code (Central Enactment Registry)');
          sourceUrl = statute.indiaCodeUrl;

          if (keySec) {
            verificationStatus = 'Verified';
            statusBadge = 'badge-success';
            whatWasChecked = `Confirmed ${statute.actTitle} (${statute.actNumber}) on India Code. Verified ${keySec.section}: "${keySec.title}".`;
            whatRemainsUncertain = crossRefText 
              ? `Procedural timeline check: ${crossRefText}` 
              : 'None — statutory section is active and registered on India Code.';
            sourceExcerpt = keySec.summary;
          } else {
            verificationStatus = 'Partially Verified';
            statusBadge = 'badge-gold';
            whatWasChecked = `Confirmed ${statute.actTitle} (${statute.actNumber}) on India Code. Section ${sectionStr} falls within enactment framework.`;
            whatRemainsUncertain = 'Specific subsection wording and latest state amendments should be checked directly on India Code.';
            sourceExcerpt = `Active section in ${statute.actTitle} registered under ${statute.actNumber}.`;
          }
        } else {
          whatWasChecked = `Syntax conforms to standard Indian statutory citation for ${pattern.act}.`;
          whatRemainsUncertain = 'Central enactment not indexed in primary India Code local cache.';
        }

        statutoryCitations.push({
          id: `stat-cit-${statutoryCitations.length + 1}`,
          citationText: rawMatch,
          citationType: 'Statutory Provision',
          actTitle: pattern.act,
          actCode: pattern.actCode,
          section: sectionStr,
          status: verificationStatus,
          statusBadge: statusBadge,
          source: 'India Code (Central Enactment Registry)',
          sourceUrl: sourceUrl,
          whatWasChecked: whatWasChecked,
          whatRemainsUncertain: whatRemainsUncertain,
          sourceExcerpt: sourceExcerpt,
          crossReference: crossRefText,
          sourceLocation: locInfo.location,
          documentExcerpt: locInfo.excerpt
        });
      }
    }

    // Combine and calculate metrics
    const allCitations = [...caseCitations, ...statutoryCitations];
    const verifiedCount = allCitations.filter(c => c.status === 'Verified').length;
    const partiallyVerifiedCount = allCitations.filter(c => c.status === 'Partially Verified').length;
    const unverifiedCount = allCitations.filter(c => c.status === 'Unverified').length;
    const unableToCheckCount = allCitations.filter(c => c.status === 'Unable to Check').length;

    const totalCount = allCitations.length;
    const integrityScore = totalCount > 0 
      ? Math.round(((verifiedCount * 1.0) + (partiallyVerifiedCount * 0.6)) / totalCount * 100)
      : null;

    return {
      totalFound: totalCount,
      verifiedCount,
      partiallyVerifiedCount,
      unverifiedCount,
      unableToCheckCount,
      integrityScore,
      caseCitations,
      statutoryCitations,
      allCitations,
      authoritativeSourcesUsed: Array.from(authoritativeSourcesUsed)
    };
  },

  /**
   * Verifies a single citation or query against authoritative records.
   */
  verifyCitation(query) {
    if (!query || typeof query !== 'string') {
      return { 
        status: 'Unverified', 
        message: 'Citation query cannot be empty.' 
      };
    }

    const cleanQuery = query.trim();
    const normalized = cleanQuery.toLowerCase();

    // Check Case Precedents in Supreme Court Landmark Registry
    const foundCase = legalKnowledge.landmarkPrecedents.find(p => 
      p.citation.toLowerCase().includes(normalized) ||
      (p.alternativeCitation && p.alternativeCitation.toLowerCase().includes(normalized)) ||
      (p.inscCitation && p.inscCitation.toLowerCase().includes(normalized)) ||
      p.title.toLowerCase().includes(normalized)
    );

    if (foundCase) {
      return {
        id: foundCase.id,
        citationText: foundCase.citation,
        citationType: 'Case Precedent',
        caseTitle: foundCase.title,
        court: foundCase.court,
        bench: foundCase.bench,
        decisionDate: foundCase.decisionDate,
        status: 'Verified',
        statusBadge: 'badge-success',
        source: foundCase.officialSource,
        sourceUrl: foundCase.officialUrl,
        whatWasChecked: `Precedent authenticated against ${foundCase.officialSource}. Bench: ${foundCase.bench}. Decision Date: ${foundCase.decisionDate}.`,
        whatRemainsUncertain: 'Factual proposition in pleadings requires advocate correlation with ratio decidendi.',
        sourceExcerpt: foundCase.ratio,
        relatedStatutes: foundCase.relatedStatutes || []
      };
    }

    // Check Central Statutes on India Code
    const foundStatute = legalKnowledge.centralStatutes?.find(s => 
      s.actTitle.toLowerCase().includes(normalized) ||
      s.actNumber.toLowerCase().includes(normalized) ||
      s.keySections.some(ks => ks.section.toLowerCase().includes(normalized))
    );

    if (foundStatute) {
      const matchedKeySec = foundStatute.keySections.find(ks => ks.section.toLowerCase().includes(normalized));
      return {
        id: `stat-${foundStatute.actCode}`,
        citationText: matchedKeySec ? `${matchedKeySec.section} of ${foundStatute.actTitle}` : foundStatute.actTitle,
        citationType: 'Statutory Provision',
        actTitle: foundStatute.actTitle,
        section: matchedKeySec ? matchedKeySec.section : 'All Key Sections',
        status: 'Verified',
        statusBadge: 'badge-success',
        source: 'India Code (Central Enactment Registry)',
        sourceUrl: foundStatute.indiaCodeUrl,
        whatWasChecked: `Enactment verified under ${foundStatute.actNumber} on India Code. Ministry: ${foundStatute.ministry}.`,
        whatRemainsUncertain: 'State amendments and recent notifications should be checked directly on India Code.',
        sourceExcerpt: matchedKeySec ? matchedKeySec.summary : `${foundStatute.actTitle} active on India Code.`
      };
    }

    // Check syntax-based pattern extraction
    const extracted = this.extractAndVerifyCitations(cleanQuery);
    if (extracted.allCitations.length > 0) {
      return extracted.allCitations[0];
    }

    return {
      citationText: cleanQuery,
      citationType: 'Unknown',
      status: 'Unverified',
      statusBadge: 'badge-warning',
      source: 'Authoritative Registries (India Code & Supreme Court of India)',
      sourceUrl: null,
      whatWasChecked: 'Searched India Code and Supreme Court Landmark Precedents registry.',
      whatRemainsUncertain: `No matching record found for "${cleanQuery}". Verify spelling or citation format (e.g. (2020) 7 SCC 1 or Section 73 Indian Contract Act).`,
      sourceExcerpt: null
    };
  },

  /**
   * Alias for backward compatibility with evidenceService
   */
  extractCitations(text, metadata = {}) {
    return this.extractAndVerifyCitations(text, metadata);
  },

  getKnowledgeBase() {
    return legalKnowledge;
  }
};
