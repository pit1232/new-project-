import { ipcMain } from 'electron'
import Store from 'electron-store'

const store = new Store()

// Agent definitions with specialized system prompts and capabilities
interface AgentDefinition {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  color: string
}

const BUILTIN_AGENTS: AgentDefinition[] = [
  {
    id: 'researcher',
    name: 'Research Agent',
    role: 'Web research, data collection, fact-checking',
    systemPrompt:
      'You are a research specialist. Your job is to find accurate, up-to-date information from the web. Summarize findings clearly with sources. Focus on facts, data, and evidence.',
    tools: ['web:search', 'web:scrape', 'research:deep'],
    color: '#06b6d4'
  },
  {
    id: 'coder',
    name: 'Code Agent',
    role: 'Writing code, debugging, architecture',
    systemPrompt:
      'You are an expert software engineer. Write clean, efficient, well-documented code. Follow best practices. Explain your design decisions. Support TypeScript, Python, and JavaScript primarily.',
    tools: ['terminal:execute', 'fs:write-file', 'fs:read-file', 'dev:build-file'],
    color: '#10b981'
  },
  {
    id: 'writer',
    name: 'Writer Agent',
    role: 'Content creation, editing, summarization',
    systemPrompt:
      'You are a professional content writer. Create engaging, clear, and well-structured content. Adapt your tone based on the context — technical docs, blog posts, emails, social media. Always proofread for grammar and clarity.',
    tools: ['fs:write-file'],
    color: '#8b5cf6'
  },
  {
    id: 'analyst',
    name: 'Analyst Agent',
    role: 'Data analysis, pattern recognition, insights',
    systemPrompt:
      'You are a data analyst. Analyze information, find patterns, extract insights, and present findings in a clear structured format. Use numbers and evidence to back your conclusions.',
    tools: ['fs:read-file', 'web:search'],
    color: '#f59e0b'
  },
  {
    id: 'planner',
    name: 'Planner Agent',
    role: 'Task breakdown, project planning, scheduling',
    systemPrompt:
      'You are a project planner and task manager. Break down complex goals into actionable steps. Create timelines, identify dependencies, and suggest optimal ordering. Be specific and practical.',
    tools: ['vector:save-memory'],
    color: '#ef4444'
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    role: 'Decides which agents to use and coordinates their work',
    systemPrompt:
      'You are the orchestrator agent. Given a user\'s request, decide which specialist agents should handle it. Break the task into subtasks and assign each to the most appropriate agent. Coordinate the results into a final cohesive response. Available agents: researcher (web research), coder (programming), writer (content), analyst (data analysis), planner (task planning).',
    tools: [],
    color: '#ec4899'
  }
]

export function registerMultiAgentHandlers(): void {
  // ============ LIST AVAILABLE AGENTS ============
  ipcMain.handle('agents:list', async () => {
    const customAgents = (store.get('custom_agents') as AgentDefinition[]) || []
    return { agents: [...BUILTIN_AGENTS, ...customAgents] }
  })

  // ============ CREATE CUSTOM AGENT ============
  ipcMain.handle(
    'agents:create',
    async (
      _,
      agent: { name: string; role: string; systemPrompt: string; tools: string[]; color: string }
    ) => {
      try {
        const customAgents = (store.get('custom_agents') as AgentDefinition[]) || []
        const newAgent: AgentDefinition = {
          id: `custom-${Date.now()}`,
          ...agent
        }
        customAgents.push(newAgent)
        store.set('custom_agents', customAgents)
        return { success: true, agent: newAgent }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ DELETE CUSTOM AGENT ============
  ipcMain.handle('agents:delete', async (_, agentId: string) => {
    try {
      const customAgents = (store.get('custom_agents') as AgentDefinition[]) || []
      const filtered = customAgents.filter((a) => a.id !== agentId)
      store.set('custom_agents', filtered)
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ RUN SINGLE AGENT ============
  ipcMain.handle(
    'agents:run',
    async (
      _,
      agentId: string,
      message: string,
      apiKey: string,
      provider: string,
      model?: string
    ) => {
      try {
        const customAgents = (store.get('custom_agents') as AgentDefinition[]) || []
        const allAgents = [...BUILTIN_AGENTS, ...customAgents]
        const agent = allAgents.find((a) => a.id === agentId)

        if (!agent) return { error: `Agent "${agentId}" not found` }

        // Call AI with agent's system prompt
        if (provider === 'gemini') {
          const { GoogleGenAI } = await import('@google/genai')
          const ai = new GoogleGenAI({ apiKey })
          const response = await ai.models.generateContent({
            model: model || 'gemini-2.0-flash',
            contents: [
              { role: 'user', parts: [{ text: agent.systemPrompt }] },
              { role: 'model', parts: [{ text: 'Understood. I am ready to assist as ' + agent.name + '.' }] },
              { role: 'user', parts: [{ text: message }] }
            ]
          })
          return {
            agentId: agent.id,
            agentName: agent.name,
            content: response.text || '',
            provider: 'gemini'
          }
        } else if (provider === 'groq') {
          const Groq = (await import('groq-sdk')).default
          const groq = new Groq({ apiKey })
          const response = await groq.chat.completions.create({
            model: model || 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: agent.systemPrompt },
              { role: 'user', content: message }
            ]
          })
          return {
            agentId: agent.id,
            agentName: agent.name,
            content: response.choices[0]?.message?.content || '',
            provider: 'groq'
          }
        }

        return { error: 'Unknown provider' }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ ORCHESTRATE (Multi-Agent Pipeline) ============
  ipcMain.handle(
    'agents:orchestrate',
    async (_, message: string, apiKey: string, provider: string, model?: string) => {
      try {
        // Step 1: Ask orchestrator to plan
        const orchestrator = BUILTIN_AGENTS.find((a) => a.id === 'orchestrator')!

        let planText = ''

        if (provider === 'gemini') {
          const { GoogleGenAI } = await import('@google/genai')
          const ai = new GoogleGenAI({ apiKey })
          const planResponse = await ai.models.generateContent({
            model: model || 'gemini-2.0-flash',
            contents: [
              { role: 'user', parts: [{ text: orchestrator.systemPrompt }] },
              {
                role: 'model',
                parts: [
                  {
                    text: 'I am the orchestrator. I will analyze the request and assign it to the appropriate agents. I will respond with a JSON plan.'
                  }
                ]
              },
              {
                role: 'user',
                parts: [
                  {
                    text: `User request: "${message}"\n\nRespond with a JSON array of subtasks. Each subtask should have: {"agent": "agent_id", "task": "description of what this agent should do"}. Available agent IDs: researcher, coder, writer, analyst, planner. Respond ONLY with the JSON array, nothing else.`
                  }
                ]
              }
            ]
          })
          planText = planResponse.text || '[]'
        } else if (provider === 'groq') {
          const Groq = (await import('groq-sdk')).default
          const groq = new Groq({ apiKey })
          const planResponse = await groq.chat.completions.create({
            model: model || 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: orchestrator.systemPrompt },
              {
                role: 'user',
                content: `User request: "${message}"\n\nRespond with a JSON array of subtasks. Each subtask should have: {"agent": "agent_id", "task": "description of what this agent should do"}. Available agent IDs: researcher, coder, writer, analyst, planner. Respond ONLY with the JSON array, nothing else.`
              }
            ]
          })
          planText = planResponse.choices[0]?.message?.content || '[]'
        }

        // Step 2: Parse the plan
        let plan: Array<{ agent: string; task: string }> = []
        try {
          // Extract JSON from response (might have markdown backticks)
          const jsonMatch = planText.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            plan = JSON.parse(jsonMatch[0])
          }
        } catch {
          // Fallback: use single agent
          plan = [{ agent: 'coder', task: message }]
        }

        // Step 3: Execute each agent in parallel
        const results: Array<{ agentId: string; agentName: string; task: string; response: string }> =
          []

        for (const step of plan.slice(0, 5)) {
          const agent = BUILTIN_AGENTS.find((a) => a.id === step.agent)
          if (!agent) continue

          let response = ''

          if (provider === 'gemini') {
            const { GoogleGenAI } = await import('@google/genai')
            const ai = new GoogleGenAI({ apiKey })
            const result = await ai.models.generateContent({
              model: model || 'gemini-2.0-flash',
              contents: [
                { role: 'user', parts: [{ text: agent.systemPrompt }] },
                {
                  role: 'model',
                  parts: [{ text: `I am ${agent.name}. I will help with: ${agent.role}` }]
                },
                { role: 'user', parts: [{ text: step.task }] }
              ]
            })
            response = result.text || ''
          } else if (provider === 'groq') {
            const Groq = (await import('groq-sdk')).default
            const groq = new Groq({ apiKey })
            const result = await groq.chat.completions.create({
              model: model || 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: agent.systemPrompt },
                { role: 'user', content: step.task }
              ]
            })
            response = result.choices[0]?.message?.content || ''
          }

          results.push({
            agentId: agent.id,
            agentName: agent.name,
            task: step.task,
            response
          })
        }

        // Step 4: Synthesize final response
        let synthesis = ''
        const combinedResults = results
          .map((r) => `## ${r.agentName}\n**Task:** ${r.task}\n**Response:**\n${r.response}`)
          .join('\n\n---\n\n')

        if (provider === 'gemini') {
          const { GoogleGenAI } = await import('@google/genai')
          const ai = new GoogleGenAI({ apiKey })
          const synthResult = await ai.models.generateContent({
            model: model || 'gemini-2.0-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `You are synthesizing results from multiple AI agents. Combine the following agent outputs into one cohesive, well-structured final answer for the user. Remove redundancy, organize logically, and present a unified response.\n\nOriginal user request: "${message}"\n\nAgent outputs:\n${combinedResults}`
                  }
                ]
              }
            ]
          })
          synthesis = synthResult.text || combinedResults
        } else {
          synthesis = combinedResults
        }

        return {
          plan,
          results,
          synthesis,
          agentsUsed: results.map((r) => r.agentName)
        }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ GET AGENT EXECUTION HISTORY ============
  ipcMain.handle('agents:history', async () => {
    const history = (store.get('agent_history') as any[]) || []
    return { history: history.slice(-50) }
  })
}
