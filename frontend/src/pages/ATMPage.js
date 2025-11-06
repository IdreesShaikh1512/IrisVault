import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import WebcamCapture from '../components/WebcamCapture';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Loader2, AlertCircle, Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ATMPage = () => {
  const navigate = useNavigate();
  const [accountNumber, setAccountNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackPin, setFallbackPin] = useState('');
  const [demoPin, setDemoPin] = useState('');

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    
    if (!accountNumber) {
      toast.error('Please enter account number');
      return;
    }
    
    // Check if account exists
    try {
      await axios.get(`${API}/account/${accountNumber}/balance`);
      setShowWebcam(true);
      
      // Fetch demo PIN for fallback
      const pinResponse = await axios.get(`${API}/fallback/pin/${accountNumber}`);
      setDemoPin(pinResponse.data.demo_pin);
    } catch (error) {
      toast.error('Account not found. Please enroll first.');
    }
  };

  const handleFramesCollected = async (capturedFrames) => {
    setVerifying(true);
    
    try {
      const response = await axios.post(`${API}/verify`, {
        account_number: accountNumber,
        frames: capturedFrames
      });
      
      if (response.data.success && response.data.match) {
        toast.success('Verification successful!');
        // Navigate to dashboard with user data
        navigate('/dashboard', { 
          state: { 
            user: {
              account_number: accountNumber,
              name: response.data.name,
              user_id: response.data.user_id
            }
          } 
        });
      } else {
        setVerificationFailed(true);
        const newCount = failureCount + 1;
        setFailureCount(newCount);
        
        toast.error(`Verification failed. ${response.data.reason || 'Please try again.'}`);
        
        if (newCount >= 2) {
          toast.info('Switching to fallback authentication');
          setShowFallback(true);
          setShowWebcam(false);
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.detail || 'Verification failed');
      setVerificationFailed(true);
    } finally {
      setVerifying(false);
    }
  };

  const handleFallbackSubmit = async (e) => {
    e.preventDefault();
    
    if (!fallbackPin) {
      toast.error('Please enter your fallback PIN');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/fallback/verify`, {
        account_number: accountNumber,
        fingerprint_pin: fallbackPin
      });
      
      if (response.data.success && response.data.match) {
        toast.success('Fallback verification successful!');
        navigate('/dashboard', { 
          state: { 
            user: {
              account_number: accountNumber,
              name: response.data.name,
              user_id: response.data.user_id
            }
          } 
        });
      } else {
        toast.error('Invalid PIN. Please try again.');
      }
    } catch (error) {
      toast.error('Fallback verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/10"
          data-testid="back-to-home-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">ATM Iris Login</h1>
          <p className="text-slate-400">Authenticate using your iris biometric</p>
        </div>

        {/* Account Number Input */}
        {!showWebcam && !showFallback && (
          <Card className="max-w-md mx-auto glass-card border-slate-700" data-testid="account-input-card">
            <CardHeader>
              <CardTitle className="text-white">Enter Account Number</CardTitle>
              <CardDescription className="text-slate-400">
                Enter your account number to begin verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account" className="text-white">Account Number</Label>
                  <Input
                    id="account"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="ACC123456"
                    className="bg-slate-800 border-slate-600 text-white"
                    data-testid="account-number-input"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  size="lg"
                  data-testid="start-verification-button"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Start Iris Verification
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Iris Verification */}
        {showWebcam && !showFallback && (
          <Card className="glass-card border-slate-700" data-testid="iris-verification-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Eye className="w-6 h-6 mr-3 text-cyan-400" />
                Iris Verification
              </CardTitle>
              <CardDescription className="text-slate-400">
                Position your eyes in the guide circle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {failureCount > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-orange-400 font-semibold">Verification Failed</p>
                    <p className="text-slate-300">Attempts: {failureCount}/2. After 2 failures, fallback authentication will be required.</p>
                  </div>
                </div>
              )}
              
              <WebcamCapture
                autoCapture={true}
                targetFrames={3}
                onFramesCollected={handleFramesCollected}
              />
              
              {verifying && (
                <div className="flex items-center justify-center space-x-3 text-cyan-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying biometric data...</span>
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowWebcam(false);
                  setAccountNumber('');
                  setVerificationFailed(false);
                  setFailureCount(0);
                }}
                className="w-full"
                data-testid="cancel-verification-button"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Fallback Authentication */}
        {showFallback && (
          <Card className="max-w-md mx-auto glass-card border-slate-700" data-testid="fallback-auth-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="w-6 h-6 mr-3 text-orange-400" />
                Fallback Authentication
              </CardTitle>
              <CardDescription className="text-slate-400">
                Iris verification failed. Please use your fallback PIN.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFallbackSubmit} className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
                  <p className="text-blue-300 mb-2"><strong>Demo Mode:</strong></p>
                  <p className="text-slate-300">Your fallback PIN for account <strong>{accountNumber}</strong> is:</p>
                  <p className="text-cyan-400 font-mono text-lg font-bold mt-2">{demoPin}</p>
                  <p className="text-xs text-slate-400 mt-2">Note: In production, this would be sent via SMS/Email</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fallback-pin" className="text-white">Enter Fallback PIN</Label>
                  <Input
                    id="fallback-pin"
                    type="text"
                    value={fallbackPin}
                    onChange={(e) => setFallbackPin(e.target.value)}
                    placeholder="Enter 6-digit PIN"
                    className="bg-slate-800 border-slate-600 text-white font-mono"
                    data-testid="fallback-pin-input"
                    maxLength={6}
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  size="lg"
                  data-testid="submit-fallback-button"
                >
                  Verify with PIN
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFallback(false);
                    setShowWebcam(true);
                    setFailureCount(0);
                    setFallbackPin('');
                  }}
                  className="w-full"
                  data-testid="retry-iris-button"
                >
                  Retry Iris Verification
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ATMPage;
