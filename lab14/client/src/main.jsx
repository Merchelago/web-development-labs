import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';
import { AuthProvider, RequireAuth, useAuth } from './auth';
import { ToastProvider } from './components/ui';
import Login from './pages/Login';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import Objects from './admin/Objects';
import Cameras from './admin/Cameras';
import Incidents from './admin/Incidents';
import Employees from './admin/Employees';
import Reports from './admin/Reports';
import Statistics from './admin/Statistics';
import { AdminNotifications, AiRecognition, ExportData, Settings } from './admin/Tools';
import MobileLayout from './mobile/MobileLayout';
import MHome from './mobile/Home';
import MReport from './mobile/ReportViolation';
import MCameras, { ViolationInfo } from './mobile/MobileCameras';
import { MyTasks, TaskDetail } from './mobile/Tasks';
import MStats from './mobile/MyStats';
import MNotifications from './mobile/Notifications';
import { Training, TrainingItem } from './mobile/Training';
import PpeCheck from './mobile/PpeCheck';
import Profile from './mobile/Profile';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/m'} replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="objects" element={<Objects />} />
              <Route path="objects/:id" element={<Objects />} />
              <Route path="cameras" element={<Cameras />} />
              <Route path="camera-control" element={<Cameras manage />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="incidents/:id" element={<Incidents />} />
              <Route path="employees" element={<Employees />} />
              <Route path="reports" element={<Reports />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="ai" element={<AiRecognition />} />
              <Route path="export" element={<ExportData />} />
              <Route path="notifications" element={<AdminNotifications />} />
            </Route>
            <Route path="/m" element={<RequireAuth><MobileLayout /></RequireAuth>}>
              <Route index element={<MHome />} />
              <Route path="report" element={<MReport />} />
              <Route path="cameras" element={<MCameras />} />
              <Route path="violations/:id" element={<ViolationInfo />} />
              <Route path="tasks" element={<MyTasks />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="stats" element={<MStats />} />
              <Route path="notifications" element={<MNotifications />} />
              <Route path="training" element={<Training />} />
              <Route path="training/:id" element={<TrainingItem />} />
              <Route path="ppe-check" element={<PpeCheck />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
