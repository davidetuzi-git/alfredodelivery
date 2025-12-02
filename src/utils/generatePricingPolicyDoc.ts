import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

export const generatePricingPolicyDocument = async () => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: "POLICY PREZZI ALFREDO",
              bold: true,
              size: 48,
              color: "2E7D32",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Documento ufficiale delle politiche tariffarie del servizio di spesa a domicilio",
              italics: true,
              size: 24,
              color: "666666",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // Section 1: Delivery Costs
        new Paragraph({
          text: "1. COSTI DI CONSEGNA PER ZONA",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "La tariffa di consegna varia in base alla distanza tra il supermercato selezionato e l'indirizzo di consegna del cliente.",
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        }),

        // Delivery table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Zona", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
                new TableCell({ children: [new Paragraph({ text: "Distanza", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
                new TableCell({ children: [new Paragraph({ text: "Spesa < €50", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
                new TableCell({ children: [new Paragraph({ text: "Spesa ≥ €50", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Zona 1")] }),
                new TableCell({ children: [new Paragraph("0 - 7 km")] }),
                new TableCell({ children: [new Paragraph({ text: "€10,00", alignment: AlignmentType.RIGHT })] }),
                new TableCell({ children: [new Paragraph({ text: "€8,00", alignment: AlignmentType.RIGHT })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Zona 2")] }),
                new TableCell({ children: [new Paragraph("7 - 10 km")] }),
                new TableCell({ children: [new Paragraph({ text: "€15,00", alignment: AlignmentType.RIGHT })] }),
                new TableCell({ children: [new Paragraph({ text: "€12,00", alignment: AlignmentType.RIGHT })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Zona 3")] }),
                new TableCell({ children: [new Paragraph("> 10 km")] }),
                new TableCell({ children: [new Paragraph({ text: "€20,00", alignment: AlignmentType.CENTER })], columnSpan: 2 }),
              ],
            }),
          ],
        }),

        // Section 2: Loyalty Program
        new Paragraph({
          text: "2. PROGRAMMA FEDELTÀ - SCONTI SULLA CONSEGNA",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Il programma fedeltà ALFREDO premia i clienti con sconti crescenti sulla consegna basati sul numero di ordini mensili effettuati.",
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        }),

        // Loyalty table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Livello", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
                new TableCell({ children: [new Paragraph({ text: "Ordini/Mese", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
                new TableCell({ children: [new Paragraph({ text: "Sconto Consegna", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
                new TableCell({ children: [new Paragraph({ text: "Punti per €1", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("🥉 Bronzo")] }),
                new TableCell({ children: [new Paragraph("0 - 4")] }),
                new TableCell({ children: [new Paragraph({ text: "0%", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "1 punto", alignment: AlignmentType.CENTER })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("🥈 Argento")] }),
                new TableCell({ children: [new Paragraph("5 - 9")] }),
                new TableCell({ children: [new Paragraph({ text: "5%", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "1,5 punti", alignment: AlignmentType.CENTER })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("🥇 Oro")] }),
                new TableCell({ children: [new Paragraph("10+")] }),
                new TableCell({ children: [new Paragraph({ text: "10%", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "2 punti", alignment: AlignmentType.CENTER })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("💎 Platino (Abbonati)")] }),
                new TableCell({ children: [new Paragraph("10+")] }),
                new TableCell({ children: [new Paragraph({ text: "15%", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "3 punti", alignment: AlignmentType.CENTER })] }),
              ],
            }),
          ],
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Esempio: ", bold: true }),
            new TextRun({ text: "Cliente Argento con consegna base €10 → Sconto 5% = €9,50 finale" }),
          ],
          spacing: { before: 200, after: 200 },
        }),

        // Section 3: Service Fees
        new Paragraph({
          text: "3. COSTO PREPARAZIONE SPESA (PICKING)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Tipologia Cliente", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
                new TableCell({ children: [new Paragraph({ text: "Costo per Prodotto", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Utente Standard")] }),
                new TableCell({ children: [new Paragraph({ text: "€0,15", alignment: AlignmentType.RIGHT })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Abbonato Mensile")] }),
                new TableCell({ children: [new Paragraph({ text: "€0,12", alignment: AlignmentType.RIGHT })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Abbonato Annuale")] }),
                new TableCell({ children: [new Paragraph({ text: "€0,10", alignment: AlignmentType.RIGHT })] }),
              ],
            }),
          ],
        }),

        // Section 4: Minimum Order
        new Paragraph({
          text: "4. ORDINE MINIMO E SUPPLEMENTI",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Spesa minima: ", bold: true }),
            new TextRun({ text: "€25,00" }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Supplemento buste: ", bold: true }),
            new TextRun({ text: "Prime 3 buste (≈45L) incluse. Oltre: €3,00/busta aggiuntiva" }),
          ],
          spacing: { after: 200 },
        }),

        // Section 5: Water/Beverages
        new Paragraph({
          text: "5. REGOLE PER ACQUA E BEVANDE",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "ORDINE MISTO (prodotti + bevande):", bold: true }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "• Primi 9 litri di acqua inclusi nel prezzo standard",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "• Oltre 9L: €0,50/litro aggiuntivo",
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "ORDINE SOLO BEVANDE:", bold: true }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({ text: "• Minimo: 12 litri", spacing: { after: 50 } }),
        new Paragraph({ text: "• Massimo: 24 litri", spacing: { after: 50 } }),
        new Paragraph({ text: "• Costo fisso: €10,00", spacing: { after: 50 } }),
        new Paragraph({ text: "• Oltre 9L: +€0,20/litro", spacing: { after: 100 } }),

        new Paragraph({
          children: [
            new TextRun({ text: "Esempio: ", bold: true }),
            new TextRun({ text: "Ordine solo bevande 18L → Base €10 + (18-9) × €0,20 = €11,80" }),
          ],
          spacing: { before: 100, after: 200 },
        }),

        // Section 6: Scheduling
        new Paragraph({
          text: "6. PROGRAMMAZIONE CONSEGNA",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Tipo Consegna", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
                new TableCell({ children: [new Paragraph({ text: "Tempistica", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
                new TableCell({ children: [new Paragraph({ text: "Variazione Prezzo", alignment: AlignmentType.CENTER })], shading: { fill: "E8F5E9" } }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Same-Day")] }),
                new TableCell({ children: [new Paragraph("Oggi, < 4h dalla richiesta")] }),
                new TableCell({ children: [new Paragraph({ text: "+€2,00", alignment: AlignmentType.CENTER })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Next-Day")] }),
                new TableCell({ children: [new Paragraph("Domani")] }),
                new TableCell({ children: [new Paragraph({ text: "€0,00", alignment: AlignmentType.CENTER })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Programmata")] }),
                new TableCell({ children: [new Paragraph("2+ giorni in anticipo")] }),
                new TableCell({ children: [new Paragraph({ text: "-€1,00", alignment: AlignmentType.CENTER })] }),
              ],
            }),
          ],
        }),

        new Paragraph({
          text: "Bonus aggiuntivi per consegne nella stessa zona/orario di altri ordini.",
          spacing: { before: 100, after: 200 },
        }),

        // Section 7: Referral
        new Paragraph({
          text: "7. PROGRAMMA REFERRAL",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Per chi invita: ", bold: true }),
            new TextRun({ text: "€5,00 di sconto sul prossimo ordine" }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Per chi si registra: ", bold: true }),
            new TextRun({ text: "€3,00 di bonus benvenuto" }),
          ],
          spacing: { after: 200 },
        }),

        // Section 8: Points System
        new Paragraph({
          text: "8. SISTEMA PUNTI",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Paragraph({
          text: "I punti accumulati possono essere convertiti in sconti sugli ordini futuri.",
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Conversione: ", bold: true }),
            new TextRun({ text: "100 punti = €1,00 di sconto" }),
          ],
          spacing: { after: 200 },
        }),

        // Footer
        new Paragraph({
          children: [
            new TextRun({
              text: "─────────────────────────────────────────────────",
              color: "CCCCCC",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Documento generato il " + new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }),
              size: 20,
              color: "666666",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "ALFREDO - Servizio di Spesa a Domicilio",
              size: 20,
              color: "666666",
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Prezzi IVA inclusa. ALFREDO si riserva il diritto di modificare le tariffe.",
              size: 18,
              color: "999999",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "ALFREDO_Policy_Prezzi.docx");
};
