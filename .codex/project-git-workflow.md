<!-- codex-project-git-workflow: initialized -->
<!-- initialized-at: 2026-08-30 06:05:10 +08:00 -->

# Codex Git Workflow

Initialization status: initialized
Project: BladeTrace
Repository root: D:\WebProjects\BladeTrace
Machine config: `
.codex\project-git-workflow.json
`
Skill: project-git-workflow

Treat this document and the machine config as the source of truth for this repository's Codex git workflow. Do not replace them with generic defaults unless the user explicitly asks to reinitialize or update the policy.

## Global Wrappers

Run these from the repository root:

```
powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Validate.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Commit.cmd -Message "commit message" -Paths path\to\file,other\file
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "commit message" -Paths path\to\file,other\file
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Push.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Stash.cmd -StashMessage "reason"
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\StashPop.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Ignore.cmd -Pattern build-output/
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\DiscardPaths.cmd -ConfirmDangerous -Paths path\to\file
```

## Status

```
powershell
git -c safe.directory=D:/WebProjects/BladeTrace status --short --branch
```

## Validation

Run these before commit or push, in order:

```powershell
node --check app/game.js
```

```powershell
node tools/verify-app.mjs
```

## Staging Policy

selected files only

Inspect status before staging. Preserve unrelated user changes unless the user explicitly asks to include them.

## Commit

Use the global wrapper's built-in git commit after staging according to policy. Prefer concise conventional commit messages unless the user specifies another message.

## Push

```
powershell
git -c safe.directory=D:/WebProjects/BladeTrace push -u origin HEAD
```

## Docs And TODO

Keep README files, docs/architecture.md, and docs/roadmap.md current when gameplay behavior changes.

## Safety And Branch Policy

No force-push. Commit only validated changes to main.
