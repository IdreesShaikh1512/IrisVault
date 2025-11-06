import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import WebcamCapture from '../components/WebcamCapture';
import { toast } from 'sonner';
import { ArrowLeft, Check, Eye, User, Mail, CreditCard, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnrollmentPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    account_number: '',
    email: '',
    consent: false
  });
  
  const [frames, setFrames] = useState([]);
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.account_number || !formData.email) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (!formData.consent) {
      toast.error('You must accept biometric consent to continue');
      return;
    }
    
    setStep(2);
  };

  const handleFramesCollected = async (capturedFrames) => {
    setFrames(capturedFrames);
    
    // Auto-submit when frames are collected
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/enroll`, {
        name: formData.name,
        account_number: formData.account_number,
        email: formData.email,
        consent: formData.consent,
        frames: capturedFrames
      });
      
      if (response.data.success) {
        setEnrollmentResult(response.data);
        setStep(3);
        toast.success('Enrollment successful!');
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      toast.error(error.response?.data?.detail || 'Enrollment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <Button
          variant="ghost"
          onClick={() => step === 1 ? navigate('/') : setStep(step - 1)}
          className="text-white hover:bg-white/10"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step >= s
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                  data-testid={`step-${s}-indicator`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                <span className="ml-2 text-sm font-medium">
                  {s === 1 ? 'Details' : s === 2 ? 'Biometric' : 'Complete'}
                </span>
              </div>
              {s < 3 && (
                <div className={`h-1 w-20 rounded-full ${
                  step > s ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-slate-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Personal Details */}
      {step === 1 && (
        <Card className="max-w-2xl mx-auto glass-card border-slate-700" data-testid="enrollment-step-1">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center">
              <User className="w-6 h-6 mr-3 text-blue-400" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter your details to begin enrollment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-slate-800 border-slate-600 text-white"
                  data-testid="input-name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_number" className="text-white">Account Number</Label>
                <Input
                  id="account_number"
                  name="account_number"
                  placeholder="ACC123456"
                  value={formData.account_number}
                  onChange={handleInputChange}
                  className="bg-slate-800 border-slate-600 text-white"
                  data-testid="input-account-number"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="[email protected]"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-slate-800 border-slate-600 text-white"
                  data-testid="input-email"
                  required
                />
              </div>
              
              <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-white flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-cyan-400" />
                  Biometric Consent
                </h4>
                <p className="text-sm text-slate-300">
                  I consent to the collection and processing of my iris biometric data for authentication purposes. 
                  I understand that only encrypted templates will be stored, never raw images.
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="consent"
                    checked={formData.consent}
                    onCheckedChange={(checked) => setFormData({ ...formData, consent: checked })}
                    data-testid="consent-checkbox"
                  />
                  <label htmlFor="consent" className="text-sm text-white cursor-pointer">
                    I accept the biometric consent terms
                  </label>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                size="lg"
                data-testid="continue-to-biometric-button"
              >
                Continue to Biometric Capture
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Biometric Capture */}
      {step === 2 && (
        <Card className="max-w-4xl mx-auto glass-card border-slate-700" data-testid="enrollment-step-2">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center">
              <Eye className="w-6 h-6 mr-3 text-cyan-400" />
              Iris Biometric Capture
            </CardTitle>
            <CardDescription className="text-slate-400">
              Position your eyes in the guide and capture 5 frames
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Instructions:</h4>
              <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                <li>Position your face so your eyes are centered in the circular guide</li>
                <li>Look directly at the camera</li>
                <li>Ensure good lighting (avoid backlighting)</li>
                <li>Click "Start Capture" to begin automatic capture</li>
                <li>Do 2-3 slow blinks during capture</li>
              </ul>
            </div>
            
            <WebcamCapture
              autoCapture={true}
              targetFrames={5}
              onFramesCollected={handleFramesCollected}
            />
            
            {loading && (
              <div className="flex items-center justify-center space-x-3 text-cyan-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing biometric template...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Success */}
      {step === 3 && enrollmentResult && (
        <Card className="max-w-2xl mx-auto glass-card border-slate-700" data-testid="enrollment-step-3">
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Enrollment Successful!</h2>
              <p className="text-slate-400">Your biometric template has been securely stored</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-6 space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Account Number:</span>
                <span className="text-white font-semibold">{enrollmentResult.account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quality Score:</span>
                <span className="text-white font-semibold">{(enrollmentResult.quality_score * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Enrollment ID:</span>
                <span className="text-white font-mono text-sm">{enrollmentResult.enrollment_id.slice(0, 16)}...</span>
              </div>
            </div>
            
            <div className="flex gap-3 justify-center pt-4">
              <Button
                onClick={() => navigate('/atm')}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                size="lg"
                data-testid="goto-atm-button"
              >
                Go to ATM Login
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                size="lg"
                data-testid="goto-home-button"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnrollmentPage;
