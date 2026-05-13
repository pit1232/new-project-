import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ChatPage from './pages/ChatPage'
import SystemControlPage from './pages/SystemControlPage'
import AutomationPage from './pages/AutomationPage'
import DevToolsPage from './pages/DevToolsPage'
import WebResearchPage from './pages/WebResearchPage'
import MemoryPage from './pages/MemoryPage'
import MemoryGraphPage from './pages/MemoryGraphPage'
import SecurityPage from './pages/SecurityPage'
import SettingsPage from './pages/SettingsPage'

function App(): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ChatPage />} />
          <Route path="system" element={<SystemControlPage />} />
          <Route path="automation" element={<AutomationPage />} />
          <Route path="devtools" element={<DevToolsPage />} />
          <Route path="research" element={<WebResearchPage />} />
          <Route path="memory" element={<MemoryPage />} />
          <Route path="memory-graph" element={<MemoryGraphPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
