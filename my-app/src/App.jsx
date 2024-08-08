import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import io from 'socket.io-client';

const socket = io('http://localhost:4999');

function App() {
  const [metrics, setMetrics] = useState({ cpu_usage: 0, memory_usage: 0 });
  const [logs, setLogs] = useState([]);
  const [metricsHistory, setMetricsHistory] = useState([]);

  const formatLog = useCallback((log) => {
    if (typeof log === 'string') {
      try {
        return JSON.parse(log);
      } catch (e) {
        return { message: log, timestamp: new Date().toISOString(), severity: 'INFO' };
      }
    }
    switch (log.severity) {
      case "3": log.severity = "error"
      case 2: log.severity = "warn"
      case 1: log.severity = "info"
    }
    return {
      message: log.message || 'No message',
      timestamp: log.timestamp || new Date().toISOString(),
      severity: log.severity || 'INFO'
    };
  }, []);

  const addLogs = useCallback((newLogs) => {
    setLogs(prevLogs => {
      const formattedNewLogs = newLogs.map(formatLog);
      const uniqueLogs = [...formattedNewLogs, ...prevLogs].reduce((acc, log) => {
        if (!acc.some(existingLog => existingLog.timestamp === log.timestamp && existingLog.message === log.message)) {
          acc.push(log);
        }
        return acc;
      }, []);
      return uniqueLogs.slice(0, 100);
    });
  }, [formatLog]);

  useEffect(() => {
    socket.on('metrics_update', (data) => {
      console.log('Received metrics update:', data);
      setMetrics(data);
      setMetricsHistory(prev => [...prev, { ...data, time: new Date().toLocaleTimeString() }].slice(-20));
    });

    socket.on('log_update', (log) => {
      console.log('Received log update:', log);
      addLogs([log]);
    });
    return () => {
      socket.off('metrics_update');
      socket.off('log_update');
    };
  }, [fetchMetrics, fetchLogs, addLogs]);

  const getSeverityClass = useCallback((severity) => {
    if (!severity) return 'bg-gray-100 text-gray-800';
    
    switch (severity.toString().toLowerCase()) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Real-time Monitoring Dashboard</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Current Metrics</h2>
        <p className="text-lg">CPU Usage: {metrics.cpu_usage}%</p>
        <p className="text-lg">Memory Usage: {metrics.memory_usage}%</p>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Metrics History</h2>
        <LineChart width={600} height={300} data={metricsHistory} className="mx-auto">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="cpu_usage" stroke="#8884d8" />
          <Line type="monotone" dataKey="memory_usage" stroke="#82ca9d" />
        </LineChart>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold mb-4">Recent Logs ({logs.length})</h2>
        <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
  {logs.length > 0 ? (
    logs.map((log, index) => (
      <div key={`${log.timestamp}-${index}`} className="mb-2 p-2 rounded font-mono text-sm">
        <span className="font-bold mr-2">
          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'No timestamp'}
        </span>
        <span className={`font-bold px-2 py-1 rounded mr-2 ${getSeverityClass(log.severity)}`}>
          {log.severity || 'Unknown'}
        </span>
        <span>{log.message || 'No message'}</span>
      </div>
    ))
  ) : (
    <p className="text-gray-500">No logs available</p>
  )}
</div>
      </div>
    </div>
  );
}

export default App;