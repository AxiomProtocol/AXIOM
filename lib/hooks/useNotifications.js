import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState('default');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  const sendNotification = useCallback((title, options = {}) => {
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) options.onClick();
      };

      setNotifications(prev => [...prev.slice(-9), { title, ...options, timestamp: Date.now() }]);

      return notification;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return null;
    }
  }, [permission]);

  const notifyPaymentReceived = useCallback((memberName, amount, groupName) => {
    return sendNotification('Payment Received!', {
      body: `${memberName} contributed $${amount} to ${groupName}`,
      tag: 'payment-received',
      requireInteraction: false
    });
  }, [sendNotification]);

  const notifyMemberJoined = useCallback((memberName, groupName) => {
    return sendNotification('New Member Joined!', {
      body: `${memberName} has joined ${groupName}`,
      tag: 'member-joined',
      requireInteraction: false
    });
  }, [sendNotification]);

  const notifyPaymentDue = useCallback((groupName, dueDate) => {
    return sendNotification('Payment Reminder', {
      body: `Your ${groupName} contribution is due on ${dueDate}`,
      tag: 'payment-due',
      requireInteraction: true
    });
  }, [sendNotification]);

  const notifyMilestone = useCallback((milestone, details) => {
    return sendNotification('Milestone Achieved!', {
      body: `${milestone}: ${details}`,
      tag: 'milestone',
      requireInteraction: false
    });
  }, [sendNotification]);

  const notifyGraduation = useCallback((groupName, newStage) => {
    return sendNotification('Congratulations!', {
      body: `Your group ${groupName} has graduated to ${newStage}!`,
      tag: 'graduation',
      requireInteraction: true
    });
  }, [sendNotification]);

  return {
    permission,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
    requestPermission,
    sendNotification,
    notifyPaymentReceived,
    notifyMemberJoined,
    notifyPaymentDue,
    notifyMilestone,
    notifyGraduation,
    recentNotifications: notifications
  };
}

export default useNotifications;
