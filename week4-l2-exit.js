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
  var ANSWER_KEYS = ["A", "I,II,III", "B", "C", "B"];
  var FEEDBACK_MESSAGES = [
    "<strong>Q1 反馈：</strong>三角棱柱体有两个形状、大小相同且互相平行的三角形底面。正确答案是 <strong>A</strong>。",
    "<strong>Q2 反馈：</strong>棱柱体有两个互相平行、形状和大小相同的底面；底面不一定是正方形。正确答案是 <strong>I、II、III</strong>。",
    "<strong>Q3 反馈：</strong>三角棱柱体的两个三角形底面各有 3 个顶点，所以一共有 <strong>6 个顶点（B）</strong>。",
    "<strong>Q4 反馈：</strong>正六边形有 3 条经过相对顶点的对称轴，也有 3 条经过相对边中点的对称轴，共 <strong>6 条（C）</strong>。",
    "<strong>Q5 反馈：</strong>非正方形的长方形只有横向和竖向两条中线是对称轴，因此有 <strong>2 条（B）</strong>。"
  ];
  var answers = [null, null, null, null, null];
  var feedbackShown = [false, false, false, false, false];
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

  function answerIsCorrect(index) {
    return !!answers[index] && answers[index].selectedOption === ANSWER_KEYS[index];
  }

  function showQuestionFeedback(index) {
    var feedback = byId("exitFeedback");
    var nextButton = byId("exitNext");
    if (!feedback || !answers[index]) return;
    var correct = answerIsCorrect(index);
    feedback.className = "feedback " + (correct ? "good" : "note");
    feedback.innerHTML = (correct ? "✓ 回答正确。" : "再检查一次。") + " " + FEEDBACK_MESSAGES[index];

    if (index === 0) {
      document.querySelectorAll("[data-exit-value]").forEach(function (button) {
        var value = button.getAttribute("data-exit-value");
        button.disabled = true;
        if (value === ANSWER_KEYS[index]) button.classList.add("answer-correct-review");
        else if (value === answers[index].selectedOption) button.classList.add("answer-wrong-review");
      });
    } else if (index === 1) {
      var chosen = answers[index].selectedOption.split(",");
      document.querySelectorAll("[data-exit-check]").forEach(function (input) {
        var label = MULTI_LABELS[Number(input.getAttribute("data-exit-check"))];
        input.disabled = true;
        if (ANSWER_KEYS[index].split(",").indexOf(label) !== -1) input.closest(".multi-item").classList.add("answer-correct-review");
        else if (chosen.indexOf(label) !== -1) input.closest(".multi-item").classList.add("answer-wrong-review");
      });
    } else {
      document.querySelectorAll("[data-exit-single]").forEach(function (button) {
        var label = OPTION_LABELS[Number(button.getAttribute("data-exit-single"))];
        button.disabled = true;
        if (label === ANSWER_KEYS[index]) button.classList.add("answer-correct-review");
        else if (label === answers[index].selectedOption) button.classList.add("answer-wrong-review");
      });
    }
    if (nextButton) nextButton.textContent = index === 4 ? "查看结果并提交 ▶" : "下一题 ▶";
  }

  function pieCard(title, correct, total, subtitle, cardId) {
    var rate = total ? Math.round(correct / total * 100) : 0;
    var degrees = total ? Math.round(correct / total * 360) : 0;
    return '<div class="pie-summary-card"' + (cardId ? ' id="' + cardId + '"' : '') + '>' +
      '<div class="result-donut" style="--pie-deg:' + degrees + 'deg" role="img" aria-label="' + title + '正确率 ' + rate + '%"><strong>' + correct + ' / ' + total + '</strong></div>' +
      '<div class="pie-copy"><h3>' + title + '</h3><p>' + subtitle + ' · 正确率 ' + rate + '%</p></div></div>';
  }

  function renderPersonalPie() {
    var completionText = document.querySelector("#exitHost .completion p");
    if (!completionText) return;
    var old = byId("exitResultPies");
    if (old) old.remove();
    var score = answers.reduce(function (sum, answer, index) {
      return sum + (answer && answer.selectedOption === ANSWER_KEYS[index] ? 1 : 0);
    }, 0);
    completionText.insertAdjacentHTML("afterend", '<div class="result-pies" id="exitResultPies">' + pieCard("本次个人结果", score, 5, "绿色为答对，红色为需要复习", "personalPie") + '</div>');
  }

  function loadClassPie(url) {
    window.setTimeout(function () {
      fetch(url + (url.indexOf("?") === -1 ? "?" : "&") + "action=getStats&t=" + Date.now(), { method: "GET" })
        .then(function (response) { return response.json(); })
        .then(function (stats) {
          var host = byId("exitResultPies");
          if (!host || !stats || !Array.isArray(stats.questionStats)) return;
          var total = stats.questionStats.reduce(function (sum, item) { return sum + Number(item.total || 0); }, 0);
          var correct = stats.questionStats.reduce(function (sum, item) { return sum + Number(item.correct || 0); }, 0);
          var oldClassPie = byId("classPie");
          if (oldClassPie) oldClassPie.remove();
          if (total) host.insertAdjacentHTML("beforeend", pieCard("全班累计结果", correct, total, "只显示汇总，不显示同学姓名", "classPie"));
        })
        .catch(function () {});
    }, 1200);
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
    renderPersonalPie();

    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function () {
      localStorage.removeItem("week4_l2_pending_exit");
      submitting = false;
      updateCompletion("5 题已提交到 Google Sheets。", "saved");
      loadClassPie(url);
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
    var target = event.target.closest("[data-exit-value],[data-exit-single],[data-exit-check],#exitNext,#exitPrev,#redoExit,#resetPage");
    if (!target) return;
    var index = activeQuestionIndex();
    if (target.matches("[data-exit-value],[data-exit-single],[data-exit-check]") && feedbackShown[index]) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (target.matches("[data-exit-value],[data-exit-single]")) {
      rememberChoice(target);
      return;
    }
    if (target.id === "redoExit" || (target.id === "resetPage" && document.querySelector('[data-go="exit"]').classList.contains("active"))) {
      answers = [null, null, null, null, null];
      feedbackShown = [false, false, false, false, false];
      submitting = false;
      setSync("准备记录 5 题", "");
      return;
    }
    if (target.id === "exitPrev") {
      window.setTimeout(function () {
        var previousIndex = activeQuestionIndex();
        if (feedbackShown[previousIndex]) showQuestionFeedback(previousIndex);
      }, 0);
      return;
    }
    if (target.id === "exitNext" && !feedbackShown[index]) {
      if (!answers[index]) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      feedbackShown[index] = true;
      showQuestionFeedback(index);
      return;
    }
    if (target.id === "exitNext" && index === 4) {
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
