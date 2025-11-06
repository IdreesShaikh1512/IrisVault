import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Users, FileText, Shield, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [biometrics, setBiometrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, logsRes, bioRes] = await Promise.all([
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/audit-logs?limit=50`),
        axios.get(`${API}/admin/biometrics`)
      ]);
      
      setUsers(usersRes.data.users || []);
      setAuditLogs(logsRes.data.logs || []);
      setBiometrics(bioRes.data.biometrics || []);
    } catch (error) {
      console.error('Admin data fetch error:', error);
      toast.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/10 mb-4"
              data-testid="back-home-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-slate-400 mt-2">System monitoring and user management</p>
          </div>
          <Button
            onClick={fetchAllData}
            variant="outline"
            data-testid="refresh-data-button"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card border-slate-700" data-testid="stats-users">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white mt-1">{users.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-slate-700" data-testid="stats-logs">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Audit Logs</p>
                <p className="text-3xl font-bold text-white mt-1">{auditLogs.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-slate-700" data-testid="stats-biometrics">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Biometric Templates</p>
                <p className="text-3xl font-bold text-white mt-1">{biometrics.length}</p>
              </div>
              <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="users" data-testid="tab-users">Enrolled Users</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="biometrics" data-testid="tab-biometrics">Biometric Templates</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="glass-card border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Enrolled Users</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-slate-400">Loading...</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No users enrolled yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Name</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Account Number</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Email</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Balance</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Enrolled</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user, index) => (
                          <tr 
                            key={user.id || index} 
                            className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                            data-testid={`user-row-${index}`}
                          >
                            <td className="py-3 px-4 text-white">{user.name}</td>
                            <td className="py-3 px-4 text-white font-mono">{user.account_number}</td>
                            <td className="py-3 px-4 text-slate-300">{user.email}</td>
                            <td className="py-3 px-4 text-green-400 font-semibold">
                              ${(user.balance || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-sm">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="logs">
            <Card className="glass-card border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-slate-400">Loading...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No audit logs yet</div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {auditLogs.map((log, index) => (
                      <div
                        key={log.id || index}
                        className="p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                        data-testid={`audit-log-${index}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              log.success 
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {log.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-semibold">{log.event_type}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  log.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {log.success ? 'Success' : 'Failed'}
                                </span>
                              </div>
                              <div className="text-sm text-slate-400 mt-1">
                                Account: {log.account_number || 'N/A'} | Device: {log.device_info}
                              </div>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="text-xs text-slate-500 mt-2 font-mono bg-slate-900/50 p-2 rounded">
                                  {JSON.stringify(log.details, null, 2)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 text-right ml-4">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Biometrics Tab */}
          <TabsContent value="biometrics">
            <Card className="glass-card border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Biometric Templates Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-slate-400">Loading...</div>
                ) : biometrics.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No biometric templates yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Account Number</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Quality Score</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Frames Used</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Algorithm</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {biometrics.map((bio, index) => (
                          <tr 
                            key={bio.id || index} 
                            className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                            data-testid={`biometric-row-${index}`}
                          >
                            <td className="py-3 px-4 text-white font-mono">{bio.account_number}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                bio.template_meta?.quality_score >= 0.7 
                                  ? 'bg-green-500/20 text-green-400'
                                  : bio.template_meta?.quality_score >= 0.5
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {((bio.template_meta?.quality_score || 0) * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{bio.template_meta?.num_frames || 0}</td>
                            <td className="py-3 px-4 text-slate-300 text-sm">
                              {bio.template_meta?.algorithm || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-sm">
                              {new Date(bio.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h4 className="text-white font-semibold mb-2 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-cyan-400" />
                        Security Notice
                      </h4>
                      <p className="text-sm text-slate-300">
                        This view shows only metadata. Actual biometric templates are encrypted with AES-256 and never displayed in plain form.
                        All templates are irreversible and cannot be reconstructed to original iris images.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
