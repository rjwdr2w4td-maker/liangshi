import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import EntityList from '@/pages/entities/EntityList'
import EntityDetail from '@/pages/entities/EntityDetail'
import TaskList from '@/pages/tasks/TaskList'
import SowingProgress from '@/pages/progress/SowingProgress'
import HarvestProgress from '@/pages/progress/HarvestProgress'
import ProgressDetails from '@/pages/progress/ProgressDetails'
import Statistics from '@/pages/statistics/Statistics'
import DisasterManagement from '@/pages/disaster/DisasterManagement'
import OneMap from '@/pages/map/OneMap'
import DisasterMap from '@/pages/map/DisasterMap'
import PolicyList from '@/pages/policies/PolicyList'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/entities" element={<EntityList />} />
          <Route path="/entities/:id" element={<EntityDetail />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/sowing" element={<SowingProgress />} />
          <Route path="/harvest" element={<HarvestProgress />} />
          <Route path="/progress/details" element={<ProgressDetails />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/disaster" element={<DisasterManagement />} />
          <Route path="/map" element={<OneMap />} />
          <Route path="/map/disaster" element={<DisasterMap />} />
          <Route path="/policies" element={<PolicyList />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
