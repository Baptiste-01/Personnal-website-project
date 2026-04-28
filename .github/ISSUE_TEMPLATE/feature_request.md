---
name: 🚀 Feature Implementation
description: Standard template for planning and implementing a new game feature.
title: 'feat: [Short Title]'
labels: 'enhancement'
assignees: ''
---

## 🎯 Context & Objective
**Description:** 

## 🎨 UI/UX Specifications (Frontend)
> ⚠️ **Project Policy Reminder:** Every text, label, or notification displayed on the screen MUST be in **French**.

* **Target Components:** 
* **State/Props requirements:** 
* **Tailwind Styling Guidelines:** 
* **French Wording Draft:** 

## ⚙️ Technical Specifications (Backend & Shared)
> ⚠️ **Project Policy Reminder:** Codebase must be strictly in **English**. Zero tolerance for `any`, `unknown`, or `undefined` (Use `null`).

### 1. API & WebSockets (Layer 1)
* **Events/Endpoints:** 
* **Shared Types required:** 

### 2. Business Services (Layer 2)
* **Core Logic (Pure functions):** 
* **Validation requirements:** 

### 3. Data Access / Prisma (Layer 3)
* **Schema alterations:** 
* **Relations / Constraints:** 

## 📋 Definition of Done (DoD)
**Type Safety & Standards**
- [ ] Strictly zero usage of `any`, `unknown`, or `undefined`.
- [ ] Intentional absence of values is represented by `null`.
- [ ] All variables, functions, comments, and commits are in English.

**Architecture**
- [ ] The "Rule of 3" is respected: Logic is in Services, not Controllers.
- [ ] Shared types are properly centralized in `packages/shared`.
- [ ] Reusable UI logic is extracted into Custom Hooks.

**User Interface**
- [ ] All user-facing text is written in perfect French.
- [ ] Components are atomic and styled cleanly with TailwindCSS.

## 🔗 Additional Context
