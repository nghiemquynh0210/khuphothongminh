---
name: tailwind-component-crafting
description: >-
  Production-grade React and Tailwind CSS UI crafting skill for creating clean, accessible, and responsive components,
  micro-interactions, badge tokens, and structured data tables. Use when authoring or refactoring frontend React/Tailwind code.
---

# Tailwind CSS & React Component Crafting Skill

This skill provides step-by-step procedures for constructing responsive, highly-polished React components using Tailwind CSS and modern Web guidelines.

## Component Anatomy Guidelines

### 1. Container and Viewport Management
- **Modal overlays:** Use `fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-[2px] animate-in fade-in duration-200`.
- **Modal card:** `bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`.
- **Card scroll container:** `flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/70`.

### 2. State & Tab Transitions
- Use controlled state for tabs: `const [activeTab, setActiveTab] = useState<"general" | "premises" | "personnel" | "history">("general");`
- Tab buttons must include active underline or pill indicators:
  ```tsx
  <button
    onClick={() => setActiveTab("general")}
    className={`py-3 relative cursor-pointer flex items-center gap-2 font-bold transition-colors ${
      activeTab === "general" ? "text-blue-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
    }`}
  >
    <FileText size={15} />
    <span>Thông tin chung</span>
    {activeTab === "general" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-700" />}
  </button>
  ```
- Wrap tab panel contents in `animate-in fade-in duration-150` for smooth switching without layout shifts.

### 3. Responsive Grids & Form Controls
- Use mobile-first grids: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4`.
- For spans: `sm:col-span-2` or `lg:col-span-3`.
- Input fields:
  ```tsx
  <input
    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all placeholder:text-slate-400"
  />
  ```

### 4. Interactive Feedback & Micro-interactions
- Add `cursor-pointer` to all interactive buttons.
- Use `transition-all duration-150` or `transition-colors`.
- Focus rings for keyboard navigation: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`.
- Hover lifts: `hover:shadow-md hover:border-slate-300`.

