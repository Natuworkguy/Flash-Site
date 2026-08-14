export function initTerminal() {
  const termOutput = document.getElementById("term-output");
  if (!termOutput) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Mirrors the real Flash CLI's output format (flash/theme.py): a bullet
  // "tool_line" header followed by an indented "⎿ " tool_result, a bare
  // "❯ " prompt, and a plain, unlabeled reply.
  const script = [
    { type: "shell", text: "flash" },
    { type: "banner" },
    { type: "prompt", text: "check if the API server is running, then tail its logs" },
    { type: "thinking" },
    { type: "tool", text: "Bash(curl -s localhost:8000/health)" },
    { type: "result", text: '{"status":"ok"}' },
    { type: "tool", text: "Bash(tail -n 5 server.log)" },
    { type: "result", text: "INFO  listening on :8000\nINFO  0 active connections" },
    { type: "reply", text: "Server's healthy and idle. Want me to watch it live?" },
    { type: "prompt", text: "" },
  ];

  function formatResult(text) {
    const lines = text.split("\n");
    const first = `  ⎿  ${lines[0]}`;
    const rest = lines.slice(1).map((line) => `     ${line}`);
    return [first, ...rest].join("\n");
  }

  function lineEl(step) {
    const div = document.createElement("div");
    div.className = `tline tline-${step.type}`;

    switch (step.type) {
      case "shell":
        div.innerHTML = `<span class="tline-shell-prompt">$</span> <span class="tline-target"></span>`;
        break;
      case "banner":
        div.innerHTML =
          `<div class="banner-title">Flash CLI</div>` +
          `<div class="banner-info"><span class="banner-accent">/help</span> for commands&nbsp;&nbsp;&nbsp;model: llama3.1&nbsp;&nbsp;&nbsp;host: localhost:11434</div>`;
        break;
      case "prompt":
        div.innerHTML = `<span class="tline-chevron">&#10095;</span> <span class="tline-target"></span>`;
        break;
      case "thinking":
        div.textContent = "Thinking…";
        break;
      case "tool":
        div.innerHTML = `<span class="tline-bullet">&#9679;</span> <span class="tline-target"></span>`;
        break;
      case "result":
        div.innerHTML = `<span class="tline-target"></span>`;
        break;
      default:
        div.innerHTML = `<span class="tline-target"></span>`;
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
        const el = lineEl(step);
        termOutput.appendChild(el);
        const target = el.querySelector(".tline-target");

        if (step.type === "banner") {
          await sleep(320);
          continue;
        }

        if (step.type === "thinking") {
          await sleep(reduceMotion ? 0 : 650);
          el.remove();
          continue;
        }

        if (step.type === "shell" || step.type === "prompt") {
          if (reduceMotion) {
            target.textContent = step.text;
          } else {
            await typeInto(target, step.text, 16);
          }
          await sleep(step.type === "shell" ? 260 : 460);
          continue;
        }

        const text = step.type === "result" ? formatResult(step.text) : step.text;
        target.textContent = text;
        await sleep(step.type === "tool" ? 320 : 420);
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
    .tline-shell-prompt { color: var(--muted); }
    .tline-chevron { color: var(--accent); }
    .tline-bullet { color: var(--accent); }
    .tline-thinking { color: var(--muted); font-style: italic; }
    .tline-tool .tline-target { color: #d9d5cc; }
    .tline-result .tline-target { color: var(--muted); white-space: pre-wrap; }
    .tline-reply .tline-target { color: #d9d5cc; }
    .tline-banner {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: inline-block;
    }
    .banner-title { font-weight: 700; color: #d9d5cc; margin-bottom: 8px; }
    .banner-info { color: var(--muted); font-size: 0.82rem; }
    .banner-accent { color: var(--accent); }
  `;
  document.head.appendChild(style);

  runTypingLoop();
}
