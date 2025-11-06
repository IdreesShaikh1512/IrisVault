import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Eye, Shield, Fingerprint, Lock, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="logo">IRISVAULT</h1>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin')}
          className="text-white hover:bg-white/10"
          data-testid="admin-link"
        >
          Admin Portal
        </Button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-8 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4">
            <h2 
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight"
              data-testid="hero-title"
            >
              The Future of
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Biometric Banking
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
              Secure iris recognition technology powered by advanced computer vision.
              Your eyes are your password.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="glass-card border-slate-700 hover:border-blue-500 transition-all duration-300" data-testid="feature-iris">
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Iris Recognition</h3>
                <p className="text-sm text-slate-400">Advanced pattern matching with liveness detection</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-slate-700 hover:border-cyan-500 transition-all duration-300" data-testid="feature-security">
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Military-Grade Encryption</h3>
                <p className="text-sm text-slate-400">AES-256 encrypted biometric templates</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-slate-700 hover:border-teal-500 transition-all duration-300" data-testid="feature-fallback">
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Fingerprint className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Fallback Security</h3>
                <p className="text-sm text-slate-400">Multi-factor authentication backup</p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <Button
              size="lg"
              onClick={() => navigate('/enroll')}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-xl btn-hover"
              data-testid="enroll-button"
            >
              Enroll Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/atm')}
              className="border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white px-8 py-6 text-lg font-semibold rounded-full btn-hover"
              data-testid="atm-login-button"
            >
              <Lock className="mr-2 w-5 h-5" />
              ATM Login
            </Button>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-24 max-w-3xl mx-auto">
          <Card className="glass-card border-slate-700">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-4 text-white">Privacy & Security Commitment</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <Lock className="w-5 h-5 mr-3 mt-0.5 text-cyan-400 flex-shrink-0" />
                  <span>Your biometric data is converted to an irreversible encrypted template - never stored as raw images</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 mr-3 mt-0.5 text-cyan-400 flex-shrink-0" />
                  <span>All templates are encrypted with AES-256 encryption at rest and in transit</span>
                </li>
                <li className="flex items-start">
                  <Eye className="w-5 h-5 mr-3 mt-0.5 text-cyan-400 flex-shrink-0" />
                  <span>Liveness detection prevents photo and video replay attacks</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-slate-500 text-sm">
        <p>© 2025 IrisVault. Powered by Advanced Computer Vision.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
