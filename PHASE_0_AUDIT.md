# Phase 0: Access and Permissions Audit

Audit date: 2026-10-30 (Europe/Riga).
Status: COMPLETE. Required development access is verified. Native iPhone acceptance remains a later release gate.

## Requirements reviewed

The complete owner-supplied brief in `/Users/danielerglis/.codex/attachments/3f83fd2f-7a02-481f-bc3f-c7e4bb7a322c/Pasted text.txt` was reviewed. It is the requirements authority. Do not create implementation source before completing Phase 0. Communicate with the owner in Russian; write internal documentation, source comments, and commit messages in English.

## Verified environment

| Check | Actual result |
| --- | --- |
| Project directory | Initially empty. Read/write/delete verified using a temporary probe, subsequently removed. |
| Terminal | zsh commands execute successfully. |
| Git | Apple Git 2.54.0 (Apple Git-157). No local repository initialized at audit time. Git can resolve a default author identity, but explicit user.name/user.email settings were not found. |
| Node.js | Bundled Node.js v24.22.1 runs successfully. Node and npm are absent from the default PATH. No installation needed for a dependency-free build and test workflow. |
| Automated tests | Built-in node:test and node:assert/strict smoke test: one passed, zero failed. No product tests exist yet. |
| Web research | Public schedule homepage, sample group page, and official Scriptable documentation opened successfully with the web tool. |
| Terminal HTTPS | Default sandbox request failed DNS resolution. Approved elevated curl request returned HTTP 200 and 10,252 bytes for the sample group. |
| Source snapshot | Real UTF-8 HTML saved to `/private/tmp/turiba-next-phase0-source.html`. This is an access probe, not completed parser research. |
| GitHub identity | Connected GitHub tool successfully authenticated as DanielsErglis. |
| Target repository | Initial lookup returned 404. Follow-up on owner-confirmed DanielsErglis/turiba-next succeeded: ID 1439681249, private, main, pull=true, push=true. Actual write and exact read-back verified with commit 7ea2f46a01dc6489fc8fcd80038160733864937e. |
| GitHub creation | Available connector has repository content and commit tools but no repository-creation tool. gh CLI is absent. Manual creation avoids installing a CLI or requesting a broadly scoped token. |
| UI preview | Bundled Playwright is available. Its managed Chromium executable is absent. Installed Google Chrome successfully launched headless with an isolated temporary profile through an approved elevated command; local HTML page title verified. Default sandbox launch failed. |
| Scriptable build | Node runtime is available for later bundling. No package has been generated or validated. Node will not be required on the iPhone. |
| Native iOS verification | No Xcode installation or simctl found at checked locations. Scriptable is absent from /Applications. Native widget appearance, iOS scheduling, and notification permissions require later physical iPhone testing. Browser previews cannot establish native correctness. |
| Disk space | Approximately 151 GiB available according to df. |
| Limits | Workspace writes are limited to authorized project and temporary directories. No reliable remaining account credit/token quota is exposed. No paid services authorized or used. |

Bundled Node executable:
`/Users/danielerglis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`

## Repository access verification

The owner confirmed creation of `DanielsErglis/turiba-next` and authorized repository-specific read/write checks. All GitHub calls in this verification were scoped to this repository; no unrelated repositories were inspected.

1. Metadata lookup succeeded: repository ID 1439681249, visibility `private`, default branch `main`, permissions `pull=true` and `push=true` (the response also reports administrative permissions; this project does not require exercising them).
2. Initial contents lookup explicitly returned `This repository is empty.` No existing owner files were overwritten.
3. Created this audit document through the GitHub contents API with commit message `docs: initialize access audit and verify repository write access`.
4. GitHub returned commit `7ea2f46a01dc6489fc8fcd80038160733864937e`.
5. Fetched the document at that exact commit and compared the complete UTF-8 content with the submitted text: exact match. Read-back blob SHA: `245dbcb4d58cf7dcdfaeda804208e9ca1dfc6c59`.
6. Direct Git HTTPS was tested with terminal prompts disabled and failed because no username/credential was available. This is not a connector failure. Use the authenticated connector for remote commits; do not request a broadly scoped token or claim direct git push works.

No further development permission is currently required. The repository must remain private. No passwords or tokens were requested or stored.

## Remaining limitations

- Native Scriptable rendering, refresh behavior, Shortcuts automation, and notification consent must be tested on a real iPhone before final acceptance.
- Browser rendering is a preview only. No Scriptable build or product test is claimed by this audit.
- Some network/browser commands require narrowly scoped sandbox escalation; HTTPS and isolated browser probes have succeeded through that mechanism.
- Account quota is not exposed. Do not purchase credits or add paid services without authorization.

## Phase 0 exit and next action

Phase 0 is complete: folder access, terminal, Git, Node, a test runner, HTTPS source access, browser preview capability, and private repository read/write have been exercised. Create the complete English PROJECT_SPEC.md, AGENTS.md, and PROGRESS.md, commit the Phase 0 documentation, and proceed to Phase 1 research and parser tests. No implementation source was created before this exit decision.

References checked: https://nodarbibas.turiba.lv/, https://nodarbibas.turiba.lv/pub_nod.asp?Grupa=TVL2D1, https://docs.scriptable.app/.
