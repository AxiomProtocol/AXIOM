import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';

interface IotDevice {
  id: number;
  deviceId: string;
  deviceType: string;
  nodeId: number | null;
  locationName: string;
  ownerAddress: string;
  isActive: boolean;
  lastDataAt: string | null;
  dataPointCount: number;
  revenueGenerated: string;
}

interface DataPoint {
  id: number;
  deviceId: string;
  dataType: string;
  value: string;
  unit: string;
  recordedAt: string;
}

const DEVICE_ICONS: { [key: string]: string } = {
  energy_meter: '⚡',
  water_meter: '💧',
  traffic_sensor: '🚗',
  air_quality: '🌬️',
  weather_station: '🌤️',
  parking_sensor: '🅿️',
  waste_bin: '♻️',
  street_light: '💡',
  security_camera: '📹',
  ev_charger: '🔌',
  other: '📡'
};

const DEVICE_COLORS: { [key: string]: string } = {
  energy_meter: 'bg-amber-100 border-amber-300',
  water_meter: 'bg-blue-100 border-blue-300',
  traffic_sensor: 'bg-red-100 border-red-300',
  air_quality: 'bg-green-100 border-green-300',
  weather_station: 'bg-cyan-100 border-cyan-300',
  parking_sensor: 'bg-purple-100 border-purple-300',
  waste_bin: 'bg-emerald-100 border-emerald-300',
  street_light: 'bg-yellow-100 border-yellow-300',
  security_camera: 'bg-indigo-100 border-indigo-300',
  ev_charger: 'bg-teal-100 border-teal-300',
  other: 'bg-gray-100 border-gray-300'
};

