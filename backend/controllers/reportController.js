const pool = require('../config/db');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

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

    function getTeacherRemark(avg) {
      if (avg >= 90) return 'Excellent result. Keep up the great work.';
      if (avg >= 75) return 'Very good result. You are doing well.';
      if (avg >= 60) return 'Good result. You can put in more effort.';
      if (avg >= 45) return 'Fair result. You need to work harder.';
      if (avg >= 40) return 'Average result. Put in more effort to improve.';
      return 'Unsatisfactory result. You need to work much harder.';
    }
    function getPromotionStatus(avg) {
      if (avg >= 90) return 'Promoted with Distinction';
      if (avg >= 40) return 'Promoted with Merit';
      return 'Advised to Repeat';
    }

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
        teacher_remark: getTeacherRemark(average),
        promotion_status: getPromotionStatus(average),
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
    const { childId } = req.params;

    let studentId;

    if (childId) {
      // Validate parent-child relationship
      const [studentRows] = await pool.query(
        'SELECT id, class_id FROM students WHERE id = ? AND parent_id = ?',
        [childId, req.user.id]
      );
      if (studentRows.length === 0) {
        return res.status(403).json({ error: 'You can only view reports for your own children.' });
      }
      studentId = studentRows[0].id;
    } else {
      const [studentRows] = await pool.query(
        'SELECT id, class_id FROM students WHERE user_id = ?',
        [req.user.id]
      );
      if (studentRows.length === 0) {
        return res.status(404).json({ error: 'Student profile not found.' });
      }
      studentId = studentRows[0].id;
    }

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

    function getTeacherRemark(avg) {
      if (avg >= 90) return 'Excellent result. Keep up the great work.';
      if (avg >= 75) return 'Very good result. You are doing well.';
      if (avg >= 60) return 'Good result. You can put in more effort.';
      if (avg >= 45) return 'Fair result. You need to work harder.';
      if (avg >= 40) return 'Average result. Put in more effort to improve.';
      return 'Unsatisfactory result. You need to work much harder.';
    }
    function getPromotionStatus(avg) {
      if (avg >= 90) return 'Promoted with Distinction';
      if (avg >= 40) return 'Promoted with Merit';
      return 'Advised to Repeat';
    }
    const teacherRemark = getTeacherRemark(average);
    const promotionStatus = getPromotionStatus(average);

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
      const val = escapeHtml(domain[f.key] || '-');
      rowHtml += `<td>${f.label}: <strong>${val}</strong></td>`;
      count++;
      if (count % 3 === 0) {
        domainRows += rowHtml + '</tr>';
        rowHtml = '<tr>';
      }
    });
    if (count % 3 !== 0) {
      while (count % 3 !== 0) {
        rowHtml += '<td></td>';
        count++;
      }
      domainRows += rowHtml + '</tr>';
    }

    let rows = '';
    results.forEach((r, i) => {
      rows += `<tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(r.subject_name)}</strong></td>
        <td>${escapeHtml(r.test1 ?? '-')}</td>
        <td>${escapeHtml(r.test2 ?? '-')}</td>
        <td>${escapeHtml(r.test3 ?? '-')}</td>
        <td>${escapeHtml(r.ca_score ?? '-')}</td>
        <td>${escapeHtml(r.exam_score ?? '-')}</td>
        <td><strong>${escapeHtml(r.total_score ?? '-')}</strong></td>
        <td><strong>${escapeHtml(r.grade || '-')}</strong></td>
        <td>${escapeHtml(r.remarks || '-')}</td>
      </tr>`;
    });

    const nextTerm = meta.next_term_begins ? new Date(meta.next_term_begins).toDateString() : '________________';

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
 <style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #1f2937; font-size: 10.5px; font-weight: 500; line-height: 1.28; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { box-sizing: border-box; width: 210mm; min-height: 297mm; padding: 12mm 12mm; }
  .head { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; margin-bottom: 9px; border-bottom: 2.5px solid #1b6b1b; }
  .head-text { flex: 1; text-align: center; }
  .head h1 { margin: 0; font-size: 21px; font-weight: 700; letter-spacing: .8px; color: #1b6b1b; }
  .head p { margin: 2px 0 0; font-size: 10.5px; font-weight: 500; color: #475569; }
  .tag { padding: 5px 8px; border: 1px solid #1b6b1b; border-radius: 5px; color: #1b6b1b; font-size: 9.5px; font-weight: bold; text-align: center; line-height: 1.35; }
  .title { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 9px; border-radius: 6px; background: linear-gradient(90deg, #145014, #2f8f2f); color: #fff; font-size: 15px; font-weight: bold; letter-spacing: 3px; }
  .title span { font-size: 10.5px; font-weight: normal; letter-spacing: 0; }
  .info { width: 100%; border-collapse: collapse; margin-bottom: 9px; background: #eef7ee; border: 1px solid #c9d9c9; }
  .info td { padding: 5.5px 8px; font-size: 10.5px; font-weight: 500; }
  .info .label { width: 100px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #475569; }
  .results { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .results th { padding: 6.5px 4px; background: #1b6b1b; color: #fff; font-size: 10px; font-weight: bold; text-align: center; }
  .results td { padding: 5.5px 4px; border-bottom: 1px solid #e6ede6; font-size: 10.5px; font-weight: 500; text-align: center; }
  .results tr:nth-child(even) td { background: #f7faf7; }
  .results th:nth-child(2), .results td:nth-child(2) { text-align: left; }
  .summary { display: flex; gap: 7px; margin: 9px 0; }
  .summary div { flex: 1; padding: 8px 3px; border: 1px solid #f0d9a8; border-radius: 6px; background: #fffaf0; text-align: center; }
  .summary b { display: block; font-size: 17px; color: #a16207; }
  .summary span { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #475569; }
  .lower { width: 100%; border-collapse: separate; border-spacing: 7px 0; }
  .lower td { width: 50%; vertical-align: top; padding: 10px 12px; border: 1px solid #c9d9c9; border-radius: 6px; }
  .lower h2 { margin: 0 0 6px; padding-bottom: 3px; border-bottom: 1px solid #c9d9c9; color: #145014; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: .8px; }
  .domains { width: 100%; border-collapse: collapse; }
  .domains td { padding: 3.5px 4px; border-bottom: 1px solid #eef2ee; font-size: 10px; }
  .domains strong { color: #145014; font-weight: bold; }
  .legend { margin-top: 5px; font-size: 8.5px; color: #475569; }
  .attendance { margin-top: 7px; padding-top: 4px; border-top: 1px solid #eef2ee; font-size: 10.5px; }
  .remark { padding: 4.5px 0; border-bottom: 1px dashed #e2e8e2; font-size: 10.5px; }
  .remark:last-child { border-bottom: 0; }
  .remark b { display: inline-block; width: 112px; font-weight: bold; color: #475569; }
  .sign { display: flex; justify-content: space-between; margin-top: 11px; font-size: 10px; }
  .sign div { width: 46%; padding-bottom: 13px; border-bottom: 1px solid #94a394; }
  .sign div:last-child { text-align: right; }
  .foot { margin-top: 10px; padding-top: 6px; border-top: 1px solid #c9d9c9; font-size: 9px; text-align: center; color: #64748b; }
 </style></head><body>
 <div class="sheet">
  <div class="head">
    <div class="head-text">
      <h1>FREPPA GROUP OF SCHOOLS</h1>
      <p>19, Bethel Street, Aule Rd, Akure, Ondo</p>
      <p>Phone: +234 806 905 2278 &nbsp;|&nbsp; Email: info@freppagroupofschools.edu</p>
    </div>
    <div class="tag">OFFICIAL<br>REPORT</div>
  </div>

  <div class="title"><strong>REPORT CARD</strong><span>${escapeHtml(term?.term_name || '-')} &nbsp;&bull;&nbsp; ${escapeHtml(session?.session_name || '-')}</span></div>

  <table class="info">
    <tr><td class="label">Student</td><td>${escapeHtml(student?.full_name || '-')}</td>
        <td class="label">Admission No.</td><td>${escapeHtml(student?.admission_number || '-')}</td></tr>
    <tr><td class="label">Class</td><td>${escapeHtml(student?.class_name || '-')} - ${escapeHtml(student?.section || '-')}</td>
        <td class="label">Gender</td><td>${escapeHtml(student?.gender || '-')}</td></tr>
    <tr><td class="label">Term</td><td>${escapeHtml(term?.term_name || '-')}</td>
        <td class="label">Session</td><td>${escapeHtml(session?.session_name || '-')}</td></tr>
  </table>

  <table class="results">
    <colgroup>
      <col style="width:4%"><col style="width:22%"><col style="width:7%"><col style="width:7%"><col style="width:7%">
      <col style="width:8%"><col style="width:8%"><col style="width:8%"><col style="width:6%"><col style="width:23%">
    </colgroup>
    <thead><tr>
      <th>#</th><th>Subject</th><th>T1<br>(10)</th><th>T2<br>(20)</th><th>T3<br>(20)</th>
      <th>CA<br>(50)</th><th>Exam<br>(50)</th><th>Total<br>(100)</th><th>Grade</th><th>Remarks</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="summary">
    <div><b>${results.length}</b><span>Subjects</span></div>
    <div><b>${grandTotal.toFixed(2)}</b><span>Grand Total</span></div>
    <div><b>${average.toFixed(2)}</b><span>Average</span></div>
    <div><b>${escapeHtml(meta.class_position || '-')}/${escapeHtml(meta.total_students || '-')}</b><span>Position</span></div>
  </div>

  <table class="lower"><tr>
    <td>
      <h2>Affective &amp; Psychomotor Domains</h2>
      <table class="domains">${domainRows}</table>
      <div class="legend">A = Excellent &nbsp; B = Very Good &nbsp; C = Good &nbsp; D = Fair &nbsp; E = Needs Improvement</div>
      <div class="attendance"><strong>Attendance:</strong> Present: ${escapeHtml(att.present)} &nbsp; Absent: ${escapeHtml(att.absent)} &nbsp; Excused: ${escapeHtml(att.excused)}</div>
    </td>
    <td>
      <h2>Remarks &amp; Promotion</h2>
      <div class="remark"><b>Teacher's Remark</b>${escapeHtml(teacherRemark)}</div>
      <div class="remark"><b>Promotion Status</b>${escapeHtml(promotionStatus)}</div>
      <div class="remark"><b>Class Teacher</b>${escapeHtml(meta.teacher_remark || '____________________')}</div>
      <div class="remark"><b>Principal's Remark</b>${escapeHtml(meta.principal_remark || '____________________')}</div>
      <div class="remark"><b>Next Term Begins</b>${escapeHtml(nextTerm)}</div>
      <div class="sign">
        <div>Class Teacher's Signature<br>Date: ______________</div>
        <div>Principal's Signature<br>Date: ______________</div>
      </div>
    </td>
  </tr></table>

  <div class="foot">This is a computer-generated report card from FREPPA Group of Schools Portal</div>
 </div>
</body></html>`;

    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const sheetHeight = await page.evaluate(() => document.querySelector('.sheet').getBoundingClientRect().height);
      if (sheetHeight > 1120) {
        const scale = Math.max(0.5, 1120 / sheetHeight);
        await page.evaluate(s => {
          const sheet = document.querySelector('.sheet');
          sheet.style.zoom = String(s);
          sheet.style.width = (210 / s) + 'mm';
        }, scale);
      }
      const pdf = await page.pdf({
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
        pageRanges: '1',
      });
      await browser.close();

      const safeAdmission = String(student?.admission_number || 'student').replace(/[^A-Za-z0-9_-]/g, '');
      const filename = `report-card-${safeAdmission}-term${termId}.pdf`;
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
