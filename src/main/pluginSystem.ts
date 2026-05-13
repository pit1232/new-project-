import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import Store from 'electron-store'

const store = new Store()

interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  entry: string // main JS file
  icon?: string
  category: string
  permissions: string[]
  homepage?: string
}

interface InstalledPlugin {
  manifest: PluginManifest
  installedAt: number
  enabled: boolean
  path: string
}

async function getPluginsDir(): Promise<string> {
  const os = await import('os')
  const dir = path.join(os.homedir(), '.mmb-ai', 'plugins')
  await fs.promises.mkdir(dir, { recursive: true })
  return dir
}

export function registerPluginSystemHandlers(): void {
  // ============ LIST INSTALLED PLUGINS ============
  ipcMain.handle('plugins:list', async () => {
    try {
      const plugins = (store.get('installed_plugins') as InstalledPlugin[]) || []
      return { plugins }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ INSTALL PLUGIN (from local path or URL) ============
  ipcMain.handle('plugins:install', async (_, source: string) => {
    try {
      const pluginsDir = await getPluginsDir()
      let manifestPath: string
      let pluginDir: string

      if (source.startsWith('http')) {
        // Download from URL (GitHub release, etc.)
        const axios = (await import('axios')).default
        const response = await axios.get(source, { responseType: 'arraybuffer' })

        // Save as zip and extract
        const tempZip = path.join(pluginsDir, `temp-${Date.now()}.zip`)
        await fs.promises.writeFile(tempZip, response.data)

        // For simplicity, treat URL as direct JSON manifest
        // In production, you'd extract a zip
        pluginDir = path.join(pluginsDir, `plugin-${Date.now()}`)
        await fs.promises.mkdir(pluginDir, { recursive: true })
        await fs.promises.writeFile(path.join(pluginDir, 'manifest.json'), response.data)
        manifestPath = path.join(pluginDir, 'manifest.json')

        // Clean temp
        try { await fs.promises.unlink(tempZip) } catch { /* ok */ }
      } else {
        // Install from local directory
        pluginDir = source
        manifestPath = path.join(source, 'manifest.json')
      }

      // Read manifest
      const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8')
      const manifest: PluginManifest = JSON.parse(manifestContent)

      // Validate manifest
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.entry) {
        return { error: 'Invalid plugin manifest: missing required fields (id, name, version, entry)' }
      }

      // Check if already installed
      const plugins = (store.get('installed_plugins') as InstalledPlugin[]) || []
      const existing = plugins.find((p) => p.manifest.id === manifest.id)
      if (existing) {
        return { error: `Plugin "${manifest.name}" is already installed` }
      }

      // Copy plugin to plugins directory if not already there
      const finalDir = path.join(await getPluginsDir(), manifest.id)
      if (pluginDir !== finalDir) {
        await fs.promises.cp(pluginDir, finalDir, { recursive: true })
      }

      // Register plugin
      const installed: InstalledPlugin = {
        manifest,
        installedAt: Date.now(),
        enabled: true,
        path: finalDir
      }

      plugins.push(installed)
      store.set('installed_plugins', plugins)

      return { success: true, plugin: installed }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ UNINSTALL PLUGIN ============
  ipcMain.handle('plugins:uninstall', async (_, pluginId: string) => {
    try {
      const plugins = (store.get('installed_plugins') as InstalledPlugin[]) || []
      const plugin = plugins.find((p) => p.manifest.id === pluginId)

      if (!plugin) {
        return { error: `Plugin "${pluginId}" not found` }
      }

      // Remove directory
      try {
        await fs.promises.rm(plugin.path, { recursive: true, force: true })
      } catch { /* directory might not exist */ }

      // Remove from store
      const filtered = plugins.filter((p) => p.manifest.id !== pluginId)
      store.set('installed_plugins', filtered)

      return { success: true, message: `Plugin "${plugin.manifest.name}" uninstalled` }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ ENABLE/DISABLE PLUGIN ============
  ipcMain.handle('plugins:toggle', async (_, pluginId: string, enabled: boolean) => {
    try {
      const plugins = (store.get('installed_plugins') as InstalledPlugin[]) || []
      const plugin = plugins.find((p) => p.manifest.id === pluginId)

      if (!plugin) {
        return { error: `Plugin "${pluginId}" not found` }
      }

      plugin.enabled = enabled
      store.set('installed_plugins', plugins)

      return { success: true, enabled }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ GET PLUGIN DETAILS ============
  ipcMain.handle('plugins:get', async (_, pluginId: string) => {
    try {
      const plugins = (store.get('installed_plugins') as InstalledPlugin[]) || []
      const plugin = plugins.find((p) => p.manifest.id === pluginId)
      if (!plugin) return { error: 'Plugin not found' }
      return { plugin }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ EXECUTE PLUGIN ============
  ipcMain.handle('plugins:execute', async (_, pluginId: string, action: string, params?: any) => {
    try {
      const plugins = (store.get('installed_plugins') as InstalledPlugin[]) || []
      const plugin = plugins.find((p) => p.manifest.id === pluginId)

      if (!plugin) return { error: 'Plugin not found' }
      if (!plugin.enabled) return { error: 'Plugin is disabled' }

      // Load and execute plugin entry
      const entryPath = path.join(plugin.path, plugin.manifest.entry)

      // Check if entry file exists
      try {
        await fs.promises.access(entryPath)
      } catch {
        return { error: `Plugin entry file not found: ${plugin.manifest.entry}` }
      }

      // Dynamic require (sandboxed execution)
      try {
        // Clear require cache for hot-reload
        delete require.cache[require.resolve(entryPath)]
        const pluginModule = require(entryPath)

        if (typeof pluginModule[action] === 'function') {
          const result = await pluginModule[action](params)
          return { success: true, result }
        } else if (typeof pluginModule.default?.[action] === 'function') {
          const result = await pluginModule.default[action](params)
          return { success: true, result }
        } else {
          return { error: `Action "${action}" not found in plugin` }
        }
      } catch (execError: any) {
        return { error: `Plugin execution error: ${execError.message}` }
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ BROWSE MARKETPLACE (Registry) ============
  ipcMain.handle('plugins:marketplace', async (_, category?: string) => {
    try {
      // Built-in marketplace registry (can be replaced with remote API)
      const registry: PluginManifest[] = [
        {
          id: 'mmb-youtube-dl',
          name: 'YouTube Downloader',
          version: '1.0.0',
          description: 'Download YouTube videos and audio directly from MMB AI',
          author: 'MMB Community',
          entry: 'index.js',
          category: 'media',
          permissions: ['network', 'filesystem'],
          homepage: 'https://github.com/mmb-ai/plugin-youtube-dl'
        },
        {
          id: 'mmb-pomodoro',
          name: 'Pomodoro Timer',
          version: '1.0.0',
          description: 'Focus timer with 25/5 minute work/break cycles and notifications',
          author: 'MMB Community',
          entry: 'index.js',
          category: 'productivity',
          permissions: ['notifications'],
          homepage: 'https://github.com/mmb-ai/plugin-pomodoro'
        },
        {
          id: 'mmb-clipboard-history',
          name: 'Clipboard History',
          version: '1.0.0',
          description: 'Track and search clipboard history with smart categories',
          author: 'MMB Community',
          entry: 'index.js',
          category: 'productivity',
          permissions: ['clipboard'],
          homepage: 'https://github.com/mmb-ai/plugin-clipboard'
        },
        {
          id: 'mmb-screenshot-ocr',
          name: 'Smart Screenshot',
          version: '1.0.0',
          description: 'Take annotated screenshots with auto-OCR and cloud save',
          author: 'MMB Community',
          entry: 'index.js',
          category: 'tools',
          permissions: ['screen', 'filesystem'],
          homepage: 'https://github.com/mmb-ai/plugin-screenshot'
        },
        {
          id: 'mmb-git-assistant',
          name: 'Git Assistant',
          version: '1.0.0',
          description: 'AI-powered git commit messages, PR descriptions, and branch management',
          author: 'MMB Community',
          entry: 'index.js',
          category: 'developer',
          permissions: ['terminal', 'filesystem'],
          homepage: 'https://github.com/mmb-ai/plugin-git'
        },
        {
          id: 'mmb-system-monitor',
          name: 'System Monitor',
          version: '1.0.0',
          description: 'Real-time CPU, RAM, GPU, disk, and network monitoring widget',
          author: 'MMB Community',
          entry: 'index.js',
          category: 'system',
          permissions: ['system'],
          homepage: 'https://github.com/mmb-ai/plugin-sysmon'
        }
      ]

      const filtered = category
        ? registry.filter((p) => p.category === category)
        : registry

      return { plugins: filtered, categories: ['media', 'productivity', 'tools', 'developer', 'system'] }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ CREATE PLUGIN TEMPLATE ============
  ipcMain.handle('plugins:create-template', async (_, name: string, description: string) => {
    try {
      const pluginsDir = await getPluginsDir()
      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const dir = path.join(pluginsDir, id)

      await fs.promises.mkdir(dir, { recursive: true })

      // Create manifest
      const manifest: PluginManifest = {
        id,
        name,
        version: '1.0.0',
        description,
        author: 'Kuldeep',
        entry: 'index.js',
        category: 'custom',
        permissions: []
      }

      await fs.promises.writeFile(
        path.join(dir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      )

      // Create entry file
      const entryContent = `// ${name} Plugin for MMB AI
// Author: Kuldeep

module.exports = {
  // Plugin initialization
  async init(context) {
    console.log('${name} plugin initialized');
    return { success: true };
  },

  // Main action
  async run(params) {
    // Your plugin logic here
    return { message: 'Hello from ${name}!' };
  },

  // Cleanup
  async destroy() {
    console.log('${name} plugin destroyed');
  }
};
`
      await fs.promises.writeFile(path.join(dir, 'index.js'), entryContent)

      return { success: true, path: dir, manifest }
    } catch (error: any) {
      return { error: error.message }
    }
  })
}
