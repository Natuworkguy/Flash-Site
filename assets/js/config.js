// Single source of truth for every command, link, and model reference on the
// site. Partials reference these values with {{dotted.path}} tokens, so
// updating one field here (for example, shipping a new Flash Onyx release)
// propagates to every section, code block, and copy button automatically.
export const SITE = {
  github: "https://github.com/Natuworkguy/Flash",
  installCmd: "curl -fsSL https://raw.githubusercontent.com/Natuworkguy/Flash/main/install.sh | bash",
  uninstallCmd: "curl -fsSL https://raw.githubusercontent.com/Natuworkguy/Flash/main/install.sh | bash -s -- --uninstall",
  runCmd: "flash",
  windows: {
    installCmd: "irm https://raw.githubusercontent.com/Natuworkguy/Flash/main/install.ps1 | iex",
    uninstallCmd: "& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Natuworkguy/Flash/main/install.ps1))) -Uninstall",
    runCmd: "flash",
  },
  manual: {
    clone: "git clone https://github.com/Natuworkguy/Flash\ncd Flash",
    deps: "pip install -r requirements.txt",
    pullModel: "ollama pull llama3.1",
    run: "python3 run.py",
  },
  // Hot-swap point: bump these five fields to promote a new Flash Onyx
  // release across the entire site in one edit.
  onyx: {
    version: "Flash Onyx 1",
    releaseTag: "Current release",
    pullId: "Natuworkguy/flash-onyx-1",
    pullCmd: "ollama pull Natuworkguy/flash-onyx-1",
    buildCmd: "ollama create flash-onyx-1 -f models/flash-onyx-1.Modelfile",
    baseModel: "llama3.1",
  },
};
