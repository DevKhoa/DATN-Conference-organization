const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate Proceedings List (Filtered by Conference)
 */
exports.generateProceedings = async (conference_id) => {
  const { rows } = await pool.query(`
    SELECT 
      p.paper_id, 
      p.title, 
      u.full_name AS primary_author,
      u.organization
    FROM Papers p
    JOIN Users u ON p.primary_author_id = u.user_id
    WHERE p.status = 'ACCEPTED' 
    AND p.conference_id = $1  
    ORDER BY p.paper_id ASC
  `, [conference_id]);
  
  return rows;
};

// Assign DOI to Paper
exports.assignDoi = async ({ paper_id, doi }) => {
    // ... code cũ ...
    const { rows } = await pool.query(`
    UPDATE Papers
    SET doi = $1
    WHERE paper_id = $2
    RETURNING paper_id, doi
  `, [doi, paper_id]);
  return rows[0];
};

/**
 * Export Proceedings PDF (Filtered by Conference)
 */
exports.exportProceedings = async (conference_id) => {
  // Lấy thông tin Hội nghị (in tên lên bìa)
  const confResult = await pool.query(`
    SELECT conf_name FROM Conferences WHERE conf_id = $1
  `, [conference_id]);

  if (confResult.rows.length === 0) throw new Error("Conference not found");
  const confName = confResult.rows[0].conf_name;

  // Lấy danh sách bài báo thuộc hội nghị đó
  const { rows } = await pool.query(`
    SELECT 
      p.title, 
      p.abstract, 
      p.doi,
      u.full_name AS author_name,
      u.organization
    FROM Papers p
    JOIN Users u ON p.primary_author_id = u.user_id
    WHERE p.status = 'ACCEPTED'
    AND p.conference_id = $1 -- [NEW] Lọc theo hội nghị
    ORDER BY p.paper_id ASC
  `, [conference_id]);

  if (rows.length === 0) {
    throw new Error("No accepted papers found for this conference.");
  }

  // Tạo file PDF
  const fileName = `proceedings_conf_${conference_id}_${Date.now()}.pdf`;
  const exportDir = path.join(__dirname, '../../public/exports');

  if (!fs.existsSync(exportDir)){
      fs.mkdirSync(exportDir, { recursive: true });
  }
  
  const filePath = path.join(exportDir, fileName);
  const doc = new PDFDocument({ margin: 50 });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // --- TRANG BÌA ---
  doc.fontSize(26).font('Helvetica-Bold').text('CONFERENCE PROCEEDINGS', { align: 'center' });
  doc.moveDown();
  doc.fontSize(20).text(confName.toUpperCase(), { align: 'center' }); // [NEW] Tên hội nghị động
  doc.moveDown();
  doc.fontSize(12).font('Helvetica').text(`Generated Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.addPage();

  // --- NỘI DUNG ---
  rows.forEach((paper, index) => {
    doc.fontSize(16).font('Helvetica-Bold').text(`Paper #${index + 1}: ${paper.title}`);
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Oblique').text(`Author: ${paper.author_name} - ${paper.organization}`);
    if (paper.doi) {
        doc.fillColor('blue').text(`DOI: ${paper.doi}`, { link: `https://doi.org/${paper.doi}`, underline: true });
        doc.fillColor('black');
    }
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(11).text('Abstract:', { underline: true });
    doc.font('Helvetica').text(paper.abstract ? paper.abstract : "No abstract provided.", { align: 'justify' });
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); 
    doc.moveDown(2);
  });

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  return {
    file_type: "PDF",
    download_url: `/exports/${fileName}`
  };
};