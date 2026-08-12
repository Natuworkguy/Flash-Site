export function initTerminal() {
  const termOutput = document.getElementById("term-output");
  if (!termOutput) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const script = [
    { type: "prompt", text: "flash" },
    { type: "ai", text: "Hi! I'm connected to llama3.1 via Ollama. What are we doing today?" },
    { type: "user", text: "check if the API server is running, then tail its logs" },
    { type: "tool", text: "-> shell: curl -s localhost:8000/health" },
    { type: "output", text: '{"status":"ok"}' },
    { type: "tool", text: "-> shell: tail -n 5 server.log" },
    { type: "output", text: "INFO  listening on :8000\nINFO  0 active connections" },
    { type: "ai", text: "Server's healthy and idle. Want me to watch it live?" },
  ];

  function lineEl(kind, text) {
    const div = document.createElement("div");
    div.className = `tline tline-${kind}`;
    if (kind === "user") {
      div.innerHTML = `<span class="tline-prompt">&gt;</span> <span class="tline-user-text"></span>`;
    } else if (kind === "prompt") {
      div.innerHTML = `<span class="tline-prompt">$</span> <span class="tline-user-text"></span>`;
    } else if (kind === "tool") {
      div.innerHTML = `<span class="tline-tool-text"></span>`;
    } else if (kind === "output") {
      div.innerHTML = `<span class="tline-output-text"></span>`;
    } else {
      div.innerHTML = `<span class="tline-ai-text"></span>`;
    }
    return div;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function typeInto(el, text, speed) {
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      if (i % 3 === 0) await sleep(speed);
    }
  }

  let typingRunId = 0;

  async function runTypingLoop() {
    const myRun = ++typingRunId;
    while (myRun === typingRunId) {
      termOutput.innerHTML = "";
      for (const step of script) {
        if (myRun !== typingRunId) return;
        const el = lineEl(step.type, step.text);
        termOutput.appendChild(el);
        const target = el.querySelector("span:last-child");
        if (step.type === "ai" || step.type === "output") {
          await sleep(260);
        }
        if (reduceMotion) {
          target.textContent = step.text;
        } else {
          await typeInto(target, step.text, 16);
        }
        await sleep(step.type === "tool" ? 420 : 520);
      }
      await sleep(2200);
      if (myRun !== typingRunId) return;
      termOutput.style.transition = "opacity 0.5s ease";
      termOutput.style.opacity = "0";
      await sleep(500);
      termOutput.style.opacity = "1";
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    .tline { margin-bottom: 8px; }
    .tline-prompt { color: var(--accent); }
    .tline-ai-text { color: #d9d5cc; }
    .tline-user-text { color: var(--accent-2); }
    .tline-tool-text { color: var(--muted); font-style: italic; }
    .tline-output-text { color: var(--muted); white-space: pre-wrap; }
  `;
  document.head.appendChild(style);

  runTypingLoop();
}
