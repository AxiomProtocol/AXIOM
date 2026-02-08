import React from 'react';
import { track, StewardEvents } from '../../lib/stewardsAnalytics';

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

interface TasksBoardProps {
  tasks: Task[];
  onStatusChange?: (id: number, newStatus: TaskStatus) => Promise<void>;
  loading?: boolean;
}

export function TasksBoard({ tasks, onStatusChange, loading }: TasksBoardProps) {
  const priorityConfig = {
    low: { color: '#666', label: 'Low' },
    medium: { color: '#FFB800', label: 'Medium' },
    high: { color: '#FF6B6B', label: 'High' },
    urgent: { color: '#FF0000', label: 'Urgent' }
  };

  const statusColumns: { id: TaskStatus; label: string }[] = [
    { id: 'pending', label: 'To Do' },
    { id: 'inProgress', label: 'In Progress' },
    { id: 'completed', label: 'Done' }
  ];

  const getTasksByStatus = (status: TaskStatus) => 
    tasks.filter(t => t.status === status);

  const isOverdue = (dueAt?: string) => {
    if (!dueAt) return false;
    return new Date(dueAt) < new Date();
  };

  const formatDue = (dueAt?: string) => {
    if (!dueAt) return '';
    const date = new Date(dueAt);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays}d`;
  };

  const handleComplete = async (task: Task) => {
    if (!onStatusChange) return;
    await onStatusChange(task.id, 'completed');
    track(StewardEvents.TASK_COMPLETED, { taskId: task.id, taskType: task.type });
  };

  if (loading) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>
        <p style={{ color: '#666' }}>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        gap: '1px',
        background: 'rgba(0,0,0,0.06)'
      }}>
        {statusColumns.map(col => {
          const colTasks = getTasksByStatus(col.id);
          return (
            <div
              key={col.id}
              style={{
                flex: 1,
                background: '#fff',
                minHeight: '300px'
              }}
            >
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>
                  {col.label}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: '#666',
                  background: 'rgba(0,0,0,0.06)',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {colTasks.length}
                </span>
              </div>

              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    style={{
                      background: 'rgba(0,0,0,0.02)',
                      borderRadius: '8px',
                      padding: '12px',
                      borderLeft: `3px solid ${priorityConfig[task.priority].color}`
                    }}
                  >
                    <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                      {task.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {task.type && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(123,104,238,0.1)',
                          color: '#7B68EE'
                        }}>
                          {task.type}
                        </span>
                      )}
                      {task.dueAt && (
                        <span style={{
                          fontSize: '10px',
                          color: isOverdue(task.dueAt) ? '#FF6B6B' : '#666'
                        }}>
                          {formatDue(task.dueAt)}
                        </span>
                      )}
                    </div>
                    {col.id !== 'completed' && onStatusChange && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                        {col.id === 'pending' && (
                          <button
                            onClick={() => onStatusChange(task.id, 'inProgress')}
                            style={{
                              flex: 1,
                              padding: '6px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'rgba(123,104,238,0.1)',
                              color: '#7B68EE',
                              fontSize: '11px',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => handleComplete(task)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'rgba(0,212,170,0.1)',
                            color: '#00D4AA',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          Complete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '12px'
                  }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TasksBoard;
