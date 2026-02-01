export interface IoTDevice {
  id: string;
  name: string;
  type: 'sensor' | 'meter' | 'camera' | 'controller' | 'gateway';
  location: { lat: number; lng: number; address?: string };
  landAssetId?: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: string;
  metadata: Record<string, any>;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  timestamp: string;
  type: string;
  value: number;
  unit: string;
  verified: boolean;
  txHash?: string;
}

export interface AssetOracle {
  id: string;
  name: string;
  type: 'price' | 'weather' | 'property_value' | 'energy' | 'carbon';
  source: string;
  lastUpdate: string;
  value: number;
  unit: string;
  confidence: number;
  chainLink?: string;
}

export interface CrossChainSettlement {
  id: string;
  sourceChain: string;
  destinationChain: string;
  asset: string;
  amount: number;
  status: 'pending' | 'confirming' | 'completed' | 'failed';
  sourceTxHash?: string;
  destTxHash?: string;
  initiatedAt: string;
  completedAt?: string;
  fee: number;
}

export interface EnergyCredit {
  id: string;
  landAssetId: string;
  type: 'solar' | 'wind' | 'carbon_offset';
  amount: number;
  unit: string;
  generatedAt: string;
  verified: boolean;
  tokenized: boolean;
  tokenId?: string;
}

const iotDevices: IoTDevice[] = [
  { id: 'dev-1', name: 'Soil Moisture Sensor A1', type: 'sensor', location: { lat: 33.7490, lng: -84.3880, address: 'Meadowbrook Farm' }, landAssetId: 'land-1', status: 'online', lastSeen: new Date().toISOString(), metadata: { model: 'SM-200', battery: 85 } },
  { id: 'dev-2', name: 'Weather Station Main', type: 'sensor', location: { lat: 33.7492, lng: -84.3875 }, landAssetId: 'land-1', status: 'online', lastSeen: new Date().toISOString(), metadata: { model: 'WS-500', features: ['temp', 'humidity', 'rain', 'wind'] } },
  { id: 'dev-3', name: 'Solar Panel Monitor', type: 'meter', location: { lat: 33.7488, lng: -84.3882 }, landAssetId: 'land-1', status: 'online', lastSeen: new Date().toISOString(), metadata: { capacity: '5kW', efficiency: 0.18 } },
  { id: 'dev-4', name: 'Perimeter Camera North', type: 'camera', location: { lat: 33.7495, lng: -84.3878 }, landAssetId: 'land-1', status: 'offline', lastSeen: '2026-01-09T08:30:00Z', metadata: { resolution: '4K', nightVision: true } },
  { id: 'dev-5', name: 'Irrigation Controller', type: 'controller', location: { lat: 33.7491, lng: -84.3879 }, landAssetId: 'land-1', status: 'online', lastSeen: new Date().toISOString(), metadata: { zones: 8, activeZones: 3 } }
];

const sensorReadings: SensorReading[] = [];

const assetOracles: AssetOracle[] = [
  { id: 'oracle-1', name: 'AXM/USD Price', type: 'price', source: 'Chainlink', lastUpdate: new Date().toISOString(), value: 0.85, unit: 'USD', confidence: 99.9, chainLink: '0xABCD...' },
  { id: 'oracle-2', name: 'ETH/USD Price', type: 'price', source: 'Chainlink', lastUpdate: new Date().toISOString(), value: 2450.50, unit: 'USD', confidence: 99.9, chainLink: '0xBCDE...' },
  { id: 'oracle-3', name: 'Georgia Land Index', type: 'property_value', source: 'ATTOM + Internal', lastUpdate: new Date().toISOString(), value: 4250, unit: 'USD/acre', confidence: 95.0 },
  { id: 'oracle-4', name: 'Atlanta Weather', type: 'weather', source: 'Weather API', lastUpdate: new Date().toISOString(), value: 62, unit: 'F', confidence: 98.0 },
  { id: 'oracle-5', name: 'Solar Energy Rate', type: 'energy', source: 'Grid Connect', lastUpdate: new Date().toISOString(), value: 0.12, unit: 'USD/kWh', confidence: 100.0 },
  { id: 'oracle-6', name: 'Carbon Credit Price', type: 'carbon', source: 'Verra Registry', lastUpdate: new Date().toISOString(), value: 15.80, unit: 'USD/ton', confidence: 97.0 }
];

