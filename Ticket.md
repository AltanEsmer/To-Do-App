## Cursor Task — Add multi-type attachments (images, PDF, text) to Task Details using shadcn/ui

### Context
Existing app: React + TypeScript frontend using shadcn/ui + Tailwind; Tauri (Rust) backend using SQLite. Currently attachments support images only. Implement attachments support for **images, PDFs, and plain text files (.txt, .md)**. Use shadcn/ui components for UI and Tauri commands for file copying and DB updates.

### Goals (strict)
1. Add frontend UI to Task Details to allow selecting files (images, pdf, text).
2. Accept via file input and via optional drag-and-drop (drag-and-drop is optional; file input mandatory).
3. On selection, call a Tauri command `add_attachment(taskId, filePath)` that copies the file into the app attachments directory and creates a DB record with metadata (filename, stored_path, mime, size, created_at).
4. Update UI to show attachment cards with:
   - Thumbnail for images,
   - PDF icon + "View" button for PDFs (opens Dialog with embedded preview or opens external viewer),
   - Text snippet preview for text files (first 300 characters) and a "View" button to open the full text in Dialog.
5. Provide actions per attachment: Open (embedded or external), Download/Save As (save dialog), Delete (confirmation toast).
6. Use shadcn/ui components: `Input` (type=file), `Button`, `Dialog`, `Card`/`List`, `Badge`, and `Toast`.
7. Back-end: add or reuse `add_attachment` Tauri command. Ensure it:
   - Validates MIME and file extension,
   - Copies file to attachments folder inside app data dir (preserve original extension),
   - Records metadata in `attachments` table with columns: id (uuid), task_id, filename, stored_path, mime, size, created_at.
   - Returns attachment metadata to frontend.
8. Ensure attachments are downloadable and openable cross-platform via Tauri APIs.
9. Add small unit/integration tests:
   - Rust test for `add_attachment` copying file and inserting DB row.
   - TS test for the file input parsing / frontend call (mocked `invoke`).

### Allowed file types (accept & validate)
- Images: `image/*`  (png, jpg, jpeg, gif, webp)
- PDF: `application/pdf` (`.pdf`)
- Text: `text/plain`, markdown `.md` (mime `text/markdown` or fallback to `text/plain`)

Frontend `accept` attribute example:
`accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,application/pdf,text/plain,text/markdown"`

### Files to modify / add
- `src/components/TaskDetailsModal.tsx` — add attachment UI, file picker, card list, preview dialog, delete action.
- `src/components/ui/AttachmentCard.tsx` — new reusable attachment card UI built with shadcn primitives.
- `src/api/tauriAdapter.ts` — add `addAttachment(taskId: string, path: string)`, `deleteAttachment(id: string)`, `downloadAttachment(id: string)` adapters that call `invoke`.
- `src-tauri/src/attachments.rs` (or update `attachments.rs`) — implement `add_attachment`, `delete_attachment`, `get_attachment`, `stream_attachment` commands.
- `src-tauri/migrations/XXX_add_attachment_fields.sql` (if attachments schema missing mime/filename/size/stored_path) — ensure attachments table has required fields.
- `src-tauri/src/db.rs` — helper DB functions for attachments.
- Tests: `src-tauri/tests/attachments.rs` and `src/__tests__/AttachmentInput.test.tsx`.

### UX details & accessibility
- File input button text: “Attach file (image, PDF, text)”.
- Use `aria-label` for file input and preview dialog.
- Modal preview must trap focus.
- For large text files (>50KB) show a warning before loading whole text in-memory; we can load streaming or just show first NKB and a "Load full file" button.
- If `invoke` fails (browser mode / offline), show a helpful toast and fallback to "simulate" local attachment in frontend store (documented).

### Backend spec (Tauri / Rust) — `add_attachment` command
Signature:
```rust
#[tauri::command]
pub fn add_attachment(task_id: Option<String>, source_path: String) -> Result<Attachment, String>
