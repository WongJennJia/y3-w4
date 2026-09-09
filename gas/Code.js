/**
 * 三年级数学｜空间｜解决问题｜Week 4-L2
 * 五题退出小纸条 Google Apps Script 后端（V8）
 */

const CONFIG = {
  SPREADSHEET_ID: "1x03SctM-Bmuk8q2acAjth3gjndE2KC3ZTjMwWq1CdFQ",
  SHEET_NAME: "Week4-L2退出小纸条",
  DEFAULT_LESSON: "三年级数学｜空间｜解决问题｜Week 4-L2",
  TIME_ZONE: "Asia/Kuala_Lumpur"
};

const QUESTION_BANK = {
  Q1: {
    question: "下面哪一个是三角棱柱体？",
    answer: "A"
  },
  Q2: {
    question: "关于棱柱体的底面，以下哪些说法正确？",
    answer: "I,II,III"
  },
  Q3: {
    question: "一个三角棱柱体有多少个顶点？",
    answer: "B"
  },
  Q4: {
    question: "正六边形有多少条对称轴？",
    answer: "C"
  },
  Q5: {
    question: "一个棱柱体的底面是长方形（不是正方形），它有多少条对称轴？",
    answer: "B"
  }
};

const HEADERS = [
  "提交时间 (Timestamp)",
  "作答编号 (Attempt ID)",
  "学生姓名 (Student Name)",
  "课题名称 (Lesson)",
  "题号 (Question ID)",
  "题目内容 (Question)",
  "选择选项 (Selected Option)",
  "选项文字 (Option Text)",
  "答题判定 (Result)",
  "得分 (Score)",
  "客户端信息 (User Agent / Device)"
];

function textValue(value, fallback) {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text || (fallback || "");
}

function normalizeAnswer(value) {
  if (Array.isArray(value)) {
    return value.map(String).map(function (item) { return item.trim(); }).filter(Boolean).sort().join(",");
  }
  return textValue(value).split(/[、，,]/).map(function (item) { return item.trim(); }).filter(Boolean).sort().join(",");
}

function getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    } catch (error) {
      console.warn("无法通过 SPREADSHEET_ID 打开表格：", error);
    }
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  return SpreadsheetApp.create("三年级数学_Week4-L2_退出小纸条统计表");
}

function getOrCreateSheet() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME, 0);
  if (sheet.getLastRow() === 0) initSheetHeader(sheet);
  return sheet;
}

function initSheetHeader(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#2364aa")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  [170, 190, 150, 250, 90, 360, 150, 360, 110, 85, 240].forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
}

function createAttemptId_() {
  return Utilities.getUuid();
}

function formatTime_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone() || CONFIG.TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
}

function gradeAnswer_(questionId, selectedOption, explicitCorrect) {
  const bankItem = QUESTION_BANK[questionId];
  if (bankItem) return normalizeAnswer(selectedOption) === normalizeAnswer(bankItem.answer);
  if (explicitCorrect === true || explicitCorrect === "true") return true;
  if (explicitCorrect === false || explicitCorrect === "false") return false;
  return null;
}

function buildRow_(data, context) {
  const questionId = textValue(data.questionId || data.id, "Q?").toUpperCase();
  const bankItem = QUESTION_BANK[questionId];
  const selectedOption = normalizeAnswer(data.selectedOption !== undefined ? data.selectedOption : data.answer);
  const isCorrect = gradeAnswer_(questionId, selectedOption, data.isCorrect);
  return [
    context.timeString,
    context.attemptId,
    context.studentName,
    context.lesson,
    questionId,
    textValue(data.question, bankItem ? bankItem.question : "未提供题目"),
    selectedOption,
    textValue(data.optionText),
    isCorrect === null ? "待判定" : (isCorrect ? "✓ 正确" : "✗ 错误"),
    isCorrect === true ? 1 : 0,
    context.userAgent
  ];
}

function writeRows_(rows) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getOrCreateSheet();
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, HEADERS.length).setValues(rows);
    const resultRange = sheet.getRange(startRow, 9, rows.length, 1);
    resultRange.setFontWeight("bold");
    rows.forEach(function (row, index) {
      const cell = sheet.getRange(startRow + index, 9);
      if (row[8].indexOf("正确") !== -1) cell.setBackground("#dff7eb").setFontColor("#16805d");
      if (row[8].indexOf("错误") !== -1) cell.setBackground("#fee2e2").setFontColor("#c83232");
    });
    return startRow;
  } finally {
    lock.releaseLock();
  }
}

