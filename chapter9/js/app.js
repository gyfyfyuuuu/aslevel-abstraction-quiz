(() => {
  const app = document.querySelector('#app');
  const headerActions = document.querySelector('#header-actions');
  const STORAGE_KEY = 'algorithm-challenge-chapter9-v1';
  const levelInfo = {
    1: { name: 'Beginner', time: 40, points: 10, icon: '🌱', blurb: 'Build your algorithm foundations.' },
    2: { name: 'Intermediate', time: 90, points: 20, icon: '⚡', blurb: 'Put searching and sorting skills to work.' },
    3: { name: 'Expert', time: 150, points: 30, icon: '🔥', blurb: 'Take on the toughest algorithm challenges.' }
  };
  const emptyLevel = () => ({ question: 0, score: 0, best: 0, completed: false });
  let state = loadState();
  let activeLevel = null;
  let selectedAnswer = null;
  let answered = false;
  let seconds = 0;
  let timer = null;

  function blankState() {
    return { levels: { 1: emptyLevel(), 2: emptyLevel(), 3: emptyLevel() } };
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !saved.levels) return blankState();
      for (const n of [1, 2, 3]) {
        const old = saved.levels[n] || {};
        saved.levels[n] = {
          question: Math.max(0, Math.min(10, Number(old.question) || 0)),
          score: Math.max(0, Number(old.score) || 0),
          best: Math.max(0, Number(old.best) || 0),
        completed: Boolean(old.completed),
        answered: Boolean(old.answered),
        lastCorrect: old.lastCorrect === true ? true : old.lastCorrect === false ? false : null,
        lastChoice: ['A', 'B', 'C', 'D'].includes(old.lastChoice) ? old.lastChoice : null
        };
      }
      return saved;
    } catch (error) {
      return blankState();
    }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      toast('Browser storage is unavailable. Progress may not be saved.');
      return false;
    }
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }
  function toast(message) {
    const el = document.querySelector('#toast');
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3200);
  }
  function button(label, kind = 'primary', action = '', extra = '') {
    return `<button class="btn ${kind}" ${action ? `data-action="${action}"` : ''} ${extra}>${label}</button>`;
  }
  function totalBestScore() {
    return [1, 2, 3].reduce((sum, n) => sum + state.levels[n].best, 0);
  }
  function completedCount() {
    return [1, 2, 3].filter(n => state.levels[n].completed).length;
  }
  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }
  function setHeader(showHome = false) {
    headerActions.innerHTML = `${showHome ? '<button class="header-button" data-action="home">← All levels</button>' : ''}<button class="header-button" data-action="clear-progress">Clear progress</button>`;
  }
  function renderHome() {
    stopTimer();
    activeLevel = null;
    setHeader();
    const hasProgress = totalBestScore() > 0 || [1, 2, 3].some(n => state.levels[n].question > 0);
    app.innerHTML = `
      <section class="hero">
        <div>
          <div class="eyebrow">AS &amp; A LEVEL · CHAPTER 09</div>
          <h1>Think like a<br><em>problem solver.</em></h1>
          <p class="lead">Practise all 30 questions across three difficulty levels. Choose where to begin, build your score, and pick up where you left off on this device.</p>
          <div class="eyebrow" style="margin-top:24px;color:#8992b6">10 QUESTIONS PER LEVEL · UP TO 600 POINTS</div>
        </div>
        <div class="mascot-wrap"><span class="spark s1">✦</span><span class="spark s2">✳</span><span class="spark s3">✧</span><div class="orb"><div class="bot"><i class="bot-mouth"></i></div></div></div>
      </section>
      <section class="dashboard-head"><div><div class="eyebrow">YOUR LOCAL PRACTICE</div><h1>Choose a level</h1><div class="muted">${hasProgress ? 'Progress is saved in this browser.' : 'No account needed. Your progress stays in this browser.'}</div></div></section>
      <div class="stats">
        <div class="stat"><small>BEST SCORE</small><strong>${totalBestScore()}<span style="color:var(--muted);font-size:14px"> / 600</span></strong></div>
        <div class="stat"><small>LEVELS COMPLETED</small><strong>${completedCount()}<span style="color:var(--muted);font-size:14px"> / 3</span></strong></div>
        <div class="stat"><small>QUESTIONS</small><strong>30<span style="color:var(--muted);font-size:14px"> total</span></strong></div>
      </div>
      <div class="levels">${[1, 2, 3].map(n => renderLevelCard(n)).join('')}</div>
      <p class="muted" style="font-size:12px;margin:18px 2px">Your scores are stored only on this device. Clearing browser data will remove them.</p>`;
  }
  function renderLevelCard(n) {
    const item = levelInfo[n];
    const level = state.levels[n];
    const inProgress = !level.completed && level.question > 0;
    const status = level.completed ? '✓ Completed' : inProgress ? `● In progress · Question ${Math.min(level.question + 1, 10)} of 10` : '● Ready to play';
    const label = inProgress ? 'Continue level →' : level.completed ? 'Play again' : 'Start level →';
    return `<article class="level" data-l="${n}">
      <div class="tag">LEVEL 0${n} · ${item.name.toUpperCase()}</div>
      <h3>${item.icon} ${item.name}</h3>
      <p>${item.blurb}</p>
      <div class="level-status">${status}</div>
      <div class="progress"><span style="width:${level.completed ? 100 : level.question * 10}%"></span></div>
      <div class="muted" style="font-size:12px;margin-bottom:13px">${item.time} sec per question · ${item.points} pts per correct answer${level.completed ? ` · Best: ${level.best}` : ''}</div>
      ${button(label, 'primary small', 'start-level', `data-level="${n}"`)}
    </article>`;
  }
  function beginLevel(n) {
    const level = state.levels[n];
    if (level.completed) Object.assign(level, { question: 0, score: 0, completed: false });
    if (level.question >= 10) level.question = 9;
    activeLevel = n;
    saveState();
    renderQuestion();
  }
  function renderQuestion() {
    stopTimer();
    const n = activeLevel;
    const item = levelInfo[n];
    const level = state.levels[n];
    const questions = window.QUESTIONS.filter(q => q.level === n);
    const question = questions[level.question];
    if (!question) return completeLevel(n);
    selectedAnswer = level.lastChoice;
    answered = level.answered;
    seconds = item.time;
    setHeader(true);
    app.innerHTML = `
      <div class="quiz-top">
        <div><div class="eyebrow">${item.name.toUpperCase()} · QUESTION ${level.question + 1} OF 10</div><div class="muted">Best score: ${level.best} · This run: ${level.score}</div></div>
        <div class="timer" id="timer">${formatClock(seconds)}</div>
      </div>
      <div class="progress"><span style="width:${level.question * 10}%"></span></div>
      <section class="card question-card">
        <div class="eyebrow">QUESTION ${String(level.question + 1).padStart(2, '0')}</div>
        <h2 class="question-title">${escapeHtml(question.question)}</h2>
        <div class="option-list">${Object.entries(question.options).map(([letter, text]) => `<button class="option" data-option="${letter}"><span class="letter">${letter}</span><span>${escapeHtml(text)}</span></button>`).join('')}</div>
        <div id="feedback"></div>
        ${button(level.answered ? (level.question === 9 ? 'See level results →' : 'Next question →') : 'Submit answer', 'primary', level.answered ? 'next-question' : 'submit-answer', `id="quiz-action" ${level.answered ? '' : 'disabled'}`)}
      </section>`;
    if (level.answered) {
      document.querySelectorAll('.option').forEach(option => { option.disabled = true; });
      if (level.lastChoice) document.querySelectorAll('.option').forEach(option => option.classList.toggle('selected', option.dataset.option === level.lastChoice));
      const feedback = document.querySelector('#feedback');
      const correctAnswer = window.ANSWERS[question.id];
      feedback.innerHTML = `<div class="feedback ${level.lastCorrect ? 'good' : 'bad'}">${level.lastCorrect ? '✓ Correct! Points added to this run.' : level.lastChoice ? `✗ No points earned. The correct answer is ${correctAnswer}.` : '⏰ Time is up. No points earned.'}</div>`;
      return;
    }
    timer = setInterval(() => {
      seconds -= 1;
      const display = document.querySelector('#timer');
      if (!display) return stopTimer();
      display.textContent = formatClock(seconds);
      if (seconds <= 10) display.classList.add('urgent');
      if (seconds <= 0) recordAnswer(true);
    }, 1000);
  }
  function formatClock(value) {
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }
  function recordAnswer(timeout = false) {
    if (answered) return;
    if (!timeout && !selectedAnswer) return toast('Choose an answer first.');
    answered = true;
    stopTimer();
    const level = state.levels[activeLevel];
    const question = window.QUESTIONS.filter(q => q.level === activeLevel)[level.question];
    const correctAnswer = window.ANSWERS[question.id];
    const correct = !timeout && selectedAnswer === correctAnswer;
    if (correct) level.score += levelInfo[activeLevel].points;
    level.answered = true;
    level.lastCorrect = correct;
    level.lastChoice = timeout ? null : selectedAnswer;
    saveState();
    document.querySelectorAll('.option').forEach(option => { option.disabled = true; });
    const feedback = document.querySelector('#feedback');
    feedback.innerHTML = `<div class="feedback ${correct ? 'good' : 'bad'}">${timeout ? '⏰ Time is up. No points earned.' : correct ? '✓ Correct! Points added to this run.' : `✗ No points earned. The correct answer is ${correctAnswer}.`}</div>`;
    const action = document.querySelector('#quiz-action');
    action.textContent = level.question === 9 ? 'See level results →' : 'Next question →';
    action.dataset.action = 'next-question';
    action.disabled = false;
  }
  function nextQuestion() {
    if (!answered) return;
    const level = state.levels[activeLevel];
    level.question += 1;
    level.answered = false;
    level.lastCorrect = null;
    level.lastChoice = null;
    saveState();
    renderQuestion();
  }
  function completeLevel(n) {
    stopTimer();
    const level = state.levels[n];
    level.completed = true;
    level.best = Math.max(level.best, level.score);
    saveState();
    setHeader();
    app.innerHTML = `<section class="card completion">
      <div class="trophy">${n === 3 ? '🏆' : '🏅'}</div>
      <div class="eyebrow">LEVEL 0${n} COMPLETE</div>
      <h1>${n === 3 ? 'Challenge complete!' : 'Nice work!'}</h1>
      <p class="muted">You finished all 10 questions in ${levelInfo[n].name}.</p>
      <div class="stats"><div class="stat"><small>THIS RUN</small><strong>${level.score} / ${levelInfo[n].points * 10}</strong></div><div class="stat"><small>PERSONAL BEST</small><strong>${level.best}</strong></div><div class="stat"><small>ALL LEVEL BESTS</small><strong>${totalBestScore()} / 600</strong></div></div>
      <div class="hero-actions" style="justify-content:center">${button('Choose another level', 'primary', 'home')}${button('Play this level again', 'secondary', 'replay-level', `data-level="${n}"`)}</div>
    </section>`;
  }
  function clearProgress() {
    if (!window.confirm('Clear all saved scores and progress on this browser?')) return;
    state = blankState();
    saveState();
    renderHome();
    toast('Local progress cleared.');
  }

  app.addEventListener('click', event => {
    const option = event.target.closest('[data-option]');
    if (option && !answered) {
      selectedAnswer = option.dataset.option;
      document.querySelectorAll('.option').forEach(button => button.classList.toggle('selected', button === option));
      document.querySelector('#quiz-action').disabled = false;
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    switch (action) {
      case 'start-level': beginLevel(Number(event.target.closest('[data-action]').dataset.level)); break;
      case 'replay-level': beginLevel(Number(event.target.closest('[data-action]').dataset.level)); break;
      case 'submit-answer': recordAnswer(false); break;
      case 'next-question': nextQuestion(); break;
      case 'home': renderHome(); break;
      case 'clear-progress': clearProgress(); break;
    }
  });
  renderHome();
})();

