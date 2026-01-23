import React from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/DashBoard';

function App() {
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
}

export default App;