# Aider for LDDE-ZeroTouch (Supercharged — Research Grounded)

**The practical local agentic file-intelligence + small-project tool** for your MSI Prestige + external SSD + Ollama workflow.

This setup was directly supercharged from the exact 4 research files in `C:\project\local first\` (Agentic Orchestration Blueprint, Zero-Touch Provisioning Analysis, LDDE PowerShell Bootstrapper, and the cloud-synchronized unprivileged workspace autopsy).

## One-Time Prerequisites (on this machine)

1. Ollama running + the research-recommended model pulled:
   ```powershell
   ollama pull qwen2.5-coder:7b-instruct-q4_K_M
   # or the faster router model
   ollama pull qwen2.5:3b-instruct-q4_K_M
   ```

2. (Optional but recommended) Move active LDDE work **off OneDrive**:
   - Follow the 5 hygiene commands documented in `.aider.instructions.md` (neutral path or external SSD root).

3. `cd C:\project`

## Launch (Local-First by Default)

```powershell
# Best daily driver — uses the exact 7B Q4 coder + full research instructions
.\aider\Start-Aider.ps1

# Planning-heavy work (scaffolds, bootstrap scripts, big cleanups)
.\aider\Start-Aider.ps1 -Mode local-architect

# Quick & dirty file fixes
.\aider\Start-Aider.ps1 -Mode local-fast
```

You can override with any Ollama tag: `.\aider\Start-Aider.ps1 -Model ollama/qwen2.5-coder:14b-instruct-q4_K_M`

## The Supercharged Custom Commands (inside Aider session)

- `/cleanup-files` — Deep intent-aware, safe, reversible file/folder intelligence (your #1 daily weapon)
- `/scaffold-small-project` — Small, boring, correct, TDD-first, zero-touch-aware projects with hygiene block
- `/make-deterministic` — Hunt and kill every source of randomness + expose all levers (now includes Grounded Verification + audit trails)
- `/hard-review` — Ruthless audit through PTCF + zero-touch + VRAM + hygiene + Grounded Verification lenses
- `/minimal-kill` — Delete as much as possible while keeping the required behavior
- `/zero-touch-ps` — Turn the entire Zero-Touch + Bootstrapper research into a working headless PowerShell (the big one)
- `/ptcf-plan` — Force the Persona/Task/Context/Format ritual before any complex work (strengthened with Verified.pdf grounding)
- `/grounded-verify` — Focused checklist for primary sources, audit trails, constant comparison, tiering, quality gates, and curated deception patterns from Groknett ValueForge ontology (Verified.pdf + ValueForge integration)

## Key Files (Everything Contained)

- `C:\project\.aider.conf.yml` — Local Ollama defaults + history in `aider/` subfolder (no root spam)
- `C:\project\.aider.instructions.md` — The real brain: PTCF, Jesus Code verifier, exact bypasses, 20 AI failure modes, workspace hygiene, hardware math
- `aider/` — All launchers, custom commands, and chat histories live here

## Philosophy (from the research)

Boring and correct > clever.  
Full GPU offload on 8 GB VRAM class hardware.  
Zero interactive prompts in anything you generate.  
Workspaces live on external SSD or clean local paths — never deep in OneDrive when doing real LDDE work.  
PTCF + TDD + self-healing recovery hints on everything non-trivial.

This is now a properly supercharged local deterministic specialist. Go use it.

## Updating

```powershell
python -m pip install -U aider-chat
```
