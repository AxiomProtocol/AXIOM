import React, { useState, useEffect, useCallback } from 'react';
import { 
  CloudUploadIcon, 
  ServerIcon, 
  DocumentIcon, 
  TrashIcon,
  PlayIcon,
  StopIcon,
  ChartBarIcon,
  DownloadIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  GlobeIcon,
  LightningBoltIcon
} from '@heroicons/react/outline';
import { useNotificationHelpers } from '../components/NotificationSystem';

interface FileItem {
  id: string;
  name: string;
  size: string;
  uploaded: string;
  mimetype: string;
  hash: string;
}

interface NodeStatus {
  running: boolean;
  uptime: number;
  storageUsed: string;
  storageAvailable: string;
  activeTransactions: number;
  totalEarnings: string;
  lastSync: string;
  totalFiles: number;
}

interface StorageAnalytics {
  totalStorage: string;
  usedStorage: string;
  availableStorage: string;
  totalFiles: number;
  totalEarnings: string;
  uptime: string;
  activeConnections: number;
  dataIntegrity: string;
  networkLatency: string;
}

export default function DeNetStoragePage() {
  const [nodeStatus, setNodeStatus] = useState<NodeStatus | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'instructions' | 'faq'>('overview');
  const { showInfo, showError, showSuccess, showWarning } = useNotificationHelpers();

  // Fetch node status
  const fetchNodeStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/denet/status');
      const data = await response.json();
      setNodeStatus(data);
    } catch (error) {
      console.error('Failed to fetch node status:', error);
      showError('Failed to fetch node status');
    }
  }, [showError]);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/denet/files');
      const data = await response.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      showError('Failed to fetch files');
    }
  }, [showError]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/denet/analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      showError('Failed to fetch analytics');
    }
  }, [showError]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchNodeStatus(),
        fetchFiles(),
        fetchAnalytics()
      ]);
      setLoading(false);
    };

    initializeData();
  }, [fetchNodeStatus, fetchFiles, fetchAnalytics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNodeStatus();
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNodeStatus, fetchAnalytics]);

  const startNode = async () => {
    try {
      const response = await fetch('/api/denet/start', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        showSuccess('DeNet storage node started successfully');
        fetchNodeStatus();
      } else {
        showError(`Failed to start node: ${result.error}`);
      }
    } catch (error) {
      console.error('Error starting node:', error);
      showError('Error starting node');
    }
  };

  const stopNode = async () => {
    try {
      const response = await fetch('/api/denet/stop', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        showWarning('DeNet storage node stopped');
        fetchNodeStatus();
      } else {
        showError(`Failed to stop node: ${result.error}`);
      }
    } catch (error) {
      console.error('Error stopping node:', error);
      showError('Error stopping node');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const uploadFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      showWarning('Please select files to upload');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }

      const response = await fetch('/api/denet/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(`Successfully uploaded ${result.files.length} file(s) to DeNet storage`);
        fetchFiles();
        fetchAnalytics();
        setSelectedFiles(null);
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        showError(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file from DeNet storage?')) return;

    try {
      const response = await fetch(`/api/denet/files/${fileId}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        showSuccess('File deleted from DeNet storage');
        fetchFiles();
        fetchAnalytics();
      } else {
        showError(`Failed to delete file: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete file');
    }
  };

  const downloadFile = (fileId: string, fileName: string) => {
    const downloadUrl = `/api/denet/download/${fileId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showInfo(`Downloading ${fileName}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golden mx-auto mb-4"></div>
          <p className="text-white">Loading DeNet Storage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <ServerIcon className="w-10 h-10 text-golden mr-3" />
            DeNet Storage Manager
          </h1>
          <p className="text-gray-300 text-lg mb-6">Decentralized storage node management and file operations on the DeNet Protocol</p>
          
          {/* Navigation Tabs */}
          <div className="flex flex-wrap mt-6 space-x-1 bg-black/20 backdrop-blur-sm rounded-lg p-1 border border-golden/20">
            {[
              { id: 'overview', label: 'Node Overview', icon: ServerIcon },
              { id: 'instructions', label: 'How to Use', icon: InformationCircleIcon },
              { id: 'faq', label: 'FAQ & Help', icon: QuestionMarkCircleIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-golden text-black'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Based on Active Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Node Status Card */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 mb-8 border border-golden/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white flex items-center">
              <ServerIcon className="w-6 h-6 text-golden mr-2" />
              Node Status
            </h2>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${nodeStatus?.running ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-white">{nodeStatus?.running ? 'Running' : 'Stopped'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-golden/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-golden">{nodeStatus?.uptime || 0}h</div>
              <div className="text-gray-300 text-sm">Uptime</div>
            </div>
            <div className="bg-golden/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-golden">{nodeStatus?.storageUsed || '0 GB'}</div>
              <div className="text-gray-300 text-sm">Storage Used</div>
            </div>
            <div className="bg-golden/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-golden">{nodeStatus?.activeTransactions || 0}</div>
              <div className="text-gray-300 text-sm">Active Transactions</div>
            </div>
            <div className="bg-golden/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-golden">{nodeStatus?.totalEarnings || '0 DE'}</div>
              <div className="text-gray-300 text-sm">Total Earnings</div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={startNode}
              disabled={nodeStatus?.running}
              className={`flex items-center px-6 py-2 rounded-lg font-semibold transition-colors ${
                nodeStatus?.running
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Start Node
            </button>
            <button
              onClick={stopNode}
              disabled={!nodeStatus?.running}
              className={`flex items-center px-6 py-2 rounded-lg font-semibold transition-colors ${
                !nodeStatus?.running
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <StopIcon className="w-4 h-4 mr-2" />
              Stop Node
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Upload Section */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-golden/20">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
              <CloudUploadIcon className="w-6 h-6 text-golden mr-2" />
              Upload Files
            </h2>
            
            <div className="border-2 border-dashed border-golden/40 rounded-lg p-8 text-center mb-4 hover:border-golden/60 transition-colors">
              <CloudUploadIcon className="w-16 h-16 text-golden mx-auto mb-4" />
              <input
                type="file"
                id="file-input"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer text-white hover:text-golden transition-colors"
              >
                <h3 className="text-lg font-semibold mb-2">Click to select files</h3>
                <p className="text-gray-300">Support for any file type, max 100MB per file</p>
              </label>
            </div>

            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mb-4">
                <h4 className="text-white font-semibold mb-2">Selected Files:</h4>
                <div className="space-y-1">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="text-gray-300 text-sm">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={uploadFiles}
              disabled={!selectedFiles || selectedFiles.length === 0 || isUploading}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                !selectedFiles || selectedFiles.length === 0 || isUploading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-golden hover:bg-golden/80 text-black'
              }`}
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles?.length || 0} File(s)`}
            </button>
          </div>

          {/* Storage Analytics */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-golden/20">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
              <ChartBarIcon className="w-6 h-6 text-golden mr-2" />
              Storage Analytics
            </h2>
            
            {analytics && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-golden/10 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-golden">{analytics.totalStorage}</div>
                    <div className="text-gray-300 text-sm">Total Capacity</div>
                  </div>
                  <div className="bg-golden/10 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-golden">{analytics.uptime}</div>
                    <div className="text-gray-300 text-sm">Uptime</div>
                  </div>
                  <div className="bg-golden/10 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-golden">{analytics.totalFiles}</div>
                    <div className="text-gray-300 text-sm">Total Files</div>
                  </div>
                  <div className="bg-golden/10 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-golden">{analytics.activeConnections}</div>
                    <div className="text-gray-300 text-sm">Connections</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-300 text-sm mb-1">Data Integrity</div>
                    <div className="text-green-400 font-semibold">{analytics.dataIntegrity}</div>
                  </div>
                  <div>
                    <div className="text-gray-300 text-sm mb-1">Network Latency</div>
                    <div className="text-blue-400 font-semibold">{analytics.networkLatency}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Files List */}
        <div className="mt-8 bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-golden/20">
          <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
            <DocumentIcon className="w-6 h-6 text-golden mr-2" />
            Stored Files ({files.length})
          </h2>
          
          {files.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <DocumentIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No files uploaded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-golden/20">
                    <th className="pb-2 text-gray-300">Name</th>
                    <th className="pb-2 text-gray-300">Size</th>
                    <th className="pb-2 text-gray-300">Uploaded</th>
                    <th className="pb-2 text-gray-300">Hash</th>
                    <th className="pb-2 text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} className="border-b border-gray-700/50">
                      <td className="py-3 text-white">{file.name}</td>
                      <td className="py-3 text-gray-300">{file.size}</td>
                      <td className="py-3 text-gray-300">{file.uploaded}</td>
                      <td className="py-3 text-gray-300 font-mono text-xs">{file.hash}</td>
                      <td className="py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => downloadFile(file.id, file.name)}
                            className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Download"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFile(file.id)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}

        {/* Instructions Tab */}
        {activeTab === 'instructions' && (
          <div className="space-y-8">
            {/* What is DeNet Storage */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-golden/20">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <InformationCircleIcon className="w-6 h-6 text-golden mr-2" />
                What is DeNet Storage?
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  DeNet is a decentralized storage protocol that allows you to store files across a network of distributed nodes. 
                  Unlike traditional cloud storage, your files are encrypted, fragmented, and distributed across multiple nodes, 
                  ensuring maximum security, privacy, and availability.
                </p>
                
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                    <ShieldCheckIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <h3 className="text-white font-semibold mb-1">Secure & Private</h3>
                    <p className="text-gray-400 text-sm">End-to-end encryption with zero-knowledge architecture</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4 text-center">
                    <GlobeIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <h3 className="text-white font-semibold mb-1">Decentralized</h3>
                    <p className="text-gray-400 text-sm">No single point of failure, distributed globally</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                    <CurrencyDollarIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <h3 className="text-white font-semibold mb-1">Earn Rewards</h3>
                    <p className="text-gray-400 text-sm">Get paid for providing storage to the network</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Getting Started Guide */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-golden/20">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <LightningBoltIcon className="w-6 h-6 text-golden mr-2" />
                Getting Started Guide
              </h2>
              <div className="space-y-6">
                
                {/* Step 1 */}
                <div className="border-l-4 border-golden/50 pl-6">
                  <div className="flex items-center mb-2">
                    <div className="bg-golden text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">1</div>
                    <h3 className="text-white font-semibold">Start Your Storage Node</h3>
                  </div>
                  <p className="text-gray-300 mb-2">
                    Click the "Start Node" button to begin running your DeNet storage node. This will make your allocated storage space available to the network.
                  </p>
                  <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                    <p className="text-yellow-300 text-sm">
                      <strong>Note:</strong> Make sure you have at least 10GB of free disk space before starting your node.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="border-l-4 border-golden/50 pl-6">
                  <div className="flex items-center mb-2">
                    <div className="bg-golden text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">2</div>
                    <h3 className="text-white font-semibold">Upload Files</h3>
                  </div>
                  <p className="text-gray-300 mb-2">
                    Use the file upload section to store your files on the DeNet network. Files are automatically encrypted and distributed across multiple nodes.
                  </p>
                  <ul className="text-gray-400 text-sm space-y-1 ml-4">
                    <li>• Maximum file size: 100MB per file</li>
                    <li>• Supported formats: All file types</li>
                    <li>• Files are automatically backed up across 3+ nodes</li>
                  </ul>
                </div>

                {/* Step 3 */}
                <div className="border-l-4 border-golden/50 pl-6">
                  <div className="flex items-center mb-2">
                    <div className="bg-golden text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">3</div>
                    <h3 className="text-white font-semibold">Monitor & Manage</h3>
                  </div>
                  <p className="text-gray-300 mb-2">
                    Track your node's performance, earnings, and storage usage through the analytics dashboard. Download or delete files as needed.
                  </p>
                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    <p className="text-green-300 text-sm">
                      <strong>Tip:</strong> Keep your node running 24/7 to maximize earnings and network reliability.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="border-l-4 border-golden/50 pl-6">
                  <div className="flex items-center mb-2">
                    <div className="bg-golden text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">4</div>
                    <h3 className="text-white font-semibold">Earn Rewards</h3>
                  </div>
                  <p className="text-gray-300 mb-2">
                    As your node provides storage services to the network, you'll earn DE tokens. Rewards are calculated based on:
                  </p>
                  <ul className="text-gray-400 text-sm space-y-1 ml-4">
                    <li>• Amount of storage provided</li>
                    <li>• Node uptime and reliability</li>
                    <li>• Network demand for storage</li>
                    <li>• Data retrieval performance</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-golden/20">
              <h2 className="text-2xl font-semibold text-white mb-4">Best Practices</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-semibold mb-3 text-green-400">✅ Do's</h3>
                  <ul className="text-gray-300 space-y-2 text-sm">
                    <li>• Keep your node running continuously</li>
                    <li>• Maintain stable internet connection</li>
                    <li>• Monitor storage usage regularly</li>
                    <li>• Backup important files locally too</li>
                    <li>• Update your node software when prompted</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-3 text-red-400">❌ Don'ts</h3>
                  <ul className="text-gray-300 space-y-2 text-sm">
                    <li>• Don't store illegal or copyrighted content</li>
                    <li>• Don't frequently start/stop your node</li>
                    <li>• Don't exceed your allocated storage</li>
                    <li>• Don't modify node files manually</li>
                    <li>• Don't use unstable internet connections</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-golden/20">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <QuestionMarkCircleIcon className="w-6 h-6 text-golden mr-2" />
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {[
                  {
                    question: "What is DeNet and how does it work?",
                    answer: "DeNet is a decentralized storage protocol that distributes your files across multiple nodes globally. When you upload a file, it's encrypted, fragmented, and stored on several independent nodes. This ensures your data remains available even if some nodes go offline, while maintaining complete privacy through encryption."
                  },
                  {
                    question: "How much can I earn by running a storage node?",
                    answer: "Earnings depend on several factors: storage capacity provided, node uptime, network demand, and data transfer volume. Typical nodes can earn anywhere from $10-100+ per month, with higher-capacity nodes with excellent uptime earning more. Rewards are paid in DE tokens which can be exchanged for other cryptocurrencies."
                  },
                  {
                    question: "Is my data secure on DeNet?",
                    answer: "Yes, your data is highly secure. All files are encrypted client-side before upload using AES-256 encryption. Files are then fragmented and distributed across multiple nodes, so no single node has access to your complete file. Only you hold the keys to decrypt and access your data."
                  },
                  {
                    question: "What happens if I lose my files or keys?",
                    answer: "If you lose your encryption keys, your files cannot be recovered - this is by design for maximum security. Always backup your keys securely. However, if nodes storing your files go offline, the network automatically replicates your data to new nodes, so file loss due to node failure is extremely rare."
                  },
                  {
                    question: "How much storage do I need to run a node?",
                    answer: "The minimum recommended storage is 10GB, but nodes with 100GB+ tend to earn more rewards. You can allocate any amount of free space on your hard drive. The more reliable storage you provide, the more you can potentially earn from the network."
                  },
                  {
                    question: "Can I access my files from anywhere?",
                    answer: "Yes! Once uploaded to DeNet, you can access your files from any device with an internet connection using your DeNet credentials. Files are retrieved from the fastest available nodes, ensuring quick access from anywhere in the world."
                  },
                  {
                    question: "What internet speed do I need?",
                    answer: "For basic file storage and retrieval, any broadband connection works. However, for running a profitable storage node, we recommend at least 10 Mbps upload speed. Faster connections allow your node to serve files more quickly, leading to better performance ratings and higher rewards."
                  },
                  {
                    question: "How do I withdraw my earnings?",
                    answer: "Earnings in DE tokens are automatically credited to your wallet. You can withdraw them anytime through the rewards section. DE tokens can be exchanged for other cryptocurrencies on supported exchanges, or held for potential value appreciation."
                  },
                  {
                    question: "Is there a risk of storing illegal content?",
                    answer: "The network has built-in content filtering and reporting mechanisms. Node operators are not liable for encrypted content they cannot see. However, if illegal content is detected and reported, it will be removed from the network and the uploader's account may be suspended."
                  },
                  {
                    question: "Can I pause or stop my node temporarily?",
                    answer: "Yes, you can stop your node anytime through the control panel. However, frequent interruptions will lower your reliability score and reduce potential earnings. For maintenance, it's better to schedule brief, infrequent downtime rather than frequent starts and stops."
                  }
                ].map((faq, index) => (
                  <div key={index} className="border border-golden/20 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowFAQ(showFAQ === index ? -1 : index)}
                      className="w-full text-left p-4 bg-black/10 hover:bg-black/20 transition-colors flex justify-between items-center"
                    >
                      <h3 className="text-white font-semibold pr-4">{faq.question}</h3>
                      <span className="text-golden text-xl">
                        {showFAQ === index ? '−' : '+'}
                      </span>
                    </button>
                    {showFAQ === index && (
                      <div className="p-4 bg-black/5 border-t border-golden/10">
                        <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Contact Support */}
              <div className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-6 border border-blue-500/20">
                <h3 className="text-white font-semibold mb-2">Need More Help?</h3>
                <p className="text-gray-300 mb-4">
                  Can't find the answer you're looking for? Our support team is here to help you with any DeNet storage questions.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Contact Support
                  </button>
                  <button className="bg-transparent border border-blue-500 hover:bg-blue-500/10 text-blue-300 px-4 py-2 rounded-lg transition-colors">
                    View Documentation
                  </button>
                  <button className="bg-transparent border border-purple-500 hover:bg-purple-500/10 text-purple-300 px-4 py-2 rounded-lg transition-colors">
                    Join Community
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
