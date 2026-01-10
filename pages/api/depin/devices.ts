import { NextApiRequest, NextApiResponse } from 'next';
import { getIoTDevices, getDeviceById, updateDeviceStatus, addSensorReading, getSensorReadings } from '../../../lib/depin-oracles';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { landAssetId, deviceId, readings, limit } = req.query;

    try {
      if (deviceId && typeof deviceId === 'string') {
        const device = getDeviceById(deviceId);
        if (!device) {
          return res.status(404).json({ success: false, error: 'Device not found' });
        }

        if (readings === 'true') {
          const deviceReadings = getSensorReadings(deviceId, limit ? parseInt(limit as string) : 50);
          return res.status(200).json({ success: true, device, readings: deviceReadings });
        }

        return res.status(200).json({ success: true, device });
      }

      const devices = getIoTDevices(landAssetId as string);

      return res.status(200).json({
        success: true,
        devices,
        count: devices.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching IoT devices:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch devices' });
    }
  }

  if (req.method === 'POST') {
    const { action, deviceId, status, reading } = req.body;

    if (action === 'updateStatus' && deviceId && status) {
      const success = updateDeviceStatus(deviceId, status);

      logAuditEvent({
        action: 'device_status_updated',
        ipAddress: clientId,
        details: { deviceId, status, success },
        severity: 'info',
        success
      });

      return res.status(200).json({ success, deviceId, status });
    }

    if (action === 'addReading' && reading) {
      const newReading = addSensorReading(reading);

      return res.status(201).json({ success: true, reading: newReading });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
