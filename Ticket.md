## Cursor Task — Build Gamification UI Components Using shadcn/ui

### Context  
We are adding gamification (XP, levels) to our to-do app. Implement the visual UI pieces using **shadcn/ui** components (Radix + Tailwind). Components should be accessible, composable, and styled to match the existing design system.

### Components to build / scaffold

1. **XPBar / ProgressBar**  
   - Use `Progress` component from shadcn/ui. :contentReference[oaicite:0]{index=0}  
   - Props: takes `currentXp`, `xpToNextLevel` → computes a normalized progress value (e.g. percent)  
   - Display: horizontal bar + text like "Level 3 • 150 / 200 XP"  
   - Animation: when XP updates, animate the bar fill (use Framer Motion or Tailwind transitions).  
   - Accessible: `aria-label`, announce value if needed.

2. **XP Toast**  
   - Use `Toast` from shadcn/ui. :contentReference[oaicite:1]{index=1}  
   - Use `useToast` hook from shadcn/ui. :contentReference[oaicite:2]{index=2}  
   - When a task is completed and XP is granted, show a toast with message: `+{xp} XP` and a short description (e.g. "Medium task done").  
   - Variant: use a "success" or neutral toast style.

3. **Level-Up Dialog**  
   - Use `Dialog` from shadcn/ui. :contentReference[oaicite:3]{index=3}  
   - When user levels up, open a modal dialog that:
     - Says "Congratulations!" or "Level Up!"  
     - Shows new level number.  
     - Optionally, show an icon or badge (you can pick a simple SVG or shadcn `Badge` component).  
     - Has a "Continue" or "Close" button.  
   - Should trap focus and be keyboard accessible.

4. **Progress / Profile Panel** *(Optional, but helpful)*  
   - A small panel / card showing:
     - Current level  
     - Total XP  
     - Current streak  
     - Badges (if you already have schema)  
   - Built from shadcn/ui primitives: maybe `Card`, `Badge`, `Progress`.

### Integration Points

- Place `XPBar` component in your `Header.tsx` or top-level UI so it's always visible.  
- Add `Toaster` component at the root of your app, in `App.tsx` or `main.tsx`, so toasts can show globally.  
- Use the level-up dialog after calling `grantXp` (from backend): if the backend response indicates a level-up, trigger opening the dialog.  
- Use your existing Zustand or React store to store progress data (`xp_total`, `level`, etc.), and feed that into `XPBar` and dialogs.

### Styling / Theming

- Use Tailwind utility classes consistent with your current theme (light / dark).  
- Use design tokens (if you have them) for colors, spacing, font sizes.  
- For animations, if using Framer Motion, keep animations subtle and quick (100-300ms) so they feel snappy.

### Component File Structure (suggested)

src/
└── components/
└── ui/
├── XPBar.tsx
├── XpToast.tsx
├── LevelUpDialog.tsx
└── ProgressPanel.tsx (optional)

### Acceptance Criteria

- ✅ `XPBar` visually reflects current XP and max XP, animates on update.  
- ✅ The toast shows when XP is granted, with correct XP number.  
- ✅ Level-up dialog appears correctly when level increases.  
- ✅ UI components are keyboard-navigable and accessible.  
- ✅ Styling consistent with the rest of the app.

### Commit Guidance

- `ui: add XPBar with shadcn Progress`  
- `ui: add XpToast component with shadcn Toast`  
- `ui: add LevelUpDialog using shadcn Dialog`  
- `ui: integrate XP UI into header and store logic`

---

## Phase 2: Gamification Backend Integration & Advanced Features

### Context
The gamification UI is now complete. This phase focuses on backend persistence, streak tracking, badges system, and enhanced gamification features to make the system fully functional and engaging.

### Backend Integration

1. **Database Schema for Gamification**
   - Create migration for `user_progress` table:
     - `id` (TEXT PRIMARY KEY)
     - `total_xp` (INTEGER DEFAULT 0)
     - `current_level` (INTEGER DEFAULT 1)
     - `current_streak` (INTEGER DEFAULT 0)
     - `longest_streak` (INTEGER DEFAULT 0)
     - `last_completion_date` (INTEGER, timestamp)
     - `created_at` (INTEGER)
     - `updated_at` (INTEGER)
   - Create migration for `badges` table:
     - `id` (TEXT PRIMARY KEY)
     - `user_id` (TEXT, references user_progress)
     - `badge_type` (TEXT) - e.g., "first_task", "week_warrior", "month_master"
     - `earned_at` (INTEGER, timestamp)
     - `metadata` (TEXT, JSON for additional badge data)
   - Create migration for `xp_history` table (optional, for analytics):
     - `id` (TEXT PRIMARY KEY)
     - `user_id` (TEXT)
     - `xp_amount` (INTEGER)
     - `source` (TEXT) - e.g., "task_completion", "streak_bonus"
     - `task_id` (TEXT, nullable)
     - `created_at` (INTEGER)

