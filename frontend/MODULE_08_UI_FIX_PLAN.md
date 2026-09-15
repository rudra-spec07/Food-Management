# Module 08 — UI Layout & Shell Architecture Correction Plan

This document details the root cause analysis, DOM hierarchy findings, layout architecture fixes, and verification strategy for resolving:
1. Audit Log Detail Modal Vertical Overflow & Stacking Context Issue.
2. App Shell Sidebar Height & Container Scroll Cutoff Issue.

---

## 1. Why Previous Fixes Failed & Root Cause Analysis

### Problem 1: Audit Log Detail Modal Overflow
- **Why Previous Fix Failed**:
  The modal JSX `{selectedLog && (...) }` was rendered directly inside `AdminAuditLogsPage.tsx`, which sits inside `<div className="animate-fade-in foodshare-container">`.
  According to CSS specification, any element with a `transform`, `perspective`, or CSS `animation` (e.g., `animate-fade-in`) establishes a **new containing block for all `position: fixed` descendants**.
  Consequently, `position: fixed; inset: 0` on the modal overlay positioned it relative to the 1729px tall `.foodshare-container` content block rather than the 746px browser viewport (`window`).
  This caused `align-items: center` to center the modal card around Y = 864px (halfway down the 1729px document), pushing the modal card off-screen below the browser viewport/taskbar when the user was at scroll Y = 0.

- **Actual Root Cause**:
  1. Stacking Context / Containing Block Trap: Rendering fixed overlays inside animated/transformed page containers breaks viewport positioning.
  2. Scope: The overlay did not dim the entire viewport (sidebar remained un-dimmed).

### Problem 2: Sidebar Visual & Container Bug
- **Why Previous Fix Failed**:
  The previous fix set `.app-sidebar` to `position: sticky; top: 0; height: 100vh; align-self: flex-start;` inside `.app-shell` (`display: flex; min-height: 100vh;`).
  With `align-self: flex-start`, `.app-sidebar`'s height in flexbox layout was restricted to 100vh (746px). When the main content container (`.app-main-layout`) expanded to 1729px to accommodate table rows, scrolling the browser window moved `.app-sidebar` out of view as soon as window scroll exceeded 0px, because `.app-sidebar`'s containing flex box had no remaining distance to stick inside.
  When `.app-sidebar` scrolled off-screen, the empty `#faf8f5` body background below 746px was exposed, making the sidebar look like a short white panel that visually terminated around "Beneficiaries".

- **Actual Root Cause**:
  1. Document-Level Window Scroll vs. Fixed App Shell: The app shell allowed the `window`/`document` to scroll, causing sticky flex items with fixed height to scroll off-screen.
  2. Lack of Scroll Isolation: The main content container (`.app-main-layout`) was not designated as the vertical scroll container for desktop viewports.

---

## 2. Proposed Architectural Implementation

### Fix 1: React Portal for Audit Log Detail Modal (`AdminAuditLogsPage.tsx`)
- **Use `ReactDOM.createPortal`**: Render the modal backdrop and dialog directly into `document.body`.
- **Break Stacking Context**: By rendering as a direct child of `document.body`, the overlay escapes `.animate-fade-in` containing blocks.
- **Viewport Constraints**:
  - Backdrop Overlay: `position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100dvh; z-index: 9999; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; padding: 16px;`.
  - Modal Card Dialog: `max-height: calc(100dvh - 32px); width: 100%; max-width: 560px; display: flex; flex-direction: column; overflow: hidden;`.
  - Internal Scroll Body: `flex: 1; overflow-y: auto; padding: 20px 24px;`.
- **Body Scroll Lock**: Toggle `document.body.style.overflow = 'hidden'` when `selectedLog` is open, and restore on close.

### Fix 2: Desktop App Shell Layout (`index.css` & `AppLayout.tsx`)
- **Fixed Desktop Shell Architecture (>= 1024px)**:
  ```css
  .app-shell {
    display: flex;
    height: 100dvh;
    max-height: 100dvh;
    overflow: hidden;
    background-color: var(--bg-page);
    width: 100%;
  }

  .app-sidebar {
    width: 250px;
    background-color: var(--bg-surface);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    height: 100dvh;
    z-index: 40;
    flex-shrink: 0;
  }

  .app-main-layout {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100dvh;
    overflow-y: auto;
  }
  ```
- **Mobile / Tablet Overrides (< 1024px)**:
  ```css
  @media (max-width: 1023px) {
    .app-shell {
      min-height: 100dvh;
      height: auto;
      overflow: visible;
    }
    .app-sidebar {
      display: none !important;
    }
    .app-main-layout {
      height: auto;
      overflow: visible;
    }
    .app-bottom-nav {
      display: flex !important;
    }
  }
  ```
- **Benefits**:
  - The sidebar stays permanently 100% height (`100dvh`) on the left, continuous from top to bottom.
  - `.app-main-layout` handles all vertical scrolling on desktop. As page content grows, the sidebar never scrolls away or cuts off.
  - Zero unwanted white strips or exposed borders.
  - Existing `BottomNav` and mobile layout remain 100% unaffected and fully functional.

---

## 3. Target Files to Modify

1. `frontend/src/index.css` (Update `.app-shell`, `.app-sidebar`, and `.app-main-layout` CSS definitions)
2. `frontend/src/pages/admin/AdminAuditLogsPage.tsx` (Use `ReactDOM.createPortal` for modal rendering, update viewport max-height and body scroll lock)

---

## 4. Verification Plan

1. **Automated Tests & Build Checks**:
   - `npm --prefix frontend run typecheck`
   - `npm --prefix frontend test`
   - `npm --prefix frontend run build`
   - `git diff --check`
2. **Manual Browser Inspection via Subagent**:
   - Verify top, middle, and bottom scroll positions on `/admin/audit-logs`.
   - Verify modal centering and viewport fitting at 1440px, 1280px, 1024px, 768px, 640px, 480px, 375px.
   - Verify sidebar continuity across all admin screens (`/dashboard`, `/admin/reports`, `/admin/donations/review`, `/admin/workers`, `/admin/donations/assignments`, `/inventory`, `/reservations`, `/distributions`, `/beneficiaries`).
