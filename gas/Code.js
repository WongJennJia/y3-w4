/**
 * 三年级数学 - 退出小纸条 (Exit Ticket) 数据收集后端
 * Google Apps Script 运行环境 (V8)
 */

// 默认配置
const CONFIG = {
  // 绑定的 Google Sheet ID
  SPREADSHEET_ID: "1x03SctM-Bmuk8q2acAjth3gjndE2KC3ZTjMwWq1CdFQ", 
  SHEET_NAME: "退出小纸条统计",
  DEFAULT_LESSON: "三年级数学｜对称轴｜Week 4-L1"
};

/**
 * 获取或初始化目标工作表
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getOrCreateSheet() {
  let ss = null;
  
  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== "") {
    try {
      ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID.trim());
    } catch (err) {
      console.warn("无法通过 SPREADSHEET_ID 打开表格，尝试获取当前活动表格:", err);
    }
  }
  
  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      console.warn("未找到活动表格:", e);
    }
  }

  // 如果仍不存在活动表格（例如未绑定的独立脚本且未配 ID），则自动新建一个
  if (!ss) {
    ss = SpreadsheetApp.create("三年级数学_退出小纸条统计表");
    console.log("已自动创建新统计表格，表格 ID 为: " + ss.getId() + "，链接: " + ss.getUrl());
  }

  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME, 0);
    initSheetHeader(sheet);
  } else if (sheet.getLastRow() === 0) {
    initSheetHeader(sheet);
  }

  return sheet;
}

/**
 * 初始化表头格式与样式
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function initSheetHeader(sheet) {
  const headers = [
    "提交时间 (Timestamp)",
    "学生姓名 (Student Name)",
    "课题名称 (Lesson)",
    "题目内容 (Question)",
    "选择选项 (Selected Option)",
    "选项文字 (Option Text)",
    "答题判定 (Result)",
    "客户端信息 (User Agent / Device)"
  ];
  
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#2364aa");
  headerRange.setFontColor("#ffffff");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  
  // 调整列宽
  sheet.setColumnWidth(1, 180); // 时间
  sheet.setColumnWidth(2, 140); // 姓名
  sheet.setColumnWidth(3, 220); // 课题
  sheet.setColumnWidth(4, 280); // 题目
  sheet.setColumnWidth(5, 120); // 选项代号
  sheet.setColumnWidth(6, 160); // 选项文字
  sheet.setColumnWidth(7, 120); // 判定
  sheet.setColumnWidth(8, 200); // 客户端
}

/**
 * 记录单条退出小纸条答题记录
 * @param {Object} data 
 * @return {Object} 结果对象
 */
function recordExitTicket(data) {
  const sheet = getOrCreateSheet();
  const now = new Date();
  const timeString = Utilities.formatDate(now, Session.getScriptTimeZone() || "Asia/Shanghai", "yyyy-MM-dd HH:mm:ss");
  
  const studentName = (data.studentName || data.name || "匿名学生").toString().trim();
  const lesson = (data.lesson || CONFIG.DEFAULT_LESSON).toString().trim();
  const question = (data.question || "长方形沿着对角线对折，会完全重合吗？").toString().trim();
  const selectedOption = (data.selectedOption || data.answer || "").toString().trim();
  const optionText = (data.optionText || "").toString().trim();
  const isCorrect = data.isCorrect === true || data.isCorrect === "true" || data.correct === true ? "✓ 正确" : (data.isCorrect === false || data.isCorrect === "false" || data.correct === false ? "✗ 错误" : "待判定");
  const userAgent = (data.userAgent || data.device || "").toString().trim();

  const newRow = [
    timeString,
    studentName,
    lesson,
    question,
    selectedOption,
    optionText,
    isCorrect,
    userAgent
  ];

  sheet.appendRow(newRow);
  
  // 格式化最新插入行
  const lastRow = sheet.getLastRow();
  const resultCell = sheet.getRange(lastRow, 7);
  if (isCorrect.indexOf("正确") !== -1) {
    resultCell.setBackground("#dff7eb").setFontColor("#16a34a").setFontWeight("bold");
  } else if (isCorrect.indexOf("错误") !== -1) {
    resultCell.setBackground("#fee2e2").setFontColor("#dc2626").setFontWeight("bold");
  }
  
  return {
    status: "success",
    message: "答题数据已成功记录到 Google Sheets",
    timestamp: timeString,
    rowNumber: lastRow
  };
}

/**
 * Web App HTTP POST 请求处理函数
 * @param {Object} e 事件对象
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        // 如果不是纯 JSON，尝试按参数解析
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const result = recordExitTicket(payload);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    const errResult = {
      status: "error",
      message: error.toString()
    };
    return ContentService
      .createTextOutput(JSON.stringify(errResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Web App HTTP GET 请求处理函数（支持测试以及 URL 参数直接提交）
 * @param {Object} e 事件对象
 */
function doGet(e) {
  if (e && e.parameter && (e.parameter.answer || e.parameter.selectedOption)) {
    try {
      const result = recordExitTicket(e.parameter);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 默认返回服务运行状态说明
  const statusInfo = {
    service: "三年级数学退出小纸条统计服务",
    status: "online",
    time: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Shanghai", "yyyy-MM-dd HH:mm:ss"),
    usage: "请向此 URL 发送 POST 或 GET 请求以提交答题数据。"
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(statusInfo, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 测试函数：直接在 Google Apps Script 编辑器内运行此函数即可验证写入
 */
function testRecordExitTicket() {
  const sampleData = {
    studentName: "测试同学-小明",
    lesson: "三年级数学｜对称轴｜Week 4-L1",
    question: "长方形沿着对角线对折，会完全重合吗？",
    selectedOption: "no",
    optionText: "不会",
    isCorrect: true,
    userAgent: "Google Apps Script Console Test Runner"
  };

  const res = recordExitTicket(sampleData);
  console.log("测试写入结果:", JSON.stringify(res));
  
  const sheet = getOrCreateSheet();
  console.log("表格名称:", sheet.getName());
  console.log("总记录行数:", sheet.getLastRow());
}
