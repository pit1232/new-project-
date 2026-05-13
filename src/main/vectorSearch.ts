import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// LanceDB vector storage for semantic search
let db: any = null
let table: any = null

async function getDB() {
  if (!db) {
    const lancedb = await import('vectordb')
    const os = await import('os')
    const dbPath = path.join(os.homedir(), '.mmb-ai', 'vectordb')
    await fs.promises.mkdir(dbPath, { recursive: true })
    db = await lancedb.connect(dbPath)
  }
  return db
}

// Simple text embedding using TF-IDF style (for local use without API)
function simpleEmbed(text: string, dimensions: number = 384): number[] {
  const vector = new Array(dimensions).fill(0)
  const words = text.toLowerCase().split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    for (let j = 0; j < word.length; j++) {
      const idx = (word.charCodeAt(j) * (i + 1) * (j + 1)) % dimensions
      vector[idx] += 1 / (1 + Math.log(words.length))
    }
  }
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude
    }
  }
  return vector
}

// Read all text files from a directory recursively
async function readAllFiles(
  dirPath: string,
  extensions: string[] = ['.txt', '.md', '.ts', '.tsx', '.js', '.jsx', '.json', '.py', '.java', '.c', '.cpp', '.h', '.css', '.html']
): Promise<Array<{ path: string; content: string; name: string }>> {
  const results: Array<{ path: string; content: string; name: string }> = []

  async function walk(dir: string) {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          // Skip common ignored directories
          if (
            !['node_modules', '.git', 'dist', 'build', 'out', '.next', '__pycache__'].includes(
              entry.name
            )
          ) {
            await walk(fullPath)
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (extensions.includes(ext)) {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf-8')
              if (content.length > 0 && content.length < 100000) {
                results.push({ path: fullPath, content, name: entry.name })
              }
            } catch {
              // Skip unreadable files
            }
          }
        }
      }
    } catch {
      // Skip inaccessible dirs
    }
  }

  await walk(dirPath)
  return results
}

