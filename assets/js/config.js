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
  // a bare `flash-onyx-2.4` does not resolve: every model reference needs
  // `:12b`, `:31b`, or `:31b-cloudbase`.
  onyx: {
    version: "Flash Onyx 2.4",
    releaseTag: "Current release",
    baseModel: "gemma4",
    sizes: "12B / 31B",
    context: "64K of 256K",
    input: "text + images",
    small: {
      tag: "flash-onyx-2.4:12b",
      label: "12B, the everyday driver",
      pullCmd: "ollama pull Natuworkguy/flash-onyx-2.4:12b",
    },
    large: {
      tag: "flash-onyx-2.4:31b",
      label: "31B, the flagship",
      pullCmd: "ollama pull Natuworkguy/flash-onyx-2.4:31b",
    },
    // Cloudbase ships the prompt alone and runs on a hosted base, so it
    // exists only for sizes whose base publishes a `-cloud` tag. gemma4
    // publishes one at 31b and none at 12b, which is why there is no
    // 12b-cloudbase: models/build.py checks the registry and skips it.
    cloud: {
      tag: "flash-onyx-2.4:31b-cloudbase",
      label: "31B cloudbase, 96 kB",
      pullCmd: "ollama pull Natuworkguy/flash-onyx-2.4:31b-cloudbase",
      hostedBase: "gemma4:31b-cloud",
      downloadSize: "96 kB",
      localSize: "19.9 GB",
      signinCmd: "ollama signin",
    },
    buildCmd: "python3 models/build.py models/flash-onyx-2.4.Modelfile",
    showCmd: "ollama show --modelfile flash-onyx-2.4:31b",
    selectCmd: "/model flash-onyx-2.4:31b",
  },
};
