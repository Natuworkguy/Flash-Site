// Single source of truth for every command, link, and model reference on the
// site. Partials reference these values with {{dotted.path}} tokens, so
// updating one field here (for example, shipping a new Flash Onyx release)
// propagates to every section, code block, and copy button automatically.
export const SITE = {
  github: "https://github.com/Natuworkguy/Flash",
  demoVideo: {
    id: "padyQR3tPUs",
    title: "FLASH demo video",
  },
  installCmd: "curl -fsSL https://flashproject.dev/install.sh | bash",
  uninstallCmd: "curl -fsSL https://flashproject.dev/install.sh | bash -s -- --uninstall",
  runCmd: "flash",
  windows: {
    installCmd: "irm https://flashproject.dev/install.ps1 | iex",
    uninstallCmd: "& ([scriptblock]::Create((irm https://flashproject.dev/install.ps1))) -Uninstall",
    runCmd: "flash",
  },
  manual: {
    clone: "git clone https://github.com/Natuworkguy/Flash\ncd Flash",
    deps: "pip install -r requirements.txt",
    pullModel: "ollama pull llama3.1",
    run: "python3 run.py",
  },
  // Hot-swap point: bump these fields to promote a new Flash Onyx release
  // across the entire site in one edit. Tags carry a size from Onyx 2 on, so
  // a bare `flash-onyx-2.1` does not resolve: every model reference needs
  // `:12b` or `:31b`.
  onyx: {
    version: "Flash Onyx 2.1",
    releaseTag: "Current release",
    baseModel: "gemma4",
    sizes: "12B / 31B",
    context: "32K",
    input: "text + images",
    small: {
      tag: "flash-onyx-2.1:12b",
      label: "12B, the everyday driver",
      pullCmd: "ollama pull Natuworkguy/flash-onyx-2.1:12b",
    },
    large: {
      tag: "flash-onyx-2.1:31b",
      label: "31B, the flagship",
      pullCmd: "ollama pull Natuworkguy/flash-onyx-2.1:31b",
    },
    buildCmd: "python3 models/build.py models/flash-onyx-2.1.Modelfile",
    selectCmd: "/model flash-onyx-2.1:31b",
  },
};
