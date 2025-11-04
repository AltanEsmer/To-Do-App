/**
 * Settings page (placeholder for future settings)
 */
export function Settings() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your app preferences</p>
      </div>

      <div className="flex-1">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Appearance</h3>
          <p className="text-sm text-muted-foreground">
            Theme settings are available in the header. More settings coming in Phase 2.
          </p>
        </div>
      </div>
    </div>
  )
}

