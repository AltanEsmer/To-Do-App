import { useState, useEffect } from 'react'
import * as tauriAdapter from '../api/tauriAdapter'
import { isTauri } from '../utils/tauri'
import { TemplatesModal } from '../components/TemplatesModal'

export function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [statisticsVisible, setStatisticsVisible] = useState(true)
  const [backupFrequency, setBackupFrequency] = useState('manual')
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState<number | null>(null)
  const [defaultNotificationRepeat, setDefaultNotificationRepeat] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const handleOpenTemplates = () => setIsTemplatesOpen(true)
    window.addEventListener('open-templates-modal', handleOpenTemplates)
    return () => window.removeEventListener('open-templates-modal', handleOpenTemplates)
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await tauriAdapter.getSettings()
      setNotificationsEnabled(settings.notifications_enabled === 'true')
      setAutostartEnabled(settings.autostart_enabled === 'true')
      setStatisticsVisible(settings.statistics_visible !== 'false') // Default to true if not set
      setBackupFrequency(settings.backup_frequency || 'manual')
      const defaultReminder = settings.default_reminder_minutes
      setDefaultReminderMinutes(defaultReminder ? parseInt(defaultReminder) : null)
      setDefaultNotificationRepeat(settings.default_notification_repeat === 'true')
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleNotificationsToggle = async (enabled: boolean) => {
    try {
      await tauriAdapter.updateSettings('notifications_enabled', enabled.toString())
      setNotificationsEnabled(enabled)
      showMessage('success', 'Notifications setting saved')
    } catch (error) {
      showMessage('error', 'Failed to save notification setting')
    }
  }

  const handleAutostartToggle = async (enabled: boolean) => {
    if (!isTauri()) {
      showMessage('error', 'Auto-start is only available in Tauri desktop app.')
      return
    }
    try {
      // Use dedicated autostart command
      const { invoke } = await import('@tauri-apps/api/tauri')
      await invoke('set_autostart_enabled', { enabled })
      setAutostartEnabled(enabled)
      showMessage('success', 'Auto-start setting saved')
    } catch (error) {
      console.error('Failed to set autostart:', error)
      showMessage('error', 'Failed to save auto-start setting')
    }
  }

  const handleStatisticsVisibilityToggle = async (enabled: boolean) => {
    try {
      await tauriAdapter.updateSettings('statistics_visible', enabled.toString())
      setStatisticsVisible(enabled)
      showMessage('success', 'Statistics visibility setting saved')
      // Dispatch event to notify other components (e.g., Sidebar) of the change
      window.dispatchEvent(new CustomEvent('settings-changed'))
    } catch (error) {
      showMessage('error', 'Failed to save statistics visibility setting')
    }
  }

  useEffect(() => {
    const loadAutostartStatus = async () => {
      if (!isTauri()) return
      try {
        const { invoke } = await import('@tauri-apps/api/tauri')
        const enabled = await invoke<boolean>('get_autostart_enabled')
        setAutostartEnabled(enabled)
      } catch (error) {
        console.error('Failed to load autostart status:', error)
      }
    }
    loadAutostartStatus()
  }, [])

  const handleBackupFrequencyChange = async (frequency: string) => {
    try {
      await tauriAdapter.updateSettings('backup_frequency', frequency)
      setBackupFrequency(frequency)
      showMessage('success', 'Backup frequency saved')
    } catch (error) {
      showMessage('error', 'Failed to save backup frequency')
    }
  }

  const handleCreateBackup = async () => {
    if (!isTauri()) {
      showMessage('error', 'Backup is only available in Tauri desktop app.')
      return
    }
    setLoading(true)
    try {
      const backupPath = await tauriAdapter.createBackup()
      showMessage('success', `Backup created: ${backupPath}`)
    } catch (error) {
      showMessage('error', 'Failed to create backup')
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreBackup = async () => {
    if (!isTauri()) {
      showMessage('error', 'Backup restore is only available in Tauri desktop app.')
      return
    }
    try {
      const { open } = await import('@tauri-apps/api/dialog')
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Database', extensions: ['db'] }],
        title: 'Select backup file to restore',
      })

      if (selected && typeof selected === 'string') {
        if (confirm('This will replace your current data. Are you sure?')) {
          setLoading(true)
          try {
            await tauriAdapter.restoreBackup(selected)
            showMessage('success', 'Backup restored successfully. Please restart the app.')
          } catch (error) {
            showMessage('error', 'Failed to restore backup')
          } finally {
            setLoading(false)
          }
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error)
    }
  }

  const handleExport = async () => {
    if (!isTauri()) {
      showMessage('error', 'Export is only available in Tauri desktop app.')
      return
    }
    setLoading(true)
    try {
      const exportPath = await tauriAdapter.exportData()
      
      // Try to save to user-selected location
      const { save } = await import('@tauri-apps/api/dialog')
      const { readTextFile, writeTextFile } = await import('@tauri-apps/api/fs')
      const savedPath = await save({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: 'todo_export.json',
      })

      if (savedPath) {
        const content = await readTextFile(exportPath)
        await writeTextFile(savedPath, content)
        showMessage('success', 'Data exported successfully')
      } else {
        showMessage('success', `Data exported to: ${exportPath}`)
      }
    } catch (error) {
      showMessage('error', 'Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!isTauri()) {
      showMessage('error', 'Import is only available in Tauri desktop app.')
      return
    }
    try {
      const { open } = await import('@tauri-apps/api/dialog')
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
        title: 'Select JSON file to import',
      })

      if (selected && typeof selected === 'string') {
        if (confirm('This will merge or replace existing data. Are you sure? Continue?')) {
          setLoading(true)
          try {
            const summary = await tauriAdapter.importData(selected)
            showMessage(
              'success',
              `Import complete: ${summary.tasks_added} tasks added, ${summary.tasks_updated} updated, ${summary.projects_added} projects added`
            )
            // Reload app data
            window.location.reload()
          } catch (error) {
            showMessage('error', 'Failed to import data')
          } finally {
            setLoading(false)
          }
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your app preferences</p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg p-3 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Notifications */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Enable notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Receive notifications for due and overdue tasks
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => handleNotificationsToggle(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:bg-gray-700 dark:peer-focus:ring-primary-800"></div>
              </label>
            </div>

            {notificationsEnabled && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">Default Notification Preferences</p>
                <p className="text-xs text-muted-foreground">
                  These settings will be used as defaults when creating new tasks with due dates
                </p>
                <div>
                  <label htmlFor="default-reminder-time" className="mb-1 block text-xs text-muted-foreground">
                    Default reminder time
                  </label>
                  <select
                    id="default-reminder-time"
                    value={defaultReminderMinutes || ''}
                    onChange={async (e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null
                      setDefaultReminderMinutes(value)
                      try {
                        await tauriAdapter.updateSettings('default_reminder_minutes', value?.toString() || '')
                        showMessage('success', 'Default reminder time saved')
                      } catch (error) {
                        showMessage('error', 'Failed to save default reminder time')
                      }
                    }}
                    className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">No default reminder</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="120">2 hours before</option>
                    <option value="1440">1 day before</option>
                  </select>
                </div>
                {defaultReminderMinutes && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="default-notification-repeat"
                      checked={defaultNotificationRepeat}
                      onChange={async (e) => {
                        setDefaultNotificationRepeat(e.target.checked)
                        try {
                          await tauriAdapter.updateSettings('default_notification_repeat', e.target.checked.toString())
                          showMessage('success', 'Default repeat setting saved')
                        } catch (error) {
                          showMessage('error', 'Failed to save default repeat setting')
                        }
                      }}
                      className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
                    />
                    <label htmlFor="default-notification-repeat" className="text-xs text-muted-foreground">
                      Default to repeat reminders daily until completed
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Auto-start */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Auto-start</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Launch on system startup</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Automatically start the app when your computer boots
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={autostartEnabled}
                onChange={(e) => handleAutostartToggle(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:bg-gray-700 dark:peer-focus:ring-primary-800"></div>
            </label>
          </div>
        </div>

        {/* Statistics Visibility */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Navigation</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Show Statistics page</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Show or hide the Statistics page in the sidebar navigation
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={statisticsVisible}
                onChange={(e) => handleStatisticsVisibilityToggle(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:bg-gray-700 dark:peer-focus:ring-primary-800"></div>
            </label>
          </div>
        </div>

        {/* Backup Frequency */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Backup Frequency</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              How often to automatically create backups
            </p>
            <select
              value={backupFrequency}
              onChange={(e) => handleBackupFrequencyChange(e.target.value)}
              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="manual">Manual only</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>

        {/* Backup Management */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Backup Management</h3>
          <div className="space-y-3">
            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="focus-ring w-full rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Backup'}
            </button>
            <button
              onClick={handleRestoreBackup}
              disabled={loading}
              className="focus-ring w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {loading ? 'Restoring...' : 'Restore from Backup'}
            </button>
            <p className="text-xs text-muted-foreground">
              Backups are stored in your app data directory. On Windows: %APPDATA%\com.todoapp.dev\
            </p>
          </div>
        </div>

        {/* Import/Export */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Data Management</h3>
          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={loading}
              className="focus-ring w-full rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export Data (JSON)'}
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="focus-ring w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Data (JSON)'}
            </button>
            <p className="text-xs text-muted-foreground">
              Export your tasks, projects, and settings to a JSON file. Import will merge or replace existing data.
            </p>
          </div>
        </div>
      </div>

      <TemplatesModal open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen} />
    </div>
  )
}
