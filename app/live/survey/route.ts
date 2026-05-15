import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Help Me Make This The Best For You | heypearl.io/live</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%; font-family: 'Montserrat', Arial, sans-serif;
    background: white; color: #0F1E3A; overflow: hidden;
  }

  .progress-bar {
    position: fixed; top: 0; left: 0; height: 4px;
    background: #E8185C; transition: width 0.4s ease; z-index: 100;
    width: 0%;
  }

  .q-count {
    position: fixed; top: 16px; right: 20px;
    font-size: 12px; font-weight: 700; color: #9BACC0;
    letter-spacing: 0.08em; z-index: 100;
  }

  .slides { position: relative; height: 100vh; width: 100%; }

  .slide {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    justify-content: center; align-items: flex-start;
    padding: 60px clamp(24px, 8vw, 120px);
    transition: transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease;
    transform: translateY(100%); opacity: 0; pointer-events: none;
  }
  .slide.active {
    transform: translateY(0); opacity: 1; pointer-events: all;
  }
  .slide.above {
    transform: translateY(-100%); opacity: 0; pointer-events: none;
  }

  .slide-intro { align-items: center; text-align: center; }
  .slide-intro h1 {
    font-size: clamp(28px, 4vw, 46px); font-weight: 900;
    line-height: 1.15; max-width: 700px; margin-bottom: 20px; color: #0F1E3A;
  }
  .slide-intro h1 span { color: #E8185C; }
  .slide-intro p {
    font-size: 16px; color: #4A5E7A;
    margin-bottom: 40px; max-width: 480px; line-height: 1.7;
  }

  .q-num {
    font-size: 13px; font-weight: 800; color: #E8185C;
    text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 18px;
    display: flex; align-items: center; gap: 8px;
  }
  .q-num svg { width: 14px; height: 14px; fill: #E8185C; }
  .q-text {
    font-size: clamp(22px, 3.2vw, 36px); font-weight: 800;
    line-height: 1.25; max-width: 680px; margin-bottom: 36px;
    color: #0F1E3A;
  }
  .q-text sup { font-size: 0.55em; color: #E8185C; vertical-align: super; }
  textarea {
    width: 100%; max-width: 680px; min-height: 120px;
    background: transparent; border: none; border-bottom: 2px solid #c8d0de;
    color: #0F1E3A; font-family: inherit; font-size: 18px; font-weight: 500;
    padding: 8px 0; resize: none; outline: none; line-height: 1.6;
    transition: border-color 0.2s;
  }
  textarea::placeholder { color: #9BACC0; }
  textarea:focus { border-bottom-color: #E8185C; }

  .ok-row { display: flex; align-items: center; gap: 14px; margin-top: 24px; }
  .ok-btn {
    display: inline-flex; align-items: center; gap: 10px;
    background: #0F1E3A; color: white;
    font-family: inherit; font-size: 14px; font-weight: 800;
    letter-spacing: 0.08em; text-transform: uppercase;
    padding: 14px 28px; border: none; border-radius: 4px; cursor: pointer;
    transition: background 0.2s;
  }
  .ok-btn:hover { background: #162d58; }
  .ok-btn svg { width: 14px; height: 14px; fill: white; }
  .ok-hint { font-size: 12px; color: #9BACC0; font-weight: 600; }

  .start-btn {
    display: inline-block; background: #0F1E3A; color: white;
    font-family: inherit; font-size: 16px; font-weight: 800;
    letter-spacing: 0.06em; text-transform: uppercase;
    padding: 18px 52px; border: none; border-radius: 4px; cursor: pointer;
    transition: background 0.2s;
  }
  .start-btn:hover { background: #162d58; }
  .timer-hint {
    font-size: 12px; color: #9BACC0; margin-top: 14px; font-weight: 600;
  }

  .slide-thanks { align-items: center; text-align: center; }
  .slide-thanks h2 {
    font-size: clamp(28px, 4vw, 44px); font-weight: 900;
    margin-bottom: 16px; line-height: 1.2; color: #0F1E3A;
  }
  .slide-thanks h2 span { color: #E8185C; }
  .slide-thanks p {
    font-size: 16px; color: #4A5E7A;
    max-width: 480px; line-height: 1.7; margin-bottom: 36px;
  }
  .back-btn {
    display: inline-block; background: transparent; color: #0F1E3A;
    font-family: inherit; font-size: 14px; font-weight: 700;
    border: 2px solid #0F1E3A; padding: 14px 36px;
    border-radius: 4px; cursor: pointer; text-decoration: none;
    transition: background 0.2s, color 0.2s;
  }
  .back-btn:hover { background: #0F1E3A; color: white; }

  .nav {
    position: fixed; bottom: 24px; right: 24px;
    display: flex; gap: 8px; z-index: 100;
  }
  .nav-btn {
    width: 40px; height: 40px; border-radius: 4px;
    background: #EDF0FA; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
  }
  .nav-btn:hover:not(:disabled) { background: #c8d0de; }
  .nav-btn:disabled { opacity: 0.3; cursor: default; }
  .nav-btn svg { width: 16px; height: 16px; fill: #0F1E3A; }
</style>
</head>
<body>

<div class="progress-bar" id="progress"></div>
<div class="q-count" id="q-count"></div>

<div class="slides" id="slides">

  <!-- INTRO -->
  <div class="slide slide-intro active" id="slide-0">
    <h1>Help Me Make This Info Session<br><span>The Best For You</span></h1>
    <p>3 quick questions. Takes less than 2 minutes. Your answers help me tailor the session to exactly what you need.</p>
    <button class="start-btn" onclick="goTo(1)">Start &#9654;</button>
    <div class="timer-hint">Takes less than 2 minutes</div>
  </div>

  <!-- Q1 -->
  <div class="slide" id="slide-1">
    <div class="q-num">
      <svg viewBox="0 0 16 16"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 10.5h-1.5v-1.5h1.5v1.5zm0-3h-1.5C7.25 6.5 5.5 5.75 5.5 4.25 5.5 2.75 6.75 2 8 2s2.5.75 2.5 2.25c0 1.25-1.5 2-1.75 3.25z"/></svg>
      Question 1 of 3
    </div>
    <div class="q-text">What are you looking to learn at the live info session?<sup>*</sup></div>
    <textarea id="a1" placeholder="Type your answer here..." rows="4" onkeydown="handleKey(event, 1)"></textarea>
    <div class="ok-row">
      <button class="ok-btn" onclick="next(1)">
        OK
        <svg viewBox="0 0 16 16"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
      </button>
      <span class="ok-hint">or press <strong>Enter &#8629;</strong></span>
    </div>
  </div>

  <!-- Q2 -->
  <div class="slide" id="slide-2">
    <div class="q-num">
      <svg viewBox="0 0 16 16"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 10.5h-1.5v-1.5h1.5v1.5zm0-3h-1.5C7.25 6.5 5.5 5.75 5.5 4.25 5.5 2.75 6.75 2 8 2s2.5.75 2.5 2.25c0 1.25-1.5 2-1.75 3.25z"/></svg>
      Question 2 of 3
    </div>
    <div class="q-text">What stood out in the ad that made you sign up?<sup>*</sup></div>
    <textarea id="a2" placeholder="Type your answer here..." rows="4" onkeydown="handleKey(event, 2)"></textarea>
    <div class="ok-row">
      <button class="ok-btn" onclick="next(2)">
        OK
        <svg viewBox="0 0 16 16"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
      </button>
      <span class="ok-hint">or press <strong>Enter &#8629;</strong></span>
    </div>
  </div>

  <!-- Q3 -->
  <div class="slide" id="slide-3">
    <div class="q-num">
      <svg viewBox="0 0 16 16"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 10.5h-1.5v-1.5h1.5v1.5zm0-3h-1.5C7.25 6.5 5.5 5.75 5.5 4.25 5.5 2.75 6.75 2 8 2s2.5.75 2.5 2.25c0 1.25-1.5 2-1.75 3.25z"/></svg>
      Question 3 of 3
    </div>
    <div class="q-text">How have you tried to fix this challenge?<sup>*</sup></div>
    <textarea id="a3" placeholder="Type your answer here..." rows="4" onkeydown="handleKey(event, 3)"></textarea>
    <div class="ok-row">
      <button class="ok-btn" id="submit-btn" onclick="submit()">
        Submit
        <svg viewBox="0 0 16 16"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
      </button>
      <span class="ok-hint">or press <strong>Enter &#8629;</strong></span>
    </div>
  </div>

  <!-- THANKS -->
  <div class="slide slide-thanks" id="slide-4">
    <h2>Thank You <span>So Much!</span></h2>
    <p>Your answers help me make this info session genuinely useful for you. I'll see you on the live call.</p>
    <a href="/live/thankyou" class="back-btn">Back to Confirmation Page</a>
  </div>

</div>

<div class="nav" id="nav">
  <button class="nav-btn" id="nav-up" onclick="navUp()" disabled>
    <svg viewBox="0 0 16 16"><path d="M8 3.5L2 9.5l1.06 1.06L8 5.62l4.94 4.94L14 9.5z"/></svg>
  </button>
  <button class="nav-btn" id="nav-down" onclick="navDown()">
    <svg viewBox="0 0 16 16"><path d="M8 12.5l6-6-1.06-1.06L8 10.38 3.06 5.44 2 6.5z"/></svg>
  </button>
</div>

<script>
  var current = 0;
  var total = 3;
  var answers = { a1: '', a2: '', a3: '' };

  var regEmail = localStorage.getItem('ws_email') || '';
  var regName  = localStorage.getItem('ws_name')  || '';

  function goTo(n) {
    var slides = document.querySelectorAll('.slide');
    slides.forEach(function(s, i) {
      s.classList.remove('active', 'above');
      if (i < n) s.classList.add('above');
    });
    slides[n].classList.add('active');
    current = n;
    updateUI();
    var ta = document.getElementById('a' + n);
    if (ta) setTimeout(function(){ ta.focus(); }, 520);
  }

  function next(qNum) {
    var ta = document.getElementById('a' + qNum);
    answers['a' + qNum] = ta ? ta.value.trim() : '';
    if (qNum < total) {
      goTo(qNum + 1);
    } else {
      submit();
    }
  }

  function handleKey(e, qNum) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      next(qNum);
    }
  }

  function navUp() { if (current > 0) goTo(current - 1); }
  function navDown() { if (current <= total) goTo(current + 1); }

  function updateUI() {
    var bar = document.getElementById('progress');
    var count = document.getElementById('q-count');
    var navUpBtn = document.getElementById('nav-up');
    var navDownBtn = document.getElementById('nav-down');
    var nav = document.getElementById('nav');

    if (current === 0) {
      bar.style.width = '0%';
      count.textContent = '';
      nav.style.display = 'none';
    } else if (current === total + 1) {
      bar.style.width = '100%';
      count.textContent = '';
      nav.style.display = 'none';
    } else {
      bar.style.width = (current / total * 100) + '%';
      count.textContent = current + ' / ' + total;
      nav.style.display = 'flex';
      navUpBtn.disabled = current <= 1;
      navDownBtn.disabled = true;
    }
  }

  async function submit() {
    var btn = document.getElementById('submit-btn');
    if (btn) { btn.textContent = 'Submitting...'; btn.disabled = true; }

    var ta3 = document.getElementById('a3');
    answers.a3 = ta3 ? ta3.value.trim() : '';

    fetch('https://pearlos.ai/api/public/workshop-survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: regEmail,
        name:  regName,
        q1: answers.a1,
        q2: answers.a2,
        q3: answers.a3
      })
    }).catch(function(){});

    goTo(4);
  }

  updateUI();
</script>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