function recordExitTicketBatch(data) {
  const answers = Array.isArray(data.answers) ? data.answers : [];
  if (answers.length !== 5) throw new Error("Week 4-L2 退出小纸条必须包含 5 题答案。");

  const now = new Date();
  const context = {
    timeString: formatTime_(now),
    attemptId: textValue(data.attemptId, createAttemptId_()),
    studentName: textValue(data.studentName || data.name, "匿名学生"),
    lesson: textValue(data.lesson, CONFIG.DEFAULT_LESSON),
    userAgent: textValue(data.userAgent || data.device)
  };
  const rows = answers.map(function (answer) { return buildRow_(answer, context); });
  const firstRow = writeRows_(rows);
  const score = rows.reduce(function (sum, row) { return sum + Number(row[9] || 0); }, 0);

  return {
    status: "success",
    message: "5 题作答已记录到 Google Sheets",
    attemptId: context.attemptId,
    timestamp: context.timeString,
    firstRow: firstRow,
    questionCount: rows.length,
    score: score,
    total: 5
  };
}

function recordExitTicket(data) {
  const now = new Date();
  const context = {
    timeString: formatTime_(now),
    attemptId: textValue(data.attemptId, createAttemptId_()),
    studentName: textValue(data.studentName || data.name, "匿名学生"),
    lesson: textValue(data.lesson, CONFIG.DEFAULT_LESSON),
    userAgent: textValue(data.userAgent || data.device)
  };
  const row = buildRow_(data, context);
  const firstRow = writeRows_([row]);
  return {
    status: "success",
    message: "本题作答已记录到 Google Sheets",
    attemptId: context.attemptId,
    timestamp: context.timeString,
    rowNumber: firstRow,
    score: row[9]
  };
}

function getExitTicketStats() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { status: "success", totalAttempts: 0, totalResponses: 0, averageScore: 0, questionStats: [], students: [] };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const attempts = {};
  const questionMap = {};
  values.forEach(function (row) {
    const attemptId = textValue(row[1], "legacy-" + row[0] + "-" + row[2]);
    const questionId = textValue(row[4], "Q?");
    const score = Number(row[9]) || 0;
    if (!attempts[attemptId]) {
      attempts[attemptId] = { attemptId: attemptId, name: textValue(row[2], "匿名学生"), timestamp: String(row[0] || ""), score: 0, total: 0 };
    }
    attempts[attemptId].score += score;
    attempts[attemptId].total += 1;
    if (!questionMap[questionId]) questionMap[questionId] = { questionId: questionId, total: 0, correct: 0 };
    questionMap[questionId].total += 1;
    questionMap[questionId].correct += score;
  });

  const students = Object.keys(attempts).map(function (key) { return attempts[key]; });
  const totalScore = students.reduce(function (sum, item) { return sum + item.score; }, 0);
  const questionStats = Object.keys(questionMap).sort().map(function (key) {
    const item = questionMap[key];
    item.correctRate = item.total ? Math.round(item.correct / item.total * 100) : 0;
    return item;
  });
  return {
    status: "success",
    totalAttempts: students.length,
    totalResponses: values.length,
    averageScore: students.length ? Math.round(totalScore / students.length * 10) / 10 : 0,
    questionStats: questionStats,
    students: students
  };
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try { payload = JSON.parse(e.postData.contents); } catch (error) { payload = e.parameter || {}; }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    if (payload.action === "getStats" || payload.action === "stats") return jsonOutput_(getExitTicketStats());
    if (payload.action === "submitBatch" || Array.isArray(payload.answers)) return jsonOutput_(recordExitTicketBatch(payload));
    return jsonOutput_(recordExitTicket(payload));
  } catch (error) {
    return jsonOutput_({ status: "error", message: String(error) });
  }
}

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    if (params.action === "health") {
      return jsonOutput_({ status: "success", lesson: CONFIG.DEFAULT_LESSON, questions: 5 });
    }
    if (params.answer || params.selectedOption) return jsonOutput_(recordExitTicket(params));
    return jsonOutput_(getExitTicketStats());
  } catch (error) {
    return jsonOutput_({ status: "error", message: String(error) });
  }
}

function testRecordExitTicketBatch() {
  const sample = {
    action: "submitBatch",
    studentName: "测试同学",
    lesson: CONFIG.DEFAULT_LESSON,
    userAgent: "Google Apps Script Test Runner",
    answers: [
      { questionId: "Q1", selectedOption: "A", optionText: "A　三角棱柱体" },
      { questionId: "Q2", selectedOption: "I,II,III", optionText: "I、II、III" },
      { questionId: "Q3", selectedOption: "B", optionText: "B　6 个" },
      { questionId: "Q4", selectedOption: "C", optionText: "C　6 条" },
      { questionId: "Q5", selectedOption: "B", optionText: "B　2 条" }
    ]
  };
  console.log(JSON.stringify(recordExitTicketBatch(sample)));
}
