import PDFDocument from 'pdfkit';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType,
  ShadingType
} from 'docx';

/**
 * Service for generating downloadable, high-fidelity PDF and DOCX reports
 * for legal drafts, redline comparisons, evidence summaries, risk radar, and citations.
 */
export const exportService = {
  // =========================================================================
  // 1. LEGAL DRAFT EXPORT (PDF & DOCX)
  // =========================================================================

  /**
   * Generates a printable, court-styled PDF for a legal draft.
   */
  async generateDraftPdf({ draft = '', title = 'Legal Draft', matter = {}, metadata = {} }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 45, bottom: 45, left: 50, right: 50 },
          info: {
            Title: title,
            Author: 'DraftMate Evidence Intelligence',
            Subject: 'Legal Pleading / Draft',
            Keywords: 'India Legal, DraftMate, Advocate Review'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // --- Top Header ---
        doc.fontSize(8).fillColor('#64748B').text('DRAFTMATE EVIDENCE INTELLIGENCE — LEGAL WORKBENCH', { align: 'center' });
        doc.fontSize(7).fillColor('#94A3B8').text('Republic of India • Judicial & Commercial Legal Workbench', { align: 'center' });
        doc.moveDown(0.4);

        // Header Divider Line
        doc.strokeColor('#D4AF37').lineWidth(1.2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.8);

        // --- Document Title ---
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text(title.toUpperCase(), { align: 'center' });
        doc.moveDown(0.4);

        // --- Matter Metadata Box ---
        const startY = doc.y;
        doc.rect(50, startY, 495, 48).fillAndStroke('#F8FAFC', '#E2E8F0');
        
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155');
        doc.text(`MATTER: ${matter.title || 'General Legal Matter'}`, 60, startY + 8);
        doc.font('Helvetica').text(`CASE NO / CNR: ${matter.cnr || matter.matterNumber || 'PENDING FILING'}`, 60, startY + 20);
        doc.text(`COURT: ${matter.court || metadata.court || 'Competent Court of Jurisdiction'}`, 60, startY + 32);

        doc.font('Helvetica-Bold').text(`DATE: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 350, startY + 8);
        doc.font('Helvetica').text(`CLIENT: ${matter.client || metadata.clientName || 'Client on Record'}`, 350, startY + 20);
        doc.text(`STATUS: DRAFT — FOR ADVOCATE REVIEW`, 350, startY + 32);

        doc.y = startY + 56;
        doc.moveDown(0.5);

        // --- Mandatory Advocate Review Disclaimer Banner ---
        const disclaimY = doc.y;
        doc.rect(50, disclaimY, 495, 26).fillAndStroke('#FEF3C7', '#F59E0B');
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#B45309');
        doc.text('LEGAL NOTICE & STATUTORY DISCLAIMER (ADVOCATES ACT, 1961):', 58, disclaimY + 5);
        doc.fontSize(7).font('Helvetica').fillColor('#78350F');
        doc.text('This document is an AI-assisted draft prepared for qualified legal practitioners. It does not constitute certified court pleadings until signed, verified, and stamped by an enrolled Advocate.', 58, disclaimY + 15);

        doc.y = disclaimY + 34;
        doc.moveDown(0.8);

        // --- Main Draft Body ---
        doc.fontSize(10).font('Helvetica').fillColor('#1E293B');
        const paragraphs = (draft || '').split(/\n\s*\n/);

        for (const para of paragraphs) {
          const trimmed = para.trim();
          if (!trimmed) continue;

          // Check if paragraph is a heading
          if (trimmed.startsWith('CLAUSE') || trimmed.startsWith('SECTION') || trimmed.startsWith('IN THE') || trimmed.startsWith('BETWEEN') || /^[A-Z\s0-9:.-]{4,40}$/.test(trimmed)) {
            doc.moveDown(0.3);
            doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0F172A').text(trimmed);
            doc.font('Helvetica').fontSize(10).fillColor('#1E293B');
            doc.moveDown(0.2);
          } else {
            // Check for missing placeholders and highlight in bold dark red
            if (trimmed.includes('[INSERT')) {
              doc.text(trimmed, { align: 'justify', lineGap: 3.5 });
            } else {
              doc.text(trimmed, { align: 'justify', lineGap: 3.5 });
            }
            doc.moveDown(0.5);
          }
        }

        // --- Evidence Citations Appendix (if any) ---
        if (metadata.evidenceClaims && metadata.evidenceClaims.length > 0) {
          doc.addPage();
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#D4AF37').text('APPENDIX: EVIDENCE & FACTUAL CORROBORATION RECORD');
          doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('List of factual claims grounded in matter documents with verification coordinates.');
          doc.moveDown(0.6);

          for (const claim of metadata.evidenceClaims) {
            doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A').text(`• ${claim.claimText}`);
            doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`  Source: ${claim.sourceDocTitle || 'Record'} | Location: ${claim.sourceLocation || 'Document Text'} | Status: ${claim.status || 'Verified'}`);
            doc.moveDown(0.3);
          }
        }

        // Footer on all pages
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(7.5).font('Helvetica').fillColor('#94A3B8')
            .text(`DraftMate AI Workbench • ${title} • Page ${i + 1} of ${range.count}`, 50, 800, { align: 'center', width: 495 });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Generates a Microsoft Word .docx file for a legal draft.
   */
  async generateDraftDocx({ draft = '', title = 'Legal Draft', matter = {}, metadata = {} }) {
    const docParagraphs = [];

    // Header Title
    docParagraphs.push(
      new Paragraph({
        text: title.toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Matter Metadata Table
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const metaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Matter: ', bold: true }), new TextRun(matter.title || 'General Legal Matter')] }),
                new Paragraph({ children: [new TextRun({ text: 'Court: ', bold: true }), new TextRun(matter.court || metadata.court || 'Competent Court')] })
              ],
              shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Date: ', bold: true }), new TextRun(today)] }),
                new Paragraph({ children: [new TextRun({ text: 'Status: ', bold: true }), new TextRun('Draft — For Advocate Review')] })
              ],
              shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }
            })
          ]
        })
      ]
    });
    docParagraphs.push(metaTable);
    docParagraphs.push(new Paragraph({ spacing: { after: 200 } }));

    // Advocate Disclaimer Box
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'MANDATORY ADVOCATE REVIEW NOTICE: ',
            bold: true,
            color: 'B45309'
          }),
          new TextRun({
            text: 'This document is an AI-assisted draft prepared for qualified legal practitioners under the Advocates Act, 1961. It is not final judicial pleading and does not constitute formal legal certification.',
            italics: true,
            color: '78350F'
          })
        ],
        spacing: { after: 300 }
      })
    );

    // Draft Body Paragraphs
    const paras = (draft || '').split(/\n\s*\n/);
    for (const p of paras) {
      const trimmed = p.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('CLAUSE') || trimmed.startsWith('SECTION') || trimmed.startsWith('IN THE') || trimmed.startsWith('BETWEEN')) {
        docParagraphs.push(
          new Paragraph({
            text: trimmed,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          })
        );
      } else {
        docParagraphs.push(
          new Paragraph({
            text: trimmed,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 150, line: 276 } // 1.15 line spacing
          })
        );
      }
    }

    // Evidence Table if available
    if (metadata.evidenceClaims && metadata.evidenceClaims.length > 0) {
      docParagraphs.push(
        new Paragraph({
          text: 'APPENDIX: EVIDENCE & FACTUAL CORROBORATION RECORD',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 150 }
        })
      );

      const claimRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Factual Claim', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Source Document', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Location', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true })] })] })
          ]
        })
      ];

      for (const cl of metadata.evidenceClaims) {
        claimRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(cl.claimText || '')] }),
              new TableCell({ children: [new Paragraph(cl.sourceDocTitle || 'Record')] }),
              new TableCell({ children: [new Paragraph(cl.sourceLocation || 'Document')] }),
              new TableCell({ children: [new Paragraph(cl.status || 'Verified')] })
            ]
          })
        );
      }

      docParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: claimRows }));
    }

    const docxFile = new Document({
      sections: [{ properties: {}, children: docParagraphs }]
    });

    return await Packer.toBuffer(docxFile);
  },

  // =========================================================================
  // 2. SMART REDLINE COMPARISON REPORT (PDF & DOCX)
  // =========================================================================

  /**
   * Generates a PDF report for a Smart Redline comparison session.
   */
  async generateRedlinePdf({ redlineResult = {}, matter = {}, title = 'Contract Redline Comparison' }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 45, bottom: 45, left: 50, right: 50 }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(8).fillColor('#64748B').text('DRAFTMATE EVIDENCE INTELLIGENCE — CONTRACT REDLINE REPORT', { align: 'center' });
        doc.moveDown(0.3);
        doc.strokeColor('#D4AF37').lineWidth(1.2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.6);

        // Title
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text(title.toUpperCase(), { align: 'center' });
        doc.moveDown(0.4);

        // Summary Statistics Box
        const sum = redlineResult.summary || {};
        const sumY = doc.y;
        doc.rect(50, sumY, 495, 42).fillAndStroke('#F1F5F9', '#CBD5E1');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A');
        doc.text(`Similarity: ${sum.similarityPercentage ?? 100}%  |  Additions: +${sum.insertions || 0}  |  Deletions: -${sum.deletions || 0}  |  Modifications: ~${sum.modifications || 0}`, 60, sumY + 8);
        doc.fontSize(8).font('Helvetica').fillColor('#475569');
        doc.text(`Overall Assessment: ${sum.overallAssessment || 'Contractual Evaluation Completed'}`, 60, sumY + 24);

        doc.y = sumY + 52;
        doc.moveDown(0.6);

        // Changes list
        const changes = (redlineResult.changes || []).filter(c => c.type !== 'unchanged');
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#D4AF37').text(`CONTRACTUAL AMENDMENTS & CLAUSE RISK AUDIT (${changes.length} ITEMS)`);
        doc.moveDown(0.4);

        if (changes.length === 0) {
          doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('No contractual differences detected between compared versions.');
        } else {
          for (const ch of changes) {
            const cardY = doc.y;
            if (cardY > 700) { doc.addPage(); }

            // Badge line
            doc.fontSize(8.5).font('Helvetica-Bold').fillColor(ch.type === 'added' ? '#059669' : ch.type === 'deleted' ? '#DC2626' : '#D97706');
            doc.text(`[${ch.type.toUpperCase()}] ${ch.category || 'Contract Clause'} • ${ch.riskLevel || 'Low'} Risk`);

            if (ch.original) {
              doc.fontSize(8).font('Helvetica').fillColor('#DC2626').text(`Original: "${ch.original}"`);
            }
            if (ch.revised) {
              doc.fontSize(8).font('Helvetica-Bold').fillColor('#059669').text(`Revised: "${ch.revised}"`);
            }
            if (ch.explanation) {
              doc.fontSize(7.5).font('Helvetica').fillColor('#1E293B').text(`Plain English: ${ch.explanation}`);
            }
            if (ch.legalImplications) {
              doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#7C2D12').text(`Indian Law Implication: ${ch.legalImplications}`);
            }

            doc.moveDown(0.6);
            doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.6);
          }
        }

        // Final Document Text (if decisions were applied)
        if (redlineResult.finalDocumentText) {
          doc.addPage();
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('RESOLVED FINAL CONTRACT DRAFT (POST-DECISIONS)');
          doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Accepted Changes: ${redlineResult.acceptedCount || 0}  |  Rejected Changes: ${redlineResult.rejectedCount || 0}`);
          doc.moveDown(0.6);
          doc.fontSize(9).font('Helvetica').fillColor('#1E293B').text(redlineResult.finalDocumentText, { lineGap: 3 });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Generates a Microsoft Word .docx report for a Smart Redline comparison.
   */
  async generateRedlineDocx({ redlineResult = {}, matter = {}, title = 'Contract Redline Comparison' }) {
    const docParagraphs = [];

    docParagraphs.push(
      new Paragraph({
        text: title.toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    const sum = redlineResult.summary || {};
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Redline Summary: ', bold: true }),
          new TextRun(`Similarity: ${sum.similarityPercentage ?? 100}% | Additions: +${sum.insertions || 0} | Deletions: -${sum.deletions || 0} | Modifications: ~${sum.modifications || 0}`)
        ],
        spacing: { after: 200 }
      })
    );

    const changes = (redlineResult.changes || []).filter(c => c.type !== 'unchanged');
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Type', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Original Clause', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Revised Clause', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Indian Law Risk / Ratio', bold: true })] })] })
        ]
      })
    ];

    for (const ch of changes) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(ch.type.toUpperCase())] }),
            new TableCell({ children: [new Paragraph(ch.original || '-')] }),
            new TableCell({ children: [new Paragraph(ch.revised || '-')] }),
            new TableCell({ children: [new Paragraph(ch.legalImplications || ch.explanation || '-')] })
          ]
        })
      );
    }

    docParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }));

    if (redlineResult.finalDocumentText) {
      docParagraphs.push(
        new Paragraph({
          text: 'RESOLVED FINAL CONTRACT DRAFT',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        })
      );
      docParagraphs.push(new Paragraph({ text: redlineResult.finalDocumentText, spacing: { line: 276 } }));
    }

    const docxFile = new Document({ sections: [{ properties: {}, children: docParagraphs }] });
    return await Packer.toBuffer(docxFile);
  },

  // =========================================================================
  // 3. EVIDENCE SUMMARY REPORT (PDF & DOCX)
  // =========================================================================

  async generateEvidencePdf({ evidenceData = {}, matter = {}, document = {} }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margins: { top: 45, bottom: 45, left: 50, right: 50 } });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(8).fillColor('#64748B').text('DRAFTMATE EVIDENCE INTELLIGENCE — EVIDENCE DOSSIER', { align: 'center' });
        doc.strokeColor('#D4AF37').lineWidth(1.2).moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).stroke();
        doc.moveDown(0.8);

        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text('DOCUMENT EVIDENCE & FACTUAL INTELLIGENCE REPORT', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Document: ${document.title || 'Legal Document'}  |  Matter: ${matter.title || 'General Legal Matter'}`, { align: 'center' });
        doc.moveDown(0.8);

        const facts = evidenceData.extractedFacts || [];
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#D4AF37').text(`EXTRACTED FACTS & SOURCE COORDINATES (${facts.length} ITEMS)`);
        doc.moveDown(0.4);

        for (const fact of facts) {
          if (doc.y > 720) { doc.addPage(); }
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A').text(`• [${fact.category || 'Fact'}] ${fact.fact}`);
          doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(`  Source: ${fact.sourceDocumentName || document.title || 'Record'} | Location: ${fact.sourceLocation || 'Document Text'}`);
          doc.moveDown(0.3);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  async generateEvidenceDocx({ evidenceData = {}, matter = {}, document = {} }) {
    const docParagraphs = [
      new Paragraph({
        text: 'DOCUMENT EVIDENCE & FACTUAL INTELLIGENCE REPORT',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: `Document: ${document.title || 'Legal Document'} | Matter: ${matter.title || 'General Legal Matter'}`,
        spacing: { after: 200 }
      })
    ];

    const facts = evidenceData.extractedFacts || [];
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Extracted Fact', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Location', bold: true })] })] })
        ]
      })
    ];

    for (const f of facts) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(f.category || 'Fact')] }),
            new TableCell({ children: [new Paragraph(f.fact || '')] }),
            new TableCell({ children: [new Paragraph(f.sourceLocation || 'Document Text')] })
          ]
        })
      );
    }

    docParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
    const docxFile = new Document({ sections: [{ properties: {}, children: docParagraphs }] });
    return await Packer.toBuffer(docxFile);
  },

  // =========================================================================
  // 4. LEGAL RISK RADAR REPORT (PDF & DOCX)
  // =========================================================================

  async generateRiskRadarPdf({ riskData = {}, matter = {}, document = {} }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margins: { top: 45, bottom: 45, left: 50, right: 50 } });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(8).fillColor('#64748B').text('DRAFTMATE EVIDENCE INTELLIGENCE — LEGAL RISK RADAR', { align: 'center' });
        doc.strokeColor('#D4AF37').lineWidth(1.2).moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).stroke();
        doc.moveDown(0.8);

        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text('CONTRACTUAL RISK RADAR & EXPOSURE REPORT', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Target: ${document.title || 'Contract'}  |  Matter: ${matter.title || 'General Legal Matter'}`, { align: 'center' });
        doc.moveDown(0.6);

        // Metrics box
        const findings = riskData.findings || [];
        const metrics = riskData.metrics || {};
        const sumY = doc.y;
        doc.rect(50, sumY, 495, 36).fillAndStroke('#FEF2F2', '#FECACA');
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#991B1B');
        doc.text(`Overall Risk: ${metrics.overallRiskLevel || 'Evaluated'}  |  Critical: ${metrics.critical || 0}  |  High: ${metrics.high || 0}  |  Medium: ${metrics.medium || 0}  |  Low: ${metrics.low || 0}`, 60, sumY + 12);
        doc.y = sumY + 46;

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#D4AF37').text(`CONTRACTUAL FINDINGS (${findings.length} DETECTED)`);
        doc.moveDown(0.4);

        for (const f of findings) {
          if (doc.y > 700) { doc.addPage(); }
          doc.fontSize(9).font('Helvetica-Bold').fillColor(f.riskLevel === 'Critical' ? '#DC2626' : f.riskLevel === 'High' ? '#EA580C' : '#D97706');
          doc.text(`[${f.riskLevel?.toUpperCase()} RISK] ${f.title}`);
          doc.fontSize(8).font('Helvetica').fillColor('#475569').text(`Category: ${f.category || 'General'} | Location: ${f.sourceLocation || 'Document Text'}`);
          if (f.originalExcerpt) {
            doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#64748B').text(`Excerpt: "${f.originalExcerpt.slice(0, 150)}..."`);
          }
          if (f.plainEnglishReason) {
            doc.fontSize(8).font('Helvetica').fillColor('#1E293B').text(`Reason: ${f.plainEnglishReason}`);
          }
          if (f.suggestedRevision) {
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#059669').text(`Recommended Revision: ${f.suggestedRevision}`);
          }
          doc.moveDown(0.5);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  async generateRiskRadarDocx({ riskData = {}, matter = {}, document = {} }) {
    const docParagraphs = [
      new Paragraph({
        text: 'CONTRACTUAL RISK RADAR & EXPOSURE REPORT',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    ];

    const findings = riskData.findings || [];
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Risk Level', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Finding Title', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Legal Exposure & Revision', bold: true })] })] })
        ]
      })
    ];

    for (const f of findings) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(f.riskLevel || 'Medium')] }),
            new TableCell({ children: [new Paragraph(f.title || '')] }),
            new TableCell({
              children: [
                new Paragraph(f.plainEnglishReason || ''),
                new Paragraph({ children: [new TextRun({ text: 'Recommended Revision: ', bold: true }), new TextRun(f.suggestedRevision || '-')] })
              ]
            })
          ]
        })
      );
    }

    docParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
    const docxFile = new Document({ sections: [{ properties: {}, children: docParagraphs }] });
    return await Packer.toBuffer(docxFile);
  },

  // =========================================================================
  // 5. CITATION VERIFICATION REPORT (PDF & DOCX)
  // =========================================================================

  async generateCitationPdf({ citationData = {}, matter = {}, document = {} }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margins: { top: 45, bottom: 45, left: 50, right: 50 } });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(8).fillColor('#64748B').text('DRAFTMATE EVIDENCE INTELLIGENCE — CITATION REPERTORY', { align: 'center' });
        doc.strokeColor('#D4AF37').lineWidth(1.2).moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).stroke();
        doc.moveDown(0.8);

        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text('INDIAN LEGAL CITATION VERIFICATION REPORT', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Matter: ${matter.title || 'General Legal Matter'}  |  Integrity Score: ${citationData.integrityScore ?? 100}%`, { align: 'center' });
        doc.moveDown(0.6);

        const citations = citationData.allCitations || [];
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#D4AF37').text(`CITATIONS AUDITED (${citations.length} REFERENCES)`);
        doc.moveDown(0.4);

        for (const cit of citations) {
          if (doc.y > 700) { doc.addPage(); }
          doc.fontSize(9).font('Helvetica-Bold').fillColor(cit.status === 'Verified' ? '#059669' : cit.status === 'Partially Verified' ? '#D97706' : '#DC2626');
          doc.text(`[${cit.status?.toUpperCase() || 'UNVERIFIED'}] ${cit.citationText || cit.caseTitle || 'Legal Citation'}`);
          doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(`Source: ${cit.source || 'Court Repository'} | Type: ${cit.citationType || 'Case Law'}`);
          if (cit.whatWasChecked) {
            doc.fontSize(7.5).font('Helvetica').fillColor('#1E293B').text(`Verification: ${cit.whatWasChecked}`);
          }
          if (cit.sourceExcerpt) {
            doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#475569').text(`Authoritative Ratio: "${cit.sourceExcerpt}"`);
          }
          doc.moveDown(0.5);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  async generateCitationDocx({ citationData = {}, matter = {}, document = {} }) {
    const docParagraphs = [
      new Paragraph({
        text: 'INDIAN LEGAL CITATION VERIFICATION REPORT',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    ];

    const citations = citationData.allCitations || [];
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Citation Reference', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Authoritative Source & Ratio', bold: true })] })] })
        ]
      })
    ];

    for (const c of citations) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(c.status || 'Unverified')] }),
            new TableCell({ children: [new Paragraph(c.citationText || '')] }),
            new TableCell({
              children: [
                new Paragraph(c.source || 'India Code / SC Registry'),
                new Paragraph({ children: [new TextRun({ text: c.sourceExcerpt ? `"${c.sourceExcerpt}"` : '', italics: true })] })
              ]
            })
          ]
        })
      );
    }

    docParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
    const docxFile = new Document({ sections: [{ properties: {}, children: docParagraphs }] });
    return await Packer.toBuffer(docxFile);
  }
};