const crossChainSettlements: CrossChainSettlement[] = [];
const energyCredits: EnergyCredit[] = [];

export function getIoTDevices(landAssetId?: string): IoTDevice[] {
  if (landAssetId) {
    return iotDevices.filter(d => d.landAssetId === landAssetId);
  }
  return iotDevices;
}

export function getDeviceById(deviceId: string): IoTDevice | undefined {
  return iotDevices.find(d => d.id === deviceId);
}

export function updateDeviceStatus(deviceId: string, status: IoTDevice['status']): boolean {
  const device = iotDevices.find(d => d.id === deviceId);
  if (device) {
    device.status = status;
    device.lastSeen = new Date().toISOString();
    return true;
  }
  return false;
}

export function addSensorReading(reading: Omit<SensorReading, 'id' | 'timestamp' | 'verified'>): SensorReading {
  const newReading: SensorReading = {
    ...reading,
    id: `reading-${Date.now()}`,
    timestamp: new Date().toISOString(),
    verified: false
  };
  sensorReadings.push(newReading);

  if (sensorReadings.length > 1000) {
    sensorReadings.shift();
  }

  return newReading;
}

export function getSensorReadings(deviceId: string, limit?: number): SensorReading[] {
  const readings = sensorReadings.filter(r => r.deviceId === deviceId);
  readings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return limit ? readings.slice(0, limit) : readings;
}

export function getAssetOracles(type?: AssetOracle['type']): AssetOracle[] {
  if (type) {
    return assetOracles.filter(o => o.type === type);
  }
  return assetOracles;
}

export function updateOracleValue(oracleId: string, value: number): boolean {
  const oracle = assetOracles.find(o => o.id === oracleId);
  if (oracle) {
    oracle.value = value;
    oracle.lastUpdate = new Date().toISOString();
    return true;
  }
  return false;
}

export function initiateCrossChainSettlement(
  sourceChain: string,
  destinationChain: string,
  asset: string,
  amount: number
): CrossChainSettlement {
  const settlement: CrossChainSettlement = {
    id: `settle-${Date.now()}`,
    sourceChain,
    destinationChain,
    asset,
    amount,
    status: 'pending',
    initiatedAt: new Date().toISOString(),
    fee: amount * 0.001
  };
  crossChainSettlements.push(settlement);

  setTimeout(() => {
    settlement.status = 'confirming';
    settlement.sourceTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
    
    setTimeout(() => {
      settlement.status = Math.random() > 0.05 ? 'completed' : 'failed';
      settlement.completedAt = new Date().toISOString();
      if (settlement.status === 'completed') {
        settlement.destTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      }
    }, 5000);
  }, 2000);

  return settlement;
}

export function getCrossChainSettlements(limit?: number): CrossChainSettlement[] {
  const settlements = [...crossChainSettlements];
  settlements.sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime());
  return limit ? settlements.slice(0, limit) : settlements;
}

export function mintEnergyCredit(landAssetId: string, type: EnergyCredit['type'], amount: number): EnergyCredit {
  const credit: EnergyCredit = {
    id: `credit-${Date.now()}`,
    landAssetId,
    type,
    amount,
    unit: type === 'carbon_offset' ? 'tons' : 'kWh',
    generatedAt: new Date().toISOString(),
    verified: false,
    tokenized: false
  };
  energyCredits.push(credit);
  return credit;
}

export function getEnergyCredits(landAssetId?: string): EnergyCredit[] {
  if (landAssetId) {
    return energyCredits.filter(c => c.landAssetId === landAssetId);
  }
  return energyCredits;
}

export function tokenizeEnergyCredit(creditId: string): { success: boolean; tokenId?: string } {
  const credit = energyCredits.find(c => c.id === creditId);
  if (credit && credit.verified && !credit.tokenized) {
    credit.tokenized = true;
    credit.tokenId = `NFT-${Date.now()}`;
    return { success: true, tokenId: credit.tokenId };
  }
  return { success: false };
}

export default {
  getIoTDevices,
  getDeviceById,
  updateDeviceStatus,
  addSensorReading,
  getSensorReadings,
  getAssetOracles,
  updateOracleValue,
  initiateCrossChainSettlement,
  getCrossChainSettlements,
  mintEnergyCredit,
  getEnergyCredits,
  tokenizeEnergyCredit
};