export function registerVectorSearchHandlers(): void {
  // ============ INDEX FOLDER (Semantic Ingestion) ============
  ipcMain.handle('vector:index-folder', async (_, folderPath: string) => {
    try {
      const database = await getDB()
      const files = await readAllFiles(folderPath)

      if (files.length === 0) {
        return { error: 'No indexable files found in directory' }
      }

      // Create embeddings for each file
      const records = files.map((file) => {
        // Chunk large files
        const chunk = file.content.substring(0, 2000)
        return {
          vector: simpleEmbed(chunk),
          text: chunk,
          filePath: file.path,
          fileName: file.name,
          folder: folderPath,
          indexedAt: Date.now()
        }
      })

      // Create or overwrite table
      const tableName = 'files_' + Buffer.from(folderPath).toString('base64').substring(0, 20)

      try {
        // Try to drop existing table
        await database.dropTable(tableName)
      } catch {
        // Table didn't exist, that's fine
      }

      table = await database.createTable(tableName, records)

      return {
        success: true,
        filesIndexed: files.length,
        tableName,
        message: `Indexed ${files.length} files from ${folderPath}`
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ SMART FILE SEARCH (Vector Search) ============
  ipcMain.handle('vector:search', async (_, query: string, folderPath?: string, limit?: number) => {
    try {
      const database = await getDB()

      // Find the right table
      let tableName: string
      if (folderPath) {
        tableName = 'files_' + Buffer.from(folderPath).toString('base64').substring(0, 20)
      } else {
        // Use last indexed table
        const tables = await database.tableNames()
        const fileTables = tables.filter((t: string) => t.startsWith('files_'))
        if (fileTables.length === 0) {
          return { error: 'No folders have been indexed yet. Use Index Folder first.' }
        }
        tableName = fileTables[fileTables.length - 1]
      }

      const searchTable = await database.openTable(tableName)
      const queryVector = simpleEmbed(query)

      const results = await searchTable.search(queryVector).limit(limit || 10).execute()

      return {
        results: results.map((r: any) => ({
          filePath: r.filePath,
          fileName: r.fileName,
          text: r.text?.substring(0, 500),
          score: r._distance
        }))
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ CORE MEMORY (Save/Retrieve Context) ============
  ipcMain.handle('vector:save-memory', async (_, content: string, metadata?: any) => {
    try {
      const database = await getDB()
      const tableName = 'core_memory'

      const record = {
        vector: simpleEmbed(content),
        text: content,
        metadata: JSON.stringify(metadata || {}),
        createdAt: Date.now()
      }

      try {
        const memTable = await database.openTable(tableName)
        await memTable.add([record])
      } catch {
        // Table doesn't exist, create it
        await database.createTable(tableName, [record])
      }

      return { success: true, message: 'Memory saved' }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ RETRIEVE MEMORY ============
  ipcMain.handle('vector:retrieve-memory', async (_, query: string, limit?: number) => {
    try {
      const database = await getDB()
      const tableName = 'core_memory'

      const memTable = await database.openTable(tableName)
      const queryVector = simpleEmbed(query)

      const results = await memTable.search(queryVector).limit(limit || 5).execute()

      return {
        memories: results.map((r: any) => ({
          text: r.text,
          metadata: r.metadata ? JSON.parse(r.metadata) : {},
          createdAt: r.createdAt,
          relevance: r._distance
        }))
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ INGEST CODEBASE (Deep Project Embedding) ============
  ipcMain.handle('vector:ingest-codebase', async (_, projectPath: string) => {
    try {
      const database = await getDB()
      const files = await readAllFiles(projectPath)

      if (files.length === 0) {
        return { error: 'No code files found' }
      }

      // Create chunked embeddings with more context
      const records: any[] = []
      for (const file of files) {
        // Split into chunks of ~500 chars with overlap
        const chunkSize = 500
        const overlap = 100
        for (let i = 0; i < file.content.length; i += chunkSize - overlap) {
          const chunk = file.content.substring(i, i + chunkSize)
          if (chunk.trim().length > 20) {
            records.push({
              vector: simpleEmbed(chunk),
              text: chunk,
              filePath: file.path,
              fileName: file.name,
              chunkIndex: Math.floor(i / (chunkSize - overlap)),
              projectPath,
              indexedAt: Date.now()
            })
          }
        }
      }

      const tableName = 'codebase_' + Buffer.from(projectPath).toString('base64').substring(0, 20)

      try {
        await database.dropTable(tableName)
      } catch { /* ok */ }

      await database.createTable(tableName, records)

      return {
        success: true,
        filesProcessed: files.length,
        chunksCreated: records.length,
        message: `Ingested ${files.length} files (${records.length} chunks) from ${projectPath}`
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ CONSULT ORACLE (Codebase RAG Query) ============
  ipcMain.handle('vector:oracle', async (_, query: string, projectPath?: string, limit?: number) => {
    try {
      const database = await getDB()
      const tables = await database.tableNames()
      const codebaseTables = tables.filter((t: string) => t.startsWith('codebase_'))

      if (codebaseTables.length === 0) {
        return { error: 'No codebase has been ingested. Use Ingest Codebase first.' }
      }

      let tableName: string
      if (projectPath) {
        tableName = 'codebase_' + Buffer.from(projectPath).toString('base64').substring(0, 20)
      } else {
        tableName = codebaseTables[codebaseTables.length - 1]
      }

      const codeTable = await database.openTable(tableName)
      const queryVector = simpleEmbed(query)
      const results = await codeTable.search(queryVector).limit(limit || 10).execute()

      return {
        results: results.map((r: any) => ({
          filePath: r.filePath,
          fileName: r.fileName,
          code: r.text,
          chunkIndex: r.chunkIndex,
          relevance: r._distance
        }))
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ LIST INDEXED TABLES ============
  ipcMain.handle('vector:list-indexes', async () => {
    try {
      const database = await getDB()
      const tables = await database.tableNames()
      return { tables }
    } catch (error: any) {
      return { error: error.message }
    }
  })
}
