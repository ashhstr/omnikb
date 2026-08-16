# Katalog Skill Library — C:\Ash-Workspace\Skills

Dokumentasi 25 repo yang di-clone dari GitHub. Status: `terpasang` = aktif di opencode global, `library` = tersimpan utk dipakai manual/kurasi, `pending` = butuh prasyarat.

## Terpasang ke opencode (skills global)

Lokasi: `C:\Users\user\.config\opencode\skills\` — 71 skill, semua frontmatter valid (name match folder + description).

| Sumber | Skill | Jumlah |
|---|---|---|
| hardikpandya/stop-slop | stop-slop | 1 |
| mvanhorn/last30days-skill | last30days | 1 |
| Humanizr/Humanizer | add-locale, add-locale-batch | 2 |
| pbakaus/impeccable | impeccable | 1 |
| multica-ai/andrej-karpathy-skills | karpathy-guidelines | 1 |
| greensock/gsap-skills | gsap-core, gsap-frameworks, gsap-performance, gsap-plugins, gsap-react, gsap-scrolltrigger, gsap-timeline, gsap-utils | 8 |
| Leonxlnx/taste-skill | brandkit, design-taste-frontend, design-taste-frontend-v1, full-output-enforcement, gpt-taste, high-end-visual-design, image-to-code, imagegen-frontend-mobile, imagegen-frontend-web, industrial-brutalist-ui, minimalist-ui, redesign-existing-projects, soft → high-end-visual-design, stitch-design-taste | 13 |
| nextlevelbuilder/ui-ux-pro-max-skill | banner-design, brand, design, design-system, slides, ui-styling, ui-ux-pro-max | 7 |
| obra/superpowers | brainstorming, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills | 14 |
| addyosmani/agent-skills | api-and-interface-design, browser-testing-with-devtools, ci-cd-and-automation, code-review-and-quality, code-simplification, context-engineering, debugging-and-error-recovery, deprecation-and-migration, documentation-and-adrs, doubt-driven-development, frontend-ui-engineering, git-workflow-and-versioning, idea-refine, incremental-implementation, interview-me, observability-and-instrumentation, performance-optimization, planning-and-task-breakdown, security-and-hardening, shipping-and-launch, source-driven-development, spec-driven-development, using-agent-skills, writing-plans | 24 |

Catatan: nama skill di taste-skill di-rename mengikuti frontmatter `name` (aturan opencode: folder = name).

## Terpasang ke opencode (agents global)

Lokasi: `C:\Users\user\.config\opencode\agent\` — 55 agent, semua punya `description`.

- **wshobson/agents** (28 agent, kurasi dari 738): ui-design (3), content-marketing (2), social-publishing (1), seo-content-creation (3), seo-technical-optimization (4), seo-analysis-monitoring (3), meigen-ai-design (3), frontend-mobile-development (2), startup-business-analyst (1), multi-platform-apps (6).
- **contains-studio/agents** (32 agent): design, engineering, marketing, product, project-management, studio-operations, testing (agent md dengan frontmatter name+description+color+tools).
- msitarzewski/agency-agents & repo agent raksasa lain → **library** (316+ agent; kurasi manual jika dibutuhkan).

## Library (tersimpan, tidak diaktifkan penuh)

| Repo | Isi | Alasan |
|---|---|---|
| sickn33/agentic-awesome-skills | 2.009 SKILL | Terlalu banyak → context explosion. Kurasi manual. |
| mukul975/Anthropic-Cybersecurity-Skills | 817 SKILL | Sama. Ambil sesuai kebutuhan. |
| affaan-m/ECC | 378 SKILL + framework lengkap (install.ps1) | Framework mandiri, bukan skill tunggal. |
| msitarzewski/agency-agents | 316 agent | Kurasi divisi yg relevan bila perlu. |
| garrytan/gstack | 59 SKILL | Curated stack skill; pasang selektif bila perlu. |
| mattpocock/skills (mp-skills) | ~40 skill engineering/productivity | Kurasi bila perlu. |
| karpathy/autoresearch | Tool riset Python (pyproject) | Butuh Python — belum terpasang. |
| browser-use/browser-use | MCP browser automation + 7 skill | **Pending**: butuh Python/uv + Playwright. |
| shadcn-ui/ui | Komponen UI library | Library kode, bukan skill. |
| motiondivision/motion | Library animasi | Library kode, bukan skill. |
| punkpeye/awesome-mcp-servers | Katalog MCP servers | Referensi daftar, bukan installable. |
| ruvnet/ruflo | Framework workflow/plugin besar | Framework mandiri (SKILL.md di root). |
| Egonex-AI/Understand-Anything | Plugin comprehension (TS) | Plugin mandiri. |

## Pending / Prasyarat

- **Python** tidak terpasang di mesin → browser-use, autoresearch, dan skill Python lain belum bisa jalan. Install Python 3.11+ (via winget: `winget install Python.Python.3.12`) bila ingin mengaktifkan browser-use MCP.
- Setelah Python ada: `uvx browser-use` atau `pip install browser-use` lalu daftarkan MCP di `opencode.jsonc`.

## Update

- Repo di-update via `git -C C:\Ash-Workspace\Skills\<repo> pull` (semua shallow clone --depth 1).
- Skill di-update dengan re-copy dari repo ke `~/.config/opencode/skills/`.
- Agent di-update dengan re-copy dari repo ke `~/.config/opencode/agent/`.
- Setelah perubahan, restart opencode (config tidak hot-reload).