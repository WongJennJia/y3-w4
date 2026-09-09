(function () {
  "use strict";

  var DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbz1uSXk3KwN9by8J1fICjhxyz1ZuDzFytRthQrkshI3mCQBFx2XV3eTPCSsUZ7g139sZg/exec";
  var LESSON = "三年级数学｜空间｜解决问题｜Week 4-L2";
  var QUESTION_TEXTS = [
    "下面哪一个是三角棱柱体？",
    "关于棱柱体的底面，以下哪些说法正确？",
    "一个三角棱柱体有多少个顶点？",
    "正六边形有多少条对称轴？",
    "一个棱柱体的底面是长方形（不是正方形），它有多少条对称轴？"
  ];
  var OPTION_LABELS = ["A", "B", "C", "D"];
  var MULTI_LABELS = ["I", "II", "III", "IV"];
  var answers = [null, null, null, null, null];
  var submitting = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function getGasUrl() {
    return localStorage.getItem("gas_webapp_url") || DEFAULT_GAS_URL;
  }

  function setSync(message, state) {
    var sync = byId("exitSync");
    if (!sync) return;
    sync.textContent = message;
    sync.className = "exit-sync" + (state ? " " + state : "");
  }

  function activeQuestionIndex() {
    var dots = Array.prototype.slice.call(document.querySelectorAll("#exitDots .exit-dot"));
    var active = dots.findIndex(function (dot) { return dot.classList.contains("active"); });
    return active < 0 ? 4 : active;
  }

  function optionTextFor(index, selected) {
    if (index === 0) {
      return {
        A: "A　三角棱柱体",
        B: "B　长方棱柱体",
        C: "C　圆柱体",
        D: "D　棱锥体"
      }[selected] || selected;
    }
    if (index === 1) {
      var statements = [
        "I　棱柱体有两个底面",
        "II　两个底面互相平行",
        "III　两个底面的形状和大小都相同",
        "IV　两个底面一定是正方形"
      ];
      return selected.map(function (label) {
        return statements[MULTI_LABELS.indexOf(label)];
      }).join("；");
    }
    var optionButtons = document.querySelectorAll("[data-exit-single]");
    var selectedIndex = OPTION_LABELS.indexOf(selected);
    return optionButtons[selectedIndex] ? optionButtons[selectedIndex].textContent.trim() : selected;
  }

  function rememberChoice(target) {
    var index = activeQuestionIndex();
    if (target.matches("[data-exit-value]")) {
      answers[index] = {
        selectedOption: target.getAttribute("data-exit-value"),
        optionText: optionTextFor(index, target.getAttribute("data-exit-value"))
      };
      return;
    }
    if (target.matches("[data-exit-single]")) {
      var singleIndex = Number(target.getAttribute("data-exit-single"));
      var label = OPTION_LABELS[singleIndex];
      answers[index] = {
        selectedOption: label,
        optionText: target.textContent.trim()
      };
    }
  }

  function rememberMultiChoice() {
    var index = activeQuestionIndex();
    if (index !== 1) return;
    var selected = Array.prototype.slice.call(document.querySelectorAll("[data-exit-check]:checked")).map(function (item) {
      return MULTI_LABELS[Number(item.getAttribute("data-exit-check"))];
    });
    answers[index] = selected.length ? {
      selectedOption: selected.join(","),
      optionText: optionTextFor(index, selected)
    } : null;
  }

  function buildPayload(studentName) {
    return {
      action: "submitBatch",
      attemptId: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "attempt-" + Date.now(),
      studentName: studentName,
      lesson: LESSON,
      userAgent: navigator.userAgent,
      answers: answers.map(function (answer, index) {
        return {
          questionId: "Q" + (index + 1),
          question: QUESTION_TEXTS[index],
          selectedOption: answer.selectedOption,
          optionText: answer.optionText
        };
      })
    };
  }

  function updateCompletion(message, state) {
    setSync(message, state);
    var completion = document.querySelector("#exitHost .completion p");
    if (completion) completion.textContent = message;
  }

  function submitAnswers() {
    if (submitting) return;
    var nameInput = byId("exitStudentName");
    var studentName = nameInput ? nameInput.value.trim() : "";
    if (!studentName) {
      var feedback = byId("exitFeedback");
      if (feedback) {
        feedback.className = "feedback note";
        feedback.textContent = "提交前请先填写姓名或学号。";
      }
      if (nameInput) {
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setSync("请填写姓名 / 学号", "error");
      return;
    }
    if (answers.some(function (answer) { return !answer; })) {
      setSync("还有题目尚未记录", "error");
      return;
    }

    var payload = buildPayload(studentName);
    var url = getGasUrl();
    localStorage.setItem("week4_l2_pending_exit", JSON.stringify(payload));
    submitting = true;
    setSync("正在提交 5 题…", "saving");

    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function () {
      localStorage.removeItem("week4_l2_pending_exit");
      submitting = false;
      updateCompletion("5 题已提交到 Google Sheets。", "saved");
    }).catch(function () {
      submitting = false;
      updateCompletion("网络暂不可用，5 题已保存在本机；恢复网络后可重新提交。", "error");
    });
  }

  function retryPending() {
    var raw = localStorage.getItem("week4_l2_pending_exit");
    if (!raw || !navigator.onLine) return;
    try {
      var payload = JSON.parse(raw);
      fetch(getGasUrl(), {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      }).then(function () {
        localStorage.removeItem("week4_l2_pending_exit");
        setSync("上一份离线作答已补交", "saved");
      }).catch(function () {});
    } catch (error) {
      localStorage.removeItem("week4_l2_pending_exit");
    }
  }

  var nameInput = byId("exitStudentName");
  if (nameInput) {
    nameInput.value = localStorage.getItem("exit_student_name") || "";
    nameInput.addEventListener("input", function () {
      localStorage.setItem("exit_student_name", this.value.trim());
      if (this.value.trim()) setSync("准备记录 5 题", "");
    });
  }

  var gasInput = byId("gasUrlInput");
  if (gasInput) gasInput.value = getGasUrl();
  var saveGasUrl = byId("saveGasUrl");
  if (saveGasUrl) {
    saveGasUrl.addEventListener("click", function () {
      var value = gasInput ? gasInput.value.trim() : "";
      if (value) localStorage.setItem("gas_webapp_url", value);
      else localStorage.removeItem("gas_webapp_url");
      if (gasInput) gasInput.value = getGasUrl();
      setSync("Google Sheets 接口已保存", "saved");
    });
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest("[data-exit-value],[data-exit-single],#exitNext,#redoExit,#resetPage");
    if (!target) return;
    if (target.matches("[data-exit-value],[data-exit-single]")) {
      rememberChoice(target);
      return;
    }
    if (target.id === "redoExit" || (target.id === "resetPage" && document.querySelector('[data-go="exit"]').classList.contains("active"))) {
      answers = [null, null, null, null, null];
      submitting = false;
      setSync("准备记录 5 题", "");
      return;
    }
    if (target.id === "exitNext" && activeQuestionIndex() === 4) {
      var name = nameInput ? nameInput.value.trim() : "";
      if (!name) {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitAnswers();
        return;
      }
      window.setTimeout(submitAnswers, 0);
    }
  }, true);

  document.addEventListener("change", function (event) {
    if (event.target.matches("[data-exit-check]")) rememberMultiChoice();
  });

  window.addEventListener("online", retryPending);
  retryPending();
})();