export default function IoTDashboard() {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [recentData, setRecentData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [devicesRes, dataRes] = await Promise.all([
        fetch('/api/admin/iot/devices'),
        fetch('/api/admin/iot/recent-data')
      ]);

      if (devicesRes.ok) {
        const data = await devicesRes.json();
        setDevices(data.devices || []);
      }
      if (dataRes.ok) {
        const data = await dataRes.json();
        setRecentData(data.dataPoints || []);
      }
    } catch (error) {
      console.error('Error fetching IoT data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalDevices: devices.length,
    activeDevices: devices.filter(d => d.isActive).length,
    totalDataPoints: devices.reduce((sum, d) => sum + d.dataPointCount, 0),
    totalRevenue: devices.reduce((sum, d) => sum + parseFloat(d.revenueGenerated || '0'), 0)
  };

  const deviceTypes = [...new Set(devices.map(d => d.deviceType))];
  const filteredDevices = selectedType === 'all' 
    ? devices 
    : devices.filter(d => d.deviceType === selectedType);

  return (
    <Layout>
      <Head>
        <title>IoT Dashboard | Axiom Smart City</title>
      </Head>

      <div className="bg-gradient-to-b from-cyan-50/50 to-white">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/" className="text-white/80 hover:text-white text-sm">Home</Link>
              <span className="text-white/50">/</span>
              <Link href="/admin/treasury" className="text-white/80 hover:text-white text-sm">Admin</Link>
              <span className="text-white/50">/</span>
              <span className="text-sm">IoT Dashboard</span>
            </div>
            
            <h1 className="text-4xl font-bold mb-2">IoT Data Streams</h1>
            <p className="text-white/90 text-lg">
              Real-time smart city sensor monitoring and analytics
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Devices', value: stats.totalDevices, icon: '📡', color: 'bg-blue-50 border-blue-200' },
              { label: 'Active Now', value: stats.activeDevices, icon: '🟢', color: 'bg-green-50 border-green-200' },
              { label: 'Data Points', value: stats.totalDataPoints.toLocaleString(), icon: '📊', color: 'bg-amber-50 border-amber-200' },
              { label: 'Revenue Generated', value: `${stats.totalRevenue.toFixed(2)} AXM`, icon: '💰', color: 'bg-purple-50 border-purple-200' }
            ].map((stat, i) => (
              <div key={i} className={`${stat.color} border rounded-xl p-6`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{stat.icon}</span>
                  <span className="text-gray-600 text-sm">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Connected Devices</h2>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                >
                  <option value="all">All Types</option>
                  {deviceTypes.map(type => (
                    <option key={type} value={type}>
                      {DEVICE_ICONS[type]} {type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="text-center py-16 text-gray-500">
                  Loading devices...
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-5xl mb-4">📡</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No IoT Devices</h3>
                  <p className="text-gray-500">Smart city IoT devices will appear here when connected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDevices.map((device) => (
                    <div key={device.id} className="bg-white border border-gray-200 rounded-xl p-6 flex justify-between items-center hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl border ${DEVICE_COLORS[device.deviceType]}`}>
                          {DEVICE_ICONS[device.deviceType]}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{device.deviceId}</div>
                          <div className="text-gray-500 text-sm">
                            {device.locationName || device.deviceType.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <div className="text-gray-500 text-xs">Data Points</div>
                          <div className="font-bold text-gray-900">{device.dataPointCount}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 text-xs">Revenue</div>
                          <div className="text-amber-600 font-bold">
                            {parseFloat(device.revenueGenerated || '0').toFixed(2)} AXM
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          device.isActive ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Live Data Feed</h2>
              <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-[600px] overflow-y-auto">
                {recentData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No recent data
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentData.map((point) => (
                      <div key={point.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-gray-900 text-sm">{point.deviceId}</span>
                          <span className="text-gray-400 text-xs">
                            {new Date(point.recordedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">{point.dataType}</span>
                          <span className="text-green-600 font-bold text-sm">
                            {point.value} {point.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* How IoT Data Streams Work */}
          <div className="mt-16 border-t border-gray-200 pt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Smart City IoT Infrastructure</h2>
            
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              {[
                {
                  step: '1',
                  icon: '📡',
                  title: 'Deploy Sensors',
                  description: 'Install IoT devices across the smart city - energy meters, water sensors, traffic monitors, and more.'
                },
                {
                  step: '2',
                  icon: '📊',
                  title: 'Collect Data',
                  description: 'Sensors continuously stream real-time data to the Axiom network, creating a live city intelligence feed.'
                },
                {
                  step: '3',
                  icon: '🔗',
                  title: 'Verify & Store',
                  description: 'Data is validated by DePIN nodes and stored on-chain, ensuring accuracy and immutability.'
                },
                {
                  step: '4',
                  icon: '💰',
                  title: 'Earn Rewards',
                  description: 'Device operators earn AXM rewards based on data quality, uptime, and network contribution.'
                }
              ].map((item) => (
                <div key={item.step} className="bg-white border border-gray-200 rounded-xl p-5 text-center hover:shadow-lg transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3">
                    {item.step}
                  </div>
                  <span className="text-3xl block mb-2">{item.icon}</span>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Device Types */}
            <div className="mb-12">
              <h3 className="font-bold text-gray-900 text-xl mb-6 text-center">Supported Device Types</h3>
              <div className="grid md:grid-cols-5 gap-4">
                {[
                  { type: 'Energy Meters', icon: '⚡', color: 'bg-amber-100 border-amber-200', desc: 'Track electricity consumption and solar generation' },
                  { type: 'Water Meters', icon: '💧', color: 'bg-blue-100 border-blue-200', desc: 'Monitor water usage and detect leaks' },
                  { type: 'Traffic Sensors', icon: '🚗', color: 'bg-red-100 border-red-200', desc: 'Count vehicles and analyze traffic flow' },
                  { type: 'Air Quality', icon: '🌬️', color: 'bg-green-100 border-green-200', desc: 'Measure pollution, AQI, and particulates' },
                  { type: 'Weather Stations', icon: '🌤️', color: 'bg-cyan-100 border-cyan-200', desc: 'Temperature, humidity, wind, and precipitation' },
                  { type: 'Parking Sensors', icon: '🅿️', color: 'bg-purple-100 border-purple-200', desc: 'Detect available parking spaces in real-time' },
                  { type: 'Waste Bins', icon: '♻️', color: 'bg-emerald-100 border-emerald-200', desc: 'Monitor fill levels for efficient collection' },
                  { type: 'Street Lights', icon: '💡', color: 'bg-yellow-100 border-yellow-200', desc: 'Smart lighting control and monitoring' },
                  { type: 'Security Cameras', icon: '📹', color: 'bg-indigo-100 border-indigo-200', desc: 'Motion detection and incident alerts' },
                  { type: 'EV Chargers', icon: '🔌', color: 'bg-teal-100 border-teal-200', desc: 'Charging station availability and usage' }
                ].map((device, i) => (
                  <div key={i} className={`${device.color} border rounded-xl p-4`}>
                    <div className="text-2xl mb-2">{device.icon}</div>
                    <div className="font-bold text-gray-900 text-sm mb-1">{device.type}</div>
                    <p className="text-gray-600 text-xs">{device.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Opportunities */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-6">
                <h3 className="font-bold text-cyan-800 text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">💰</span> Earn From Your Devices
                </h3>
                <ul className="space-y-3">
                  {[
                    'Receive AXM rewards for every data point submitted',
                    'Bonus multipliers for high-accuracy sensors',
                    'Extra rewards for critical infrastructure devices',
                    'Uptime bonuses for consistent 99%+ availability',
                    'Referral rewards for onboarding new device operators'
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 mt-1">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
                <h3 className="font-bold text-purple-800 text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span> Data Marketplace
                </h3>
                <ul className="space-y-3">
                  {[
                    'Sell anonymized data to researchers and businesses',
                    'Contribute to city planning and urban analytics',
                    'Support emergency response with real-time alerts',
                    'Enable predictive maintenance for city infrastructure',
                    'Power AI models with high-quality training data'
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 mt-1">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Reward Rates */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl p-8 mb-12">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Device Reward Rates</h3>
                <p className="text-white/80">Earn AXM based on your device type and data quality</p>
              </div>
              <div className="grid md:grid-cols-5 gap-4">
                {[
                  { device: 'Energy Meters', rate: '0.5 AXM/day', icon: '⚡' },
                  { device: 'Water Meters', rate: '0.4 AXM/day', icon: '💧' },
                  { device: 'Traffic Sensors', rate: '0.8 AXM/day', icon: '🚗' },
                  { device: 'Air Quality', rate: '1.0 AXM/day', icon: '🌬️' },
                  { device: 'Weather Stations', rate: '0.6 AXM/day', icon: '🌤️' }
                ].map((item, i) => (
                  <div key={i} className="bg-white/10 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="font-bold text-sm mb-1">{item.device}</div>
                    <div className="text-cyan-200 font-bold">{item.rate}</div>
                  </div>
                ))}
              </div>
              <p className="text-center text-white/60 text-sm mt-4">
                * Rates shown are base rates. Quality and uptime bonuses can increase earnings by up to 3x.
              </p>
            </div>

            {/* Getting Started */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-12">
              <h3 className="font-bold text-gray-900 text-xl mb-4">Getting Started with IoT</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">📦</div>
                  <h4 className="font-bold text-gray-900 mb-2">1. Get Hardware</h4>
                  <p className="text-gray-600 text-sm">Purchase compatible IoT sensors or use Axiom-certified devices from our marketplace.</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">🔧</div>
                  <h4 className="font-bold text-gray-900 mb-2">2. Configure & Deploy</h4>
                  <p className="text-gray-600 text-sm">Install firmware, connect to WiFi, and link your device to your Axiom wallet.</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">📈</div>
                  <h4 className="font-bold text-gray-900 mb-2">3. Monitor & Earn</h4>
                  <p className="text-gray-600 text-sm">Track data streams on this dashboard and watch your AXM rewards accumulate.</p>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 text-xl mb-6">Frequently Asked Questions</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    q: 'What hardware is compatible?',
                    a: 'Any device that can transmit data via WiFi, LoRaWAN, or cellular can be integrated. We provide SDKs for Arduino, ESP32, and Raspberry Pi.'
                  },
                  {
                    q: 'How often is data collected?',
                    a: 'Most sensors report every 1-5 minutes. High-frequency sensors like traffic monitors may report every 10 seconds.'
                  },
                  {
                    q: 'Is my location data private?',
                    a: 'Yes. Location data is only used for grouping devices by region. Personal identifying information is never stored or shared.'
                  },
                  {
                    q: 'What happens if my device goes offline?',
                    a: 'You won\'t earn rewards during downtime. Devices buffer data locally and sync when reconnected, but stale data has reduced value.'
                  },
                  {
                    q: 'Can I run multiple devices?',
                    a: 'Absolutely! Many operators run networks of 10-100+ devices. Bulk operators may qualify for premium reward tiers.'
                  },
                  {
                    q: 'How are rewards distributed?',
                    a: 'Rewards are calculated daily and distributed weekly to your connected wallet. View pending rewards in your dashboard.'
                  }
                ].map((faq, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 text-sm mb-2">{faq.q}</h4>
                    <p className="text-gray-600 text-sm">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
