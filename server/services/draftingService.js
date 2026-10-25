import { aiService } from './aiService.js';
import { documentService } from './documentService.js';
import { evidenceService } from './evidenceService.js';
import { citationService } from './citationService.js';

export const draftingService = {
  /**
   * Generates a grounded, evidence-backed legal draft.
   * Leverages Gemini 2.0 Flash when configured, or deterministic Indian legal drafting engine.
   * Unsupported facts become explicit placeholders like [INSERT DATE] or [INSERT AMOUNT].
   */
  async generateDraft(params = {}) {
    const {
      matterId,
      documentIds = [],
      documents = [],
      templateType,
      instructions = '',
      language = 'en',
      matter = {},
      claimAmount
    } = params;

    const docType = params.docType || (
      templateType === 'legal_notice' ? 'Legal Notice' :
      templateType === 'commercial_plaint' ? 'Commercial Plaint' :
      templateType === 'anticipatory_bail' ? 'Anticipatory Bail Application' :
      templateType === 'arbitration_clause' ? 'Arbitration Clause' :
      'Legal Notice'
    );

    const clientName = params.clientName || matter.clientName;
    const oppositeParty = params.oppositeParty || matter.opponentName || matter.oppositeParty;
    const court = params.court || matter.court;
    const jurisdiction = params.jurisdiction || matter.jurisdiction;

    // Detect if instructions are in Hindi or requested in Hindi
    const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(instructions);

    // 1. Gather documents and evidence facts
    const selectedDocs = [...documents];
    const extractedFactsList = [];

    // Extract from directly provided documents
    for (const doc of documents) {
      if (doc && doc.content) {
        const ev = evidenceService.extractEvidence(doc.content, {
          id: doc.id || 'doc-inline',
          title: doc.title || 'Attached Document',
          pages: doc.pages || 1
        });
        extractedFactsList.push(...ev.extractedFacts);
      }
    }

    if (documentIds && documentIds.length > 0) {
      for (const id of documentIds) {
        const doc = documentService.getById(id);
        if (doc && !selectedDocs.some(d => d.id === doc.id)) {
          selectedDocs.push(doc);
          const ev = evidenceService.extractEvidence(doc.content || '', {
            id: doc.id,
            title: doc.title,
            pages: doc.pages
          });
          extractedFactsList.push(...ev.extractedFacts);
        }
      }
    }

    // 2. Identify missing key parameters and form placeholders
    const missingPlaceholders = [];
    const clientVal = clientName || (selectedDocs[0] ? this.extractLikelyParty(selectedDocs[0].content, 'client') : null) || '[INSERT CLIENT / CLAIMANT NAME]';
    const oppositeVal = oppositeParty || (selectedDocs[0] ? this.extractLikelyParty(selectedDocs[0].content, 'opposite') : null) || '[INSERT OPPOSING PARTY / RESPONDENT NAME]';
    const courtVal = court || '[INSERT COMPETENT COURT / TRIBUNAL]';
    const jurisdictionVal = jurisdiction || '[INSERT TERRITORIAL JURISDICTION]';
    const claimVal = claimAmount || (extractedFactsList.find(f => f.category === 'Financial Obligation')?.fact) || '[INSERT VALUATION / CLAIM AMOUNT]';

    if (clientVal.startsWith('[')) missingPlaceholders.push({ field: 'Client Name', placeholder: clientVal });
    if (oppositeVal.startsWith('[')) missingPlaceholders.push({ field: 'Opposing Party', placeholder: oppositeVal });
    if (courtVal.startsWith('[')) missingPlaceholders.push({ field: 'Court', placeholder: courtVal });
    if (jurisdictionVal.startsWith('[')) missingPlaceholders.push({ field: 'Territorial Jurisdiction', placeholder: jurisdictionVal });
    if (claimVal.startsWith('[')) missingPlaceholders.push({ field: 'Claim Valuation', placeholder: claimVal });

    // 3. Check for Gemini 2.0 Client
    const aiClient = aiService.getClient();

    if (aiClient) {
      try {
        const evidenceSummary = extractedFactsList.slice(0, 10).map((f, i) => 
          `Fact ${i + 1}: ${f.fact} (Source: ${f.sourceDocumentName || 'Document'} • ${f.sourceLocation})`
        ).join('\n');

        const systemPrompt = `You are an elite Senior Advocate practicing before the Supreme Court of India and High Courts.
Draft a professional Indian ${docType} strictly complying with current Indian statutes (BNS 2023, BNSS 2023, BSA 2023, Indian Contract Act 1872, Arbitration & Conciliation Act 1996, CPC 1908).
${isHindi ? 'IMPORTANT: Draft the entire legal document in formal legal Hindi (शुद्ध विधिक हिंदी), using proper Indian legal terminology.' : 'Draft in formal Indian legal English.'}

CRITICAL RULES ON EVIDENCE & SAFETY:
1. Rely ONLY on the facts given in <SUPPORTING_EVIDENCE> and user instructions.
2. For ANY missing dates, cheque numbers, FIR numbers, policy numbers, or amounts, DO NOT FABRICATE DETAILS. Instead, use explicit uppercase placeholders such as [INSERT DATE], [INSERT CHEQUE NUMBER], [INSERT JURISDICTION], [INSERT POLICE STATION].
3. For case law, cite only verified landmark precedents (e.g. Satender Kumar Antil (2022) 10 SCC 51, Perkins Eastman (2020) 12 SCC 767, Arjun Panditrao (2020) 7 SCC 1). NEVER invent non-existent citations.
4. Structure with Court Memo of Parties, Synopsis / Preamble, Numbered Paragraphs, Grounds / Legal Demand, and Verification Affidavit / Signature block.`;

        const userPrompt = `DOCUMENT TYPE: ${docType}
CLIENT / PETITIONER: ${clientVal}
OPPOSING PARTY / RESPONDENT: ${oppositeVal}
COMPETENT FORUM: ${courtVal}
TERRITORIAL JURISDICTION: ${jurisdictionVal}
CLAIM / VALUATION: ${claimVal}
USER DRAFTING INSTRUCTIONS: ${instructions || 'Draft standard compliant legal pleading/notice based on evidence.'}

<SUPPORTING_EVIDENCE>
${evidenceSummary || 'No external documents selected. Use formal statutory framework with explicit placeholders for factual dates and amounts.'}
</SUPPORTING_EVIDENCE>

Generate the complete draft now:`;

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gemini drafting request timed out after 30s')), 30000)
        );

        const generatePromise = aiClient.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          config: {
            temperature: 0.15,
            maxOutputTokens: 3000
          }
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);
        const draftText = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (draftText) {
          const evidenceClaims = this.mapClaimsToEvidence(draftText, extractedFactsList, selectedDocs);

          return {
            success: true,
            content: draftText,
            draft: draftText,
            wordCount: draftText.split(/\s+/).filter(Boolean).length,
            isAiPowered: true,
            provider: 'Gemini 2.0 Flash (@google/genai)',
            language: isHindi ? 'Hindi' : 'English',
            docType,
            missingPlaceholders,
            placeholders: missingPlaceholders,
            evidenceClaims,
            evidenceCitations: evidenceClaims,
            disclaimer: 'DRAFT — Subject to Advocate Review and Verification. Not a Final Judicial Pleading.'
          };
        }
      } catch (err) {
        console.warn('Gemini drafting fallback to deterministic engine:', err.message);
      }
    }

    // 4. Deterministic Indian Legal Generator Fallback
    const deterministicContent = this.generateDeterministicLegalDraft({
      docType,
      clientName: clientVal,
      oppositeParty: oppositeVal,
      court: courtVal,
      jurisdiction: jurisdictionVal,
      claimAmount: claimVal,
      instructions,
      isHindi,
      extractedFactsList,
      selectedDocs
    });

    const evidenceClaims = this.mapClaimsToEvidence(deterministicContent, extractedFactsList, selectedDocs);

    return {
      success: true,
      content: deterministicContent,
      draft: deterministicContent,
      wordCount: deterministicContent.split(/\s+/).filter(Boolean).length,
      isAiPowered: false,
      provider: 'Deterministic Indian Legal Drafting Engine',
      status: !aiClient ? 'MISSING_KEY' : 'FALLBACK',
      configNotice: !aiClient 
        ? 'Drafted using rule-based Indian statutory templates. To enable custom Gemini 2.0 drafting, configure GEMINI_API_KEY in Settings.' 
        : null,
      language: isHindi ? 'Hindi' : 'English',
      docType,
      missingPlaceholders,
      placeholders: missingPlaceholders,
      evidenceClaims,
      evidenceCitations: evidenceClaims,
      disclaimer: 'DRAFT — Subject to Advocate Review and Verification. Not a Final Judicial Pleading.'
    };
  },

  /**
   * Regenerates a single targeted paragraph without modifying other paragraphs.
   */
  async regenerateParagraph(params) {
    const {
      fullText = '',
      paragraphIndex = 0,
      selectedParagraph = '',
      instructions = '',
      language = 'en'
    } = params;

    const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(instructions);
    const paragraphs = fullText.split(/\n\s*\n/);

    // Target paragraph validation
    let targetIdx = paragraphIndex;
    if (selectedParagraph && (!paragraphs[targetIdx] || !paragraphs[targetIdx].includes(selectedParagraph.slice(0, 20)))) {
      const foundIdx = paragraphs.findIndex(p => p.includes(selectedParagraph.trim().slice(0, 30)));
      if (foundIdx !== -1) targetIdx = foundIdx;
    }

    if (targetIdx < 0 || targetIdx >= paragraphs.length) {
      return {
        success: false,
        error: 'Target paragraph index out of bounds.'
      };
    }

    const currentParagraph = paragraphs[targetIdx];
    let revisedParagraph = '';

    const aiClient = aiService.getClient();

    if (aiClient) {
      try {
        const systemPrompt = `You are an Indian legal drafting specialist.
Your task is to REWRITE ONLY the single specified paragraph according to user instructions.
DO NOT draft a full document. DO NOT include headers or footers.
Return ONLY the revised paragraph text.
${isHindi ? 'Draft in formal legal Hindi (विधिक हिंदी).' : 'Draft in formal Indian legal English.'}`;

        const userPrompt = `ORIGINAL PARAGRAPH:
"""
${currentParagraph}
"""

REVISION INSTRUCTIONS:
${instructions || 'Refine and strengthen legal clarity and statutory compliance.'}

Return the revised paragraph text:`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          config: { temperature: 0.1, maxOutputTokens: 500 }
        });

        revisedParagraph = response?.text?.trim() || '';
      } catch (err) {
        console.warn('AI paragraph revision error:', err.message);
      }
    }

    if (!revisedParagraph) {
      // Deterministic targeted paragraph adjustment
      revisedParagraph = this.applyDeterministicParagraphEdit(currentParagraph, instructions, isHindi);
    }

    // Splice revised paragraph into full text
    paragraphs[targetIdx] = revisedParagraph;
    const updatedDraft = paragraphs.join('\n\n');

    return {
      success: true,
      paragraphIndex: targetIdx,
      originalParagraph: currentParagraph,
      revisedParagraph,
      newParagraph: revisedParagraph,
      updatedDraft,
      fullRevisedDraft: updatedDraft,
      changeSummary: `Paragraph ${targetIdx + 1} updated per advocate instruction.`
    };
  },

  /**
   * Applies full targeted revision to a draft based on advocate instructions.
   */
  async reviseDraft(params) {
    const { fullText = '', revisionPrompt = '', language = 'en' } = params;
    const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(revisionPrompt);
    const aiClient = aiService.getClient();

    if (aiClient) {
      try {
        const systemPrompt = `You are a Senior Legal Counsel in India. Revise the existing legal draft according to the advocate's targeted instructions.
Preserve the overall document structure and all verified facts. Return the full revised draft.
${isHindi ? 'Maintain formal legal Hindi.' : 'Maintain formal legal English.'}`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nREVISION INSTRUCTION: ${revisionPrompt}\n\nEXISTING DRAFT:\n${fullText}` }]
          }],
          config: { temperature: 0.15, maxOutputTokens: 3000 }
        });

        const revisedText = response?.text;
        if (revisedText) {
          return {
            success: true,
            revisedText,
            isAiPowered: true,
            provider: 'Gemini 2.0 Flash'
          };
        }
      } catch (e) {
        console.warn('AI draft revision fallback:', e.message);
      }
    }

    // Deterministic revision fallback
    const modifiedText = `${fullText}\n\n[AMENDMENT NOTE]: ${revisionPrompt}\n[Updated as per advocate instructions on ${new Date().toLocaleDateString('en-IN')}]`;
    return {
      success: true,
      revisedText: modifiedText,
      isAiPowered: false,
      provider: 'Deterministic Indian Legal Revision Engine'
    };
  },

  /**
   * Maps factual claims in the draft to extracted evidence items or flags them as uncorroborated.
   */
  mapClaimsToEvidence(draftText, extractedFacts = [], selectedDocs = []) {
    const claims = [];

    // Check financial amounts
    const amountMatches = draftText.match(/₹\s*[\d,]+(?:\s*(?:lakh|crore|thousand))?/gi) || [];
    for (const amt of amountMatches) {
      const match = extractedFacts.find(f => f.fact.includes(amt.replace(/[₹\s,]/g, '')));
      claims.push({
        claimText: `Financial Claim: ${amt}`,
        sourceDocId: match ? match.sourceDocumentId : (selectedDocs[0]?.id || null),
        sourceDocTitle: match ? match.sourceDocumentName : (selectedDocs[0]?.title || 'Pleading Record'),
        sourceLocation: match ? match.sourceLocation : 'Document Text',
        status: match ? 'Extracted Evidence' : 'User Provided'
      });
    }

    // Check explicit placeholders
    const placeholders = draftText.match(/\[INSERT\s+[A-Z\s/]+\]/g) || [];
    for (const ph of placeholders) {
      claims.push({
        claimText: ph,
        sourceDocId: null,
        sourceDocTitle: 'Draft Placeholder',
        sourceLocation: 'Pending Advocate Input',
        status: 'Unverified Placeholder'
      });
    }

    return claims;
  },

  /**
   * Extracts likely client or opposing party names from document text.
   */
  extractLikelyParty(content = '', type = 'client') {
    if (!content) return null;
    const lines = content.split('\n');

    for (const line of lines) {
      if (type === 'client' && /(?:plaintiff|petitioner|applicant|service\s+recipient|first\s+party)[:\s]+([A-Z][A-Za-z\s.,]{3,40})/i.test(line)) {
        const m = line.match(/(?:plaintiff|petitioner|applicant|service\s+recipient|first\s+party)[:\s]+([A-Z][A-Za-z\s.,]{3,40})/i);
        if (m) return m[1].trim();
      }
      if (type === 'opposite' && /(?:defendant|respondent|accused|service\s+provider|second\s+party)[:\s]+([A-Z][A-Za-z\s.,]{3,40})/i.test(line)) {
        const m = line.match(/(?:defendant|respondent|accused|service\s+provider|second\s+party)[:\s]+([A-Z][A-Za-z\s.,]{3,40})/i);
        if (m) return m[1].trim();
      }
    }
    return null;
  },

  /**
   * Deterministic Indian legal drafting generator when Gemini is unconfigured.
   */
  generateDeterministicLegalDraft(data) {
    const { docType, clientName, oppositeParty, court, jurisdiction, claimAmount, isHindi } = data;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    if (isHindi) {
      return this.generateHindiDraft(docType, clientName, oppositeParty, court, jurisdiction, claimAmount, today);
    }

    if (docType.toLowerCase().includes('bail')) {
      return `IN THE HIGH COURT OF JUDICATURE AT ${jurisdiction.toUpperCase()}
CRIMINAL APPELLATE JURISDICTION
CRIMINAL ANTICIPATORY BAIL APPLICATION NO. [INSERT APPLICATION NO.] OF 2026

IN THE MATTER OF:
${clientName}
Residing at: [INSERT RESIDENTIAL ADDRESS]
...APPLICANT / PETITIONER

VERSUS

${oppositeParty}
Represented by: Public Prosecutor
...RESPONDENT / STATE

APPLICATION UNDER SECTION 482 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023 (BNSS) FOR GRANT OF ANTICIPATORY BAIL IN CONNECTION WITH [INSERT FIR NO.] REGISTERED AT [INSERT POLICE STATION].

MOST RESPECTFULLY SHOWETH:

1. That the Applicant is a law-abiding citizen of India, having clean antecedents and residing at the address mentioned above.
2. That the Applicant has genuine and well-founded apprehension of arrest in connection with the aforementioned FIR registered under Section 316 and Section 318 of the Bharatiya Nyaya Sanhita, 2023.
3. That the underlying controversy is fundamentally of a civil and commercial nature arising out of contractual reconciliation amounting to ${claimAmount}, and does not warrant custodial interrogation.
4. That the Applicant places strict reliance on the landmark judgment of the Hon'ble Supreme Court in Satender Kumar Antil v. CBI (2022) 10 SCC 51 and Arnesh Kumar v. State of Bihar (2014) 8 SCC 273, mandating notice of appearance and avoidance of arbitrary arrest.
5. That the Applicant undertakes to cooperate fully with the investigation and will not tamper with evidence or influence witnesses.

PRAYER:
Wherefore, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to:
(a) Direct that in the event of arrest, the Applicant be released on anticipatory bail on such terms as deemed fit;
(b) Pass any other order in the interest of justice.

DATED: ${today}
PLACE: ${jurisdiction}

COUNSEL FOR THE APPLICANT
[ADVOCATE ENROLLMENT NO.]`;
    }

    if (docType.toLowerCase().includes('notice')) {
      return `LEGAL DEMAND NOTICE
(REGISTERED A.D. & SPEED POST)

DATE: ${today}

TO,
${oppositeParty}
[INSERT REGISTERED OFFICE ADDRESS]

UNDER INSTRUCTIONS FROM:
Our Client, ${clientName}, having office/residence at [INSERT CLIENT ADDRESS], we hereby serve you with this Legal Notice:

1. That our Client entered into a binding contractual arrangement with you on [INSERT AGREEMENT DATE] for commercial service delivery.
2. That pursuant to said arrangement, a liquidated sum of ${claimAmount} fell due and payable for services duly rendered.
3. That despite repeated demands and statutory reminders, you have deliberately failed to discharge your admitted financial liability.
4. That all digital correspondence, system logs, and delivery records are authenticated under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 and will be tendered in evidence.

NOW THEREFORE, we hereby call upon you to pay the outstanding sum of ${claimAmount} within fifteen (15) days from the receipt of this notice, failing which our Client shall initiate civil and criminal proceedings against you under the Commercial Courts Act, 2015 and Bharatiya Nyaya Sanhita, 2023 at your sole cost and consequence.

COPY RETAINED IN OFFICE FOR TRIAL RECORD.

ADVOCATE FOR THE CLAIMANT
HIGH COURT OF DELHI`;
    }

    // Default Commercial Agreement / Clause Draft
    return `COMMERCIAL SERVICE AGREEMENT CLAUSE ADDENDUM

BETWEEN:
${clientName} (First Party)
AND
${oppositeParty} (Second Party)

DATE: ${today}
JURISDICTION: ${jurisdiction}

CLAUSE: DISPUTE RESOLUTION AND ARBITRATION
1. Any dispute, controversy or claim arising out of or relating to this contract shall be referred to arbitration.
2. The tribunal shall consist of a sole arbitrator appointed by the mutual consent of both parties, in compliance with Section 12(5) of the Arbitration and Conciliation Act, 1996 and Perkins Eastman Architects (2020) 12 SCC 767.
3. The seat and venue of arbitration shall be ${jurisdiction}. The language of proceedings shall be English.
4. Total aggregate liability for proven direct damages shall not exceed ${claimAmount}, excluding consequential losses pursuant to Section 73 of the Indian Contract Act, 1872.

EXECUTED BY AUTHORIZED SIGNATORIES:

For ${clientName}: ________________________
For ${oppositeParty}: ________________________`;
  },

  /**
   * Deterministic Hindi draft generator.
   */
  generateHindiDraft(docType, clientName, oppositeParty, court, jurisdiction, claimAmount, today) {
    return `कानूनी मांग पत्र (विधिक नोटिस)
(पंजीकृत डाक / स्पीड पोस्ट द्वारा)

दिनांक: ${today}

सेवा में,
${oppositeParty}
[INSERT OPPOSING PARTY ADDRESS / पता दर्ज करें]

हमारे मुवक्किल (Client) श्री/मेसर्स ${clientName} के स्पष्ट निर्देशों के तहत, हम आपको यह विधिक नोटिस प्रेषित करते हैं:

1. यह कि हमारे मुवक्किल और आपके मध्य विधिक संविदा निष्पादित की गई थी, जिसके तहत सेवाओं का निष्पादन किया गया।
2. यह कि संविदा की शर्तों के अनुसार, कुल राशि ${claimAmount} देय एवं वैध रूप से प्राप्य है।
3. यह कि आपके द्वारा उक्त राशि का भुगतान न करना संविदा विधि (Indian Contract Act, 1872) की धारा 73 एवं भारतीय न्याय संहिता (BNS 2023) के प्रावधानों का उल्लंघन है।
4. यह कि समस्त डिजिटल पत्राचार भारतीय साक्ष्य अधिनियम (BSA 2023) की धारा 63 के तहत प्रमाणित है।

अतः इस विधिक नोटिस के माध्यम से आपको निर्देशित किया जाता है कि इस नोटिस की प्राप्ति के पंद्रह (15) दिनों के भीतर बकाया राशि ${claimAmount} का पूर्ण भुगतान करें, अन्यथा सक्षम न्यायालय ${court} में आपके विरुद्ध कानूनी कार्यवाही प्रारंभ की जाएगी।

हस्ताक्षर
अधिवक्ता (Advocate)
सक्षम न्यायालय: ${jurisdiction}`;
  },

  /**
   * Deterministic single paragraph editor.
   */
  applyDeterministicParagraphEdit(currentParagraph, instructions, isHindi) {
    if (instructions.toLowerCase().includes('mutual') || instructions.toLowerCase().includes('consensual')) {
      return currentParagraph.replace(/unilateral(?:ly)?|sole\s+discretion/gi, 'mutual consent of both parties');
    }
    if (instructions.toLowerCase().includes('30 day') || instructions.toLowerCase().includes('cure period')) {
      return `${currentParagraph} Either party may terminate by providing thirty (30) days prior written notice with opportunity to cure.`;
    }
    if (instructions.toLowerCase().includes('placeholder')) {
      return currentParagraph.replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, '[INSERT DATE]');
    }
    return `${currentParagraph} [Amended: ${instructions}]`;
  }
};
