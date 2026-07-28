const pool = require('../config/db');

function calculateGrade(total) {
  if (total >= 70) return 'A';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 45) return 'D';
  if (total >= 40) return 'E';
  return 'F';
}

function calculateRemark(grade) {
  const map = { A: 'Distinction', B: 'Very Good', C: 'Good', D: 'Average', E: 'Pass', F: 'Fail' };
  return map[grade] || null;
}

exports.getReportCard = async (req, res) => {
  try {
    const { term_id, session_id } = req.query;
    let studentId;

    const [studentRows] = await pool.query(
      'SELECT id, class_id FROM students WHERE user_id = ?',
      [req.user.id]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }
    studentId = studentRows[0].id;
    const classId = studentRows[0].class_id;

    const termId = term_id || (await getCurrentTermId());
    const sessionId = session_id || (await getCurrentSessionId());

    let [results] = await pool.query(`
      SELECT sub.subject_name, sub.subject_code,
             r.test1, r.test2, r.test3, r.ca_score, r.exam_score,
             r.total_score, r.grade, r.remarks
      FROM results r
      JOIN subjects sub ON r.subject_id = sub.id
      WHERE r.student_id = ? AND r.term_id = ? AND r.session_id = ?
      ORDER BY sub.subject_name
    `, [studentId, termId, sessionId]);

    results = results.map(r => ({
      ...r,
      remarks: r.remarks || calculateRemark(r.grade)
    }));

    const [domains] = await pool.query(`
      SELECT * FROM result_domains
      WHERE student_id = ? AND term_id = ? AND session_id = ?
    `, [studentId, termId, sessionId]);

    const [studentInfo] = await pool.query(`
      SELECT s.admission_number, s.gender, u.full_name,
             c.class_name, c.section, c.academic_year
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `, [studentId]);

    const [termInfo] = await pool.query('SELECT id, term_name FROM terms WHERE id = ?', [termId]);
    const [sessionInfo] = await pool.query('SELECT id, session_name FROM sessions WHERE id = ?', [sessionId]);

    const [rankings] = await pool.query(`
      SELECT position FROM (
        SELECT s.id, RANK() OVER (ORDER BY SUM(r.total_score) DESC) AS position
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE s.class_id = ? AND r.term_id = ? AND r.session_id = ?
        GROUP BY s.id
      ) ranked WHERE id = ?
    `, [classId, termId, sessionId, studentId]);

    const [countResult] = await pool.query(`
      SELECT COUNT(DISTINCT s.id) AS count
      FROM results r
      JOIN students s ON r.student_id = s.id
      WHERE s.class_id = ? AND r.term_id = ? AND r.session_id = ?
    `, [classId, termId, sessionId]);

    const grandTotal = results.reduce((sum, r) => sum + parseFloat(r.total_score || 0), 0);
    const average = results.length > 0 ? (grandTotal / results.length) : 0;

    const [report] = await pool.query(`
      SELECT * FROM report_cards
      WHERE student_id = ? AND term_id = ? AND session_id = ?
    `, [studentId, termId, sessionId]);

    const [attendance] = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) AS excused
      FROM attendance
      WHERE student_id = ? AND term_id = ? AND session_id = ?
    `, [studentId, termId, sessionId]);

    res.json({
      student: studentInfo[0] || null,
      term: termInfo[0] || null,
      session: sessionInfo[0] || null,
      results,
      domains: domains[0] || null,
      summary: {
        grand_total: grandTotal.toFixed(2),
        subject_count: results.length,
        average: average.toFixed(2),
        position: rankings[0]?.position || null,
        total_students: countResult[0]?.count || 0,
      },
      attendance: attendance[0] || { present: 0, absent: 0, excused: 0 },
      report_meta: report[0] || null,
    });
  } catch (err) {
    console.error('Get report card error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getReportCardByChild = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term_id, session_id } = req.query;

    const [studentRows] = await pool.query(
      'SELECT id, user_id, class_id FROM students WHERE id = ? AND parent_id = ?',
      [childId, req.user.id]
    );
    if (studentRows.length === 0) {
      return res.status(403).json({ error: 'You can only view reports for your own children.' });
    }

    req.user.id = studentRows[0].user_id;
    req.query.term_id = term_id;
    req.query.session_id = session_id;
    return exports.getReportCard(req, res);
  } catch (err) {
    console.error('Get child report card error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getReportHistory = async (req, res) => {
  try {
    const [studentRows] = await pool.query(
      'SELECT id FROM students WHERE user_id = ?',
      [req.user.id]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }
    const studentId = studentRows[0].id;

    const [reports] = await pool.query(`
      SELECT rc.id, rc.grand_total, rc.average, rc.class_position,
             rc.total_students, rc.is_finalized, rc.generated_at,
             t.term_name, s.session_name
      FROM report_cards rc
      JOIN terms t ON rc.term_id = t.id
      JOIN sessions s ON rc.session_id = s.id
      WHERE rc.student_id = ?
      ORDER BY s.id DESC, t.id DESC
    `, [studentId]);

    res.json({ reports });
  } catch (err) {
    console.error('Get report history error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getReportPDF = async (req, res) => {
  try {
    const { term_id, session_id } = req.query;

    const [studentRows] = await pool.query(
      'SELECT id, class_id FROM students WHERE user_id = ?',
      [req.user.id]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }
    const studentId = studentRows[0].id;

    const termId = term_id || (await getCurrentTermId());
    const sessionId = session_id || (await getCurrentSessionId());

    let [results] = await pool.query(`
      SELECT sub.subject_name, sub.subject_code,
             r.test1, r.test2, r.test3, r.ca_score, r.exam_score,
             r.total_score, r.grade, r.remarks
      FROM results r
      JOIN subjects sub ON r.subject_id = sub.id
      WHERE r.student_id = ? AND r.term_id = ? AND r.session_id = ?
      ORDER BY sub.subject_name
    `, [studentId, termId, sessionId]);

    results = results.map(r => ({
      ...r,
      remarks: r.remarks || calculateRemark(r.grade)
    }));

    const [domains] = await pool.query(`
      SELECT * FROM result_domains
      WHERE student_id = ? AND term_id = ? AND session_id = ?
    `, [studentId, termId, sessionId]);

    const [studentInfo] = await pool.query(`
      SELECT s.admission_number, s.gender, u.full_name,
             c.class_name, c.section
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `, [studentId]);

    const [termInfo] = await pool.query('SELECT id, term_name FROM terms WHERE id = ?', [termId]);
    const [sessionInfo] = await pool.query('SELECT id, session_name FROM sessions WHERE id = ?', [sessionId]);

    const grandTotal = results.reduce((sum, r) => sum + parseFloat(r.total_score || 0), 0);
    const average = results.length > 0 ? (grandTotal / results.length) : 0;

    const [report] = await pool.query(`
      SELECT * FROM report_cards
      WHERE student_id = ? AND term_id = ? AND session_id = ?
    `, [studentId, termId, sessionId]);

    const [attendance] = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) AS excused
      FROM attendance
      WHERE student_id = ? AND term_id = ? AND session_id = ?
    `, [studentId, termId, sessionId]);

    const student = studentInfo[0];
    const term = termInfo[0];
    const session = sessionInfo[0];
    const domain = domains[0] || {};
    const att = attendance[0] || { present: 0, absent: 0, excused: 0 };
    const meta = report[0] || {};

    const domainFields = [
      { label: 'Punctuality', key: 'punctuality' },
      { label: 'Attentiveness', key: 'attentiveness' },
      { label: 'Neatness', key: 'neatness' },
      { label: 'Honesty', key: 'honesty' },
      { label: 'Politeness', key: 'politeness' },
      { label: 'Self Control', key: 'self_control' },
      { label: 'Handwriting', key: 'handwriting' },
      { label: 'Sports', key: 'sports' },
      { label: 'Drawing', key: 'drawing' },
      { label: 'Verbal Fluency', key: 'verbal_fluency' },
      { label: 'Craft Skills', key: 'craft_skills' },
      { label: 'Thinking Ability', key: 'thinking_ability' },
      { label: 'Social Skills', key: 'social_skills' },
    ];

    let domainRows = '';
    let count = 0;
    let rowHtml = '<tr>';
    domainFields.forEach(f => {
      const val = domain[f.key] || '-';
      rowHtml += `<td style="padding:4px 8px;font-size:10px;">${f.label}: <strong>${val}</strong></td>`;
      count++;
      if (count % 3 === 0) {
        domainRows += rowHtml + '</tr>';
        rowHtml = '<tr>';
      }
    });
    if (count % 3 !== 0) {
      while (count % 3 !== 0) {
        rowHtml += '<td style="padding:4px 8px;font-size:10px;"></td>';
        count++;
      }
      domainRows += rowHtml + '</tr>';
    }

    let rows = '';
    results.forEach((r, i) => {
      rows += `<tr>
        <td style="padding:6px 8px;text-align:center;font-size:11px;border-bottom:1px solid #ddd;">${i + 1}</td>
        <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #ddd;">${r.subject_name}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;border-bottom:1px solid #ddd;">${r.test1 ?? '-'}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;border-bottom:1px solid #ddd;">${r.test2 ?? '-'}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;border-bottom:1px solid #ddd;">${r.test3 ?? '-'}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;border-bottom:1px solid #ddd;">${r.ca_score ?? '-'}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;border-bottom:1px solid #ddd;">${r.exam_score ?? '-'}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;font-weight:bold;border-bottom:1px solid #ddd;">${r.total_score ?? '-'}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;font-weight:bold;border-bottom:1px solid #ddd;">${r.grade || '-'}</td>
        <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #ddd;">${r.remarks || '-'}</td>
      </tr>`;
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; color: #222; }
  .header { text-align: center; border-bottom: 2px solid #1b6b1b; padding-bottom: 10px; margin-bottom: 10px; }
  .header h1 { color: #1b6b1b; margin: 0; font-size: 20px; }
  .header p { margin: 2px 0; font-size: 11px; color: #555; }
  .title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; text-decoration: underline; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .info-table td { padding: 3px 8px; font-size: 12px; }
  .info-table .label { font-weight: bold; width: 120px; }
  .results-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .results-table th { background: #1b6b1b; color: #fff; padding: 6px 8px; font-size: 11px; text-align: center; }
  .results-table th:first-child { text-align: center; }
  .results-table th:nth-child(2) { text-align: left; }
  .results-table td:nth-child(2) { text-align: left; }
  .summary { text-align: center; font-size: 12px; font-weight: bold; margin: 8px 0; padding: 6px; border: 1px solid #1b6b1b; background: #f0f7f0; }
  .domains-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .domains-table td { border: 1px solid #ddd; }
  .remarks { margin-top: 10px; font-size: 12px; }
  .remarks .line { border-bottom: 1px solid #222; display: inline-block; width: 300px; margin-left: 5px; }
  .footer { text-align: center; font-size: 10px; color: #888; margin-top: 15px; border-top: 1px solid #ccc; padding-top: 8px; }
</style></head><body>
<div class="header">
  <h1>FREPPA GROUP OF SCHOOLS</h1>
  <p>Plot 4, Freppa Avenue, Off Lagos Road, Ibadan, Oyo State</p>
  <p>Phone: 08012345678 | Email: info@freppagroupofschools.edu</p>
</div>
<div class="title">REPORT CARD</div>
<table class="info-table">
  <tr><td class="label">Student Name:</td><td>${student?.full_name || ''}</td>
      <td class="label">Admission No:</td><td>${student?.admission_number || ''}</td></tr>
  <tr><td class="label">Class:</td><td>${student?.class_name || ''} - ${student?.section || ''}</td>
      <td class="label">Gender:</td><td>${student?.gender || '-'}</td></tr>
  <tr><td class="label">Term:</td><td>${term?.term_name || ''}</td>
      <td class="label">Session:</td><td>${session?.session_name || ''}</td></tr>
</table>

<table class="results-table">
  <thead><tr>
    <th>S/N</th><th style="text-align:left;">Subject</th><th>T1<br>(10)</th><th>T2<br>(20)</th><th>T3<br>(20)</th>
    <th>CA<br>(50)</th><th>Exam<br>(50)</th><th>Total<br>(100)</th><th>Grade</th><th>Remarks</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>

<div class="summary">
  Grand Total: ${grandTotal.toFixed(2)} &nbsp;|&nbsp; Subjects: ${results.length} &nbsp;|&nbsp; Average: ${average.toFixed(2)}
  &nbsp;|&nbsp; Position: ${meta.class_position || '-'}/${meta.total_students || '-'}
</div>

<h3 style="font-size:12px;margin:8px 0 4px;">Affective & Psychomotor Domain</h3>
<table class="domains-table">${domainRows}</table>

<div class="remarks">
  <p><strong>Attendance:</strong> Present: ${att.present} &nbsp; Absent: ${att.absent} &nbsp; Excused: ${att.excused}</p>
  <p><strong>Class Teacher's Remark:</strong> ${meta.teacher_remark || '________________________'}</p>
  <p><strong>Principal's Remark:</strong> ${meta.principal_remark || '________________________'}</p>
  <p><strong>Next Term Begins:</strong> ${meta.next_term_begins ? new Date(meta.next_term_begins).toDateString() : '________________'}</p>
</div>

<div style="margin-top:15px;font-size:11px;">
  <div style="float:left;width:45%;">
    Class Teacher's Signature: ___________________<br>
    Date: ___________________
  </div>
  <div style="float:right;width:45%;text-align:right;">
    Principal's Signature: ___________________<br>
    Date: ___________________
  </div>
  <div style="clear:both;"></div>
</div>

<div class="footer">This is a computer-generated report card from FREPPA Group of Schools Portal</div>
</body></html>`;

    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
        printBackground: true,
      });
      await browser.close();

      const filename = `report-card-${student?.admission_number || 'student'}-term${termId}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdf);
    } catch (pdfErr) {
      if (pdfErr.code === 'MODULE_NOT_FOUND') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
      throw pdfErr;
    }
  } catch (err) {
    console.error('Get report PDF error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

async function getCurrentTermId() {
  const [rows] = await pool.query('SELECT id FROM terms WHERE is_current = 1 LIMIT 1');
  return rows[0]?.id || null;
}

async function getCurrentSessionId() {
  const [rows] = await pool.query('SELECT id FROM sessions WHERE is_current = 1 LIMIT 1');
  return rows[0]?.id || null;
}
