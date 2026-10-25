// Smart Redline Diff Service using Longest Common Subsequence (LCS)
// Evaluates contractual modifications under Indian Contract Act, Arbitration Act, and BSA 2023.

export const redlineService = {
  /**
   * Computes Longest Common Subsequence (LCS) matrix for two arrays of tokens/lines.
   */
  computeLCSMatrix(tokensA, tokensB) {
    const m = tokensA.length;
    const n = tokensB.length;
    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (tokensA[i] === tokensB[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }
    return dp;
  },

  /**
   * Performs word-level diff between two lines to generate inline <ins> and <del> tokens.
   */
  computeWordDiff(originalLine, revisedLine) {
    const wordsA = (originalLine || '').split(/(\s+|[.,;()"'`]+)/).filter(Boolean);
    const wordsB = (revisedLine || '').split(/(\s+|[.,;()"'`]+)/).filter(Boolean);

    const dp = this.computeLCSMatrix(wordsA, wordsB);
    let i = wordsA.length;
    let j = wordsB.length;

    const diffTokens = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && wordsA[i - 1] === wordsB[j - 1]) {
        diffTokens.unshift({ type: 'equal', text: wordsA[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diffTokens.unshift({ type: 'added', text: wordsB[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        diffTokens.unshift({ type: 'deleted', text: wordsA[i - 1] });
        i--;
      }
    }

    return diffTokens;
  },

  /**
   * Performs reliable line-by-line diff using LCS, detecting insertions, deletions,
   * modifications, and legal implications under Indian contract law.
   */
  compareTexts(originalText = '', revisedText = '', options = {}) {
    const orig = (originalText || '').trim();
    const rev = (revisedText || '').trim();

    const linesA = orig ? orig.split('\n') : [];
    const linesB = rev ? rev.split('\n') : [];

    const dp = this.computeLCSMatrix(linesA, linesB);

    let i = linesA.length;
    let j = linesB.length;

    const rawChanges = [];

    // Backtrack from bottom-right of matrix to discover differences
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
        rawChanges.unshift({
          type: 'unchanged',
          originalLine: linesA[i - 1],
          revisedLine: linesB[j - 1],
          lineNumOrig: i,
          lineNumRev: j
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        rawChanges.unshift({
          type: 'added',
          originalLine: '',
          revisedLine: linesB[j - 1],
          lineNumOrig: null,
          lineNumRev: j
        });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        rawChanges.unshift({
          type: 'deleted',
          originalLine: linesA[i - 1],
          revisedLine: '',
          lineNumOrig: i,
          lineNumRev: null
        });
        i--;
      }
    }

    // Post-process rawChanges to cluster adjacent deleted + added lines into 'modified' clauses
    const changes = [];
    let changeCounter = 1;
    let idx = 0;

    let insertionsCount = 0;
    let deletionsCount = 0;
    let modificationsCount = 0;
    let unchangedCount = 0;

    while (idx < rawChanges.length) {
      const cur = rawChanges[idx];

      if (cur.type === 'unchanged') {
        unchangedCount++;
        changes.push({
          id: `line-${idx + 1}`,
          type: 'unchanged',
          original: cur.originalLine,
          revised: cur.revisedLine,
          lineNumOrig: cur.lineNumOrig,
          lineNumRev: cur.lineNumRev,
          risk: { level: 'None', notice: null }
        });
        idx++;
      } else {
        // Collect contiguous diff block (all deleted and added lines until next unchanged or end)
        const deletedHunk = [];
        const addedHunk = [];

        while (idx < rawChanges.length && rawChanges[idx].type !== 'unchanged') {
          if (rawChanges[idx].type === 'deleted') {
            deletedHunk.push(rawChanges[idx]);
          } else if (rawChanges[idx].type === 'added') {
            addedHunk.push(rawChanges[idx]);
          }
          idx++;
        }

        // Pair up deleted and added into modifications
        const minPairs = Math.min(deletedHunk.length, addedHunk.length);
        for (let p = 0; p < minPairs; p++) {
          const delItem = deletedHunk[p];
          const addItem = addedHunk[p];
          modificationsCount++;
          const changeId = `change-${changeCounter++}`;
          const wordDiff = this.computeWordDiff(delItem.originalLine, addItem.revisedLine);
          const legalAnalysis = this.assessLegalImplications(delItem.originalLine, addItem.revisedLine, 'modified');

          changes.push({
            id: changeId,
            type: 'modified',
            original: delItem.originalLine,
            revised: addItem.revisedLine,
            lineNumOrig: delItem.lineNumOrig,
            lineNumRev: addItem.lineNumRev,
            wordDiff,
            explanation: legalAnalysis.explanation,
            legalImplications: legalAnalysis.implications,
            category: legalAnalysis.category,
            riskLevel: legalAnalysis.riskLevel,
            suggestedAction: legalAnalysis.suggestedAction
          });
        }

        // Any leftover deletions
        for (let d = minPairs; d < deletedHunk.length; d++) {
          const delItem = deletedHunk[d];
          deletionsCount++;
          const changeId = `change-${changeCounter++}`;
          const legalAnalysis = this.assessLegalImplications(delItem.originalLine, '', 'deleted');

          changes.push({
            id: changeId,
            type: 'deleted',
            original: delItem.originalLine,
            revised: '',
            lineNumOrig: delItem.lineNumOrig,
            lineNumRev: null,
            wordDiff: [{ type: 'deleted', text: delItem.originalLine }],
            explanation: legalAnalysis.explanation,
            legalImplications: legalAnalysis.implications,
            category: legalAnalysis.category,
            riskLevel: legalAnalysis.riskLevel,
            suggestedAction: legalAnalysis.suggestedAction
          });
        }

        // Any leftover additions
        for (let a = minPairs; a < addedHunk.length; a++) {
          const addItem = addedHunk[a];
          insertionsCount++;
          const changeId = `change-${changeCounter++}`;
          const legalAnalysis = this.assessLegalImplications('', addItem.revisedLine, 'added');

          changes.push({
            id: changeId,
            type: 'added',
            original: '',
            revised: addItem.revisedLine,
            lineNumOrig: null,
            lineNumRev: addItem.lineNumRev,
            wordDiff: [{ type: 'added', text: addItem.revisedLine }],
            explanation: legalAnalysis.explanation,
            legalImplications: legalAnalysis.implications,
            category: legalAnalysis.category,
            riskLevel: legalAnalysis.riskLevel,
            suggestedAction: legalAnalysis.suggestedAction
          });
        }
      }
    }

    const totalLines = linesA.length + insertionsCount;
    const similarity = linesA.length > 0
      ? Math.round((unchangedCount / Math.max(linesA.length, linesB.length)) * 100)
      : (linesB.length === 0 ? 100 : 0);

    return {
      summary: {
        totalChanges: changeCounter - 1,
        unchangedLines: unchangedCount,
        insertions: insertionsCount,
        deletions: deletionsCount,
        modifications: modificationsCount,
        similarityPercentage: similarity,
        overallAssessment: modificationsCount > 2 || deletionsCount > 1
          ? 'Substantive Contractual Alterations Detected'
          : 'Minor Editorial & Procedural Revisions'
      },
      changes
    };
  },

  /**
   * Assesses legal risk and produces plain-language explanations of changes under Indian Law.
   */
  assessLegalImplications(origLine, revLine, changeType) {
    const orig = (origLine || '').toLowerCase();
    const rev = (revLine || '').toLowerCase();
    const combo = `${orig} ${rev}`;

    // 1. Arbitration / Dispute Resolution
    if (/arbitrat|sole\s+arbitrator|jurisdiction|perkins/i.test(combo)) {
      if (/unilateral/i.test(orig) && !/unilateral/i.test(rev)) {
        return {
          category: 'Dispute Resolution & Arbitration',
          riskLevel: 'Risk Mitigated (Critical)',
          explanation: 'Removed unilateral arbitrator appointment and instituted consensual mutual appointment.',
          implications: 'Cures void appointment risk under Section 12(5) of the Arbitration & Conciliation Act, 1996 and Perkins Eastman (2020) 12 SCC 767 precedent.',
          suggestedAction: 'Accept change to ensure arbitral clause validity.'
        };
      }
      if (/seat\s+of\s+arbitration|venue/i.test(combo)) {
        return {
          category: 'Dispute Resolution & Jurisdiction',
          riskLevel: 'Neutral / Clarification',
          explanation: 'Arbitral seat or venue designation altered.',
          implications: 'Determines supervisory jurisdiction of the High Court under Section 2(1)(e) and Section 34 of the Arbitration Act.',
          suggestedAction: 'Confirm city aligns with principal commercial assets.'
        };
      }
    }

    // 2. Indemnity & Liability
    if (/indemnif|hold harmless|liability\s+cap/i.test(combo)) {
      if (/uncapped/i.test(orig) && !/uncapped/i.test(rev)) {
        return {
          category: 'Indemnity & Liability Limitations',
          riskLevel: 'Risk Mitigated (High)',
          explanation: 'Restricted indemnity from open-ended uncapped liabilities to direct damages subject to liability cap.',
          implications: 'Aligns contract with Section 73 of the Indian Contract Act, 1872; protects client against indirect and consequential loss claims.',
          suggestedAction: 'Accept change to prevent catastrophic balance sheet exposure.'
        };
      }
      if (/cap|aggregate\s+liability/i.test(combo)) {
        return {
          category: 'Indemnity & Liability Limitations',
          riskLevel: 'Commercial Adjustment',
          explanation: 'Modified the total aggregate liability monetary ceiling.',
          implications: 'Affects financial remedy availability in event of data loss or contract breach under Section 73 Contract Act.',
          suggestedAction: 'Verify insurance coverage matches the liability cap.'
        };
      }
    }

    // 3. Liquidated Damages & Penalties
    if (/penalty|liquidated\s+damages|forfeit/i.test(combo)) {
      if (/penalty/i.test(orig) && /liquidated\s+damages/i.test(rev)) {
        return {
          category: 'Payment Terms & Penalties',
          riskLevel: 'Risk Mitigated (Moderate)',
          explanation: 'Reframed punitive penalty into genuine pre-estimate of liquidated damages.',
          implications: 'Mitigates judicial strike-down under Section 74 of the Indian Contract Act, 1872 (Fateh Chand doctrine).',
          suggestedAction: 'Accept change to improve enforceability in civil courts.'
        };
      }
    }

    // 4. Non-Compete & Restraint of Trade
    if (/non-compete|restraint|post-termination/i.test(combo)) {
      if (/post-termination/i.test(orig) && !/post-termination/i.test(rev)) {
        return {
          category: 'Negative Covenants',
          riskLevel: 'Risk Mitigated (High)',
          explanation: 'Eliminated post-termination non-compete restriction.',
          implications: 'Avoids total invalidity under Section 27 of the Indian Contract Act, 1872 and Percept D\'Mark (2006) 4 SCC 227.',
          suggestedAction: 'Accept change; post-term non-competes are void in India.'
        };
      }
    }

    // 5. Termination & Notice
    if (/terminat|notice\s+period/i.test(combo)) {
      return {
        category: 'Termination & Notice Terms',
        riskLevel: 'Operational / Procedural',
        explanation: 'Altered termination triggers, cure periods, or required notice duration.',
        implications: 'Affects transition timelines and procedural cure opportunities before contract forfeiture.',
        suggestedAction: 'Ensure operational team can comply with the new notice period.'
      };
    }

    // Default fallback
    if (changeType === 'added') {
      return {
        category: 'Clause Addition',
        riskLevel: 'Informational',
        explanation: 'New contractual clause inserted into draft.',
        implications: 'Review newly introduced rights or liabilities for reciprocal parity.',
        suggestedAction: 'Review terms carefully.'
      };
    }

    if (changeType === 'deleted') {
      return {
        category: 'Clause Deletion',
        riskLevel: 'Informational',
        explanation: 'Existing contractual clause omitted from draft.',
        implications: 'Verifies whether omitted clause leaves unaddressed liabilities or procedural gaps.',
        suggestedAction: 'Confirm intentional omission.'
      };
    }

    return {
      category: 'Clause Modification',
      riskLevel: 'Neutral',
      explanation: 'Language adjusted for clarity or editorial refinement.',
      implications: 'Minor textual changes without substantive altering of statutory obligations.',
      suggestedAction: 'Accept editorial refinement.'
    };
  },

  /**
   * Applies user accept/reject decisions to generate the final accepted draft,
   * preserving original text for rejected changes and incorporating accepted changes.
   */
  applyDecisions(originalText = '', revisedText = '', decisions = {}) {
    const comparison = this.compareTexts(originalText, revisedText);
    const finalLines = [];
    const auditTrail = [];

    for (const change of comparison.changes) {
      if (change.type === 'unchanged') {
        finalLines.push(change.original);
      } else if (change.type === 'modified') {
        const decision = decisions[change.id] || 'accept'; // Default to accept if decided
        if (decision === 'accept') {
          finalLines.push(change.revised);
          auditTrail.push({
            id: change.id,
            action: 'Accepted',
            summary: change.explanation,
            incorporatedText: change.revised
          });
        } else {
          finalLines.push(change.original);
          auditTrail.push({
            id: change.id,
            action: 'Rejected',
            summary: `Preserved original: "${change.original.slice(0, 60)}..."`,
            incorporatedText: change.original
          });
        }
      } else if (change.type === 'added') {
        const decision = decisions[change.id] || 'accept';
        if (decision === 'accept') {
          finalLines.push(change.revised);
          auditTrail.push({
            id: change.id,
            action: 'Accepted Addition',
            summary: change.explanation,
            incorporatedText: change.revised
          });
        } else {
          auditTrail.push({
            id: change.id,
            action: 'Rejected Addition',
            summary: `Discarded added line: "${change.revised.slice(0, 60)}..."`,
            incorporatedText: null
          });
        }
      } else if (change.type === 'deleted') {
        const decision = decisions[change.id] || 'accept';
        if (decision === 'accept') {
          // Accepted deletion -> line is omitted
          auditTrail.push({
            id: change.id,
            action: 'Accepted Deletion',
            summary: change.explanation,
            incorporatedText: null
          });
        } else {
          // Rejected deletion -> original line is preserved
          finalLines.push(change.original);
          auditTrail.push({
            id: change.id,
            action: 'Rejected Deletion (Preserved)',
            summary: `Restored original line: "${change.original.slice(0, 60)}..."`,
            incorporatedText: change.original
          });
        }
      }
    }

    const acceptedCount = auditTrail.filter(a => a.action.startsWith('Accepted')).length;
    const rejectedCount = auditTrail.filter(a => a.action.startsWith('Rejected')).length;

    return {
      success: true,
      finalDocumentText: finalLines.join('\n'),
      acceptedCount,
      rejectedCount,
      totalDecided: auditTrail.length,
      auditTrail
    };
  }
};