2. **Rust Backend Commands**
   - `get_user_progress()` → Returns UserProgress struct with all gamification data
   - `grant_xp(xp: i32, source: String, task_id: Option<String>)` → Grants XP and returns updated progress + level-up status
   - `update_streak()` → Calculates and updates daily completion streak
   - `get_badges()` → Returns list of earned badges
   - `check_and_award_badges()` → Checks milestone conditions and awards badges
   - `get_xp_history(days: Option<i32>)` → Returns XP history for analytics

3. **TypeScript Adapter Updates**
   - Add `UserProgress` interface matching Rust struct
   - Add `Badge` interface
   - Add `XpHistoryEntry` interface
   - Update `tauriAdapter.ts` with new command wrappers
   - Handle level-up detection from backend response

### Streaks System

1. **Streak Calculation Logic**
   - Track last completion date in user progress
   - On task completion, check if completed today
   - If yes and last completion was yesterday → increment streak
   - If yes and last completion was today → no change
   - If yes and last completion was >1 day ago → reset streak to 1
   - Update longest streak if current streak exceeds it

2. **Streak Rewards**
   - Daily completion bonus: +5 XP for maintaining streak
   - Weekly milestone (7 days): +50 XP bonus
   - Monthly milestone (30 days): +200 XP bonus
   - Show streak notifications in toast

3. **Streak UI Components**
   - Update `ProgressPanel` to show current streak with fire icon
   - Add streak indicator to XPBar (optional)
   - Create `StreakToast` component for streak milestones

### Badges System

1. **Badge Types & Criteria**
   - **First Steps**: Complete first task
   - **Task Master**: Complete 10 tasks
   - **Productivity Pro**: Complete 50 tasks
   - **Week Warrior**: Maintain 7-day streak
   - **Month Master**: Maintain 30-day streak
   - **Speed Demon**: Complete 5 tasks in one day
   - **High Priority Hero**: Complete 10 high-priority tasks
   - **Level Up**: Reach level 5, 10, 20, etc.
   - **XP Collector**: Earn 1000, 5000, 10000 total XP

2. **Badge UI Components**
   - Create `BadgeCard` component showing badge icon, name, description, earned date
   - Create `BadgesModal` component listing all badges (earned and locked)
   - Update `ProgressPanel` to show recent badges
   - Add badge notification toast when badge is earned
   - Use lucide-react icons for different badge types

3. **Badge Persistence**
   - Store badges in database
   - Check badge eligibility on XP grant, task completion, streak updates
   - Prevent duplicate badge awards

### Enhanced XP System

1. **XP Multipliers & Bonuses**
   - Streak bonus: +5 XP per day of streak (capped at +50 XP)
   - Completion speed bonus: Complete task before due date → +10% XP
   - Perfect week bonus: Complete all tasks in a week → +100 XP
   - Project completion bonus: Complete all tasks in a project → +50 XP

2. **XP History & Analytics**
   - Store XP transactions in `xp_history` table
   - Create `XpHistoryChart` component using recharts
   - Show XP trends over time (daily, weekly, monthly)
   - Display in Statistics page or new Gamification page

### Integration Points

- Update `useXp` store to sync with backend on mount
- Replace localStorage persistence with backend persistence
- Update `toggleComplete` in `useTasks` to call backend `grant_xp` command
- Add streak calculation to task completion flow
- Add badge checking after XP grants and streak updates
- Create new "Gamification" or "Achievements" page in Settings or as separate page

### Component File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── BadgeCard.tsx          # Individual badge display
│   │   ├── BadgesModal.tsx        # Badges collection modal
│   │   ├── StreakToast.tsx        # Streak milestone notifications
│   │   └── XpHistoryChart.tsx    # XP history visualization
│   └── ...
├── pages/
│   ├── Gamification.tsx           # New gamification stats page (optional)
│   └── ...
├── store/
│   └── useXp.ts                   # Updated with backend sync
└── api/
    └── tauriAdapter.ts             # Updated with gamification commands
```

### Backend File Structure

```
src-tauri/
├── src/
│   ├── commands.rs                # Add gamification commands
│   ├── services/
│   │   └── gamification_service.rs # Gamification business logic
│   └── ...
└── migrations/
    └── 0007_add_gamification.sql   # New migration
```

### Acceptance Criteria

- ✅ User progress persisted to database
- ✅ XP grants sync with backend and return level-up status
- ✅ Streak calculation works correctly (daily, weekly, monthly)
- ✅ Streak bonuses applied automatically
- ✅ Badges awarded when criteria met
- ✅ Badge UI shows earned and locked badges
- ✅ XP history stored and can be queried
- ✅ All gamification data survives app restarts
- ✅ Backend commands are type-safe and error-handled

### Commit Guidance

- `feat: add gamification database schema and migrations`
- `feat: implement Rust backend commands for XP and streaks`
- `feat: add badge system with database persistence`
- `feat: implement streak calculation and rewards`
- `feat: add badge UI components and modal`
- `feat: integrate backend gamification with frontend store`
- `feat: add XP history tracking and analytics`

---

If anything is ambiguous, pick a reasonable default and include comments / TODOs in the code for later review.
