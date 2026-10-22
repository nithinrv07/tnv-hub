# Push Integrated Monorepo to Main Branch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cleanly stage, commit, and push the verified integrated monorepo architecture (`client/`, `server/`, `scripts/`, `package.json`, `.gitignore`, `Design.md`, `INTEGRATION_PLAN.md`, `.env.example`, `README.md`) to the `main` branch of `origin` (`https://github.com/nithinrv07/tnv-hub.git`), strictly preserving the exclusion of `frontend/`, `backend/`, and `tnv-selection-next-master/`.

**Architecture:** A unified parallel monorepo containing a React + Vite client (`client/`), a Node.js REST API server with Supabase bridge (`server/`), root development orchestration (`scripts/dev.js`), and automated end-to-end test suites.

**Tech Stack:** Node.js, Express, React, Vite, Tailwind CSS, Supabase / PostgreSQL, Git.

**Spec:** Monorepo parity and integration plan documented in `INTEGRATION_PLAN.md` and `Design.md`.

## Global Constraints

- Never commit `node_modules/`, `dist/`, `.env`, or temporary media/scratch files.
- Strictly exclude `frontend/`, `backend/`, and `tnv-selection-next-master/` from the commit and push.
- Verify `npm run build:client` succeeds with 0 errors before staging.
- Verify backend test suites pass 100% before committing.
- Commit to the local `main` branch and push to `origin main`.

## Review Focus

1. Verify `git status` before commit: ensure `frontend/`, `backend/`, and `tnv-selection-next-master/` are NOT staged.
2. Verify `.gitignore` maintains rules for all reference and dependency folders.
3. Verify `README.md` on `main` accurately describes the unified monorepo run commands (`npm run dev`, `npm test`).
4. Verify remote push to `https://github.com/nithinrv07/tnv-hub.git` completes cleanly on `main`.

---

### Task 1: Verify `.gitignore` and Update `README.md` for Monorepo

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Consumes: Existing git repository configuration.
- Produces: Updated documentation and ignore rules reflecting the unified monorepo.

- [ ] **Step 1: Check `.gitignore` rules**
Ensure `frontend/`, `backend/`, `tnv-selection-next-master/`, `node_modules/`, `dist/`, and `.env` are ignored.

- [ ] **Step 2: Update `README.md`**
Update `README.md` to explain the unified monorepo, how to run `npm run dev` (starts server on 3000 and client on 5173), and run tests via `npm test`.

---

### Task 2: Run Pre-Commit Build and Test Validations

**Files:**
- Client: `client/`
- Server: `server/`

- [ ] **Step 1: Run client build verification**
Run: `npm run build:client`
Expected: Production bundle built with 0 errors.

- [ ] **Step 2: Run server test suites**
Run: `npm test` and `node server/test/verify_question_bank_and_past_field_work.test.js`
Expected: 100% tests passing.

---

### Task 3: Stage Integrated Monorepo Files and Validate Staged Set

**Files:**
- Staged: `.gitignore`, `.env.example`, `Design.md`, `INTEGRATION_PLAN.md`, `package.json`, `README.md`, `scripts/`, `client/`, `server/`, `docs/`

- [ ] **Step 1: Stage integrated files**
```bash
git add .gitignore .env.example Design.md INTEGRATION_PLAN.md package.json README.md scripts/ client/ server/ docs/
```

- [ ] **Step 2: Verify staged files**
Run: `git status -s`
Ensure NO files from `frontend/`, `backend/`, or `tnv-selection-next-master/` are staged.

---

### Task 4: Commit and Push to Origin Main

- [ ] **Step 1: Commit with descriptive message**
```bash
git commit -m "feat: integrate unified monorepo with civic design, volunteer registration, and question bank"
```

- [ ] **Step 2: Push to remote main**
```bash
git push origin main
```

- [ ] **Step 3: Confirm remote tracking status**
Run: `git status` and `git log -n 1`
Expected: Clean working tree, ahead by 0 commits, synchronized with `origin/main`.
