import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell, TasksBoard } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

type TaskStatus = 'pending' | 'inProgress' | 'completed' | 'blocked';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  id: number;
  title: string;
  type?: string;
  dueAt?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedToWallet?: string;
}

export default function StewardTasksPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'tasks' });
  }, []);

  useEffect(() => {
    async function fetchTasks() {
      if (!address) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/stewards/tasks?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [address]);

  const handleStatusChange = async (id: number, newStatus: TaskStatus) => {
    if (!address) return;
    try {
      const res = await fetch(`/api/stewards/tasks?wallet=${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: id, status: newStatus })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
        if (newStatus === 'completed') {
          track(StewardEvents.TASK_COMPLETED, { taskId: id });
        }
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  return (
    <>
      <Head>
        <title>Tasks | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Tasks & SOPs">
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
              Task Management
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              Track and complete stewardship tasks
            </p>
          </div>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#00D4AA',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Add Task
          </button>
        </div>

        <TasksBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          loading={loading}
        />

        {tasks.length === 0 && !loading && (
          <div style={{
            marginTop: '24px',
            padding: '40px',
            background: 'rgba(0,212,170,0.05)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h3 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>All Caught Up</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              No pending tasks. Tasks are auto-generated when drops are created or land leads need attention.
            </p>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
