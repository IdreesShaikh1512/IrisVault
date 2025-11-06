import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { LogOut, DollarSign, CreditCard, TrendingUp, TrendingDown, Eye, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user;
  
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState('');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/atm');
      return;
    }
    fetchBalance();
    fetchTransactions();
  }, [user, navigate]);

  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${API}/account/${user.account_number}/balance`);
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Balance fetch error:', error);
      toast.error('Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions/${user.account_number}?limit=10`);
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Transactions fetch error:', error);
    }
  };

  const openTransactionDialog = (type) => {
    setTransactionType(type);
    setAmount('');
    setShowTransactionDialog(true);
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setProcessing(true);
    
    try {
      const response = await axios.post(`${API}/transaction`, {
        account_number: user.account_number,
        type: transactionType,
        amount: amountNum
      });
      
      if (response.data.success) {
        toast.success(`${transactionType === 'withdraw' ? 'Withdrawal' : 'Deposit'} successful!`);
        setBalance(response.data.balance);
        setShowTransactionDialog(false);
        fetchTransactions();
      }
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error(error.response?.data?.detail || 'Transaction failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckBalance = () => {
    toast.info(`Current Balance: $${balance.toFixed(2)}`, {
      duration: 3000
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Account Dashboard</h1>
            <p className="text-slate-400 mt-1">Welcome back, {user.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <Card className="md:col-span-2 glass-card border-slate-700" data-testid="balance-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-cyan-400" />
              Account Balance
            </CardTitle>
            <CardDescription className="text-slate-400">
              Account: {user.account_number}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-5xl font-bold text-white mb-2" data-testid="balance-amount">
                    ${balance.toFixed(2)}
                  </div>
                  <div className="text-sm text-slate-400">Available Balance</div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => openTransactionDialog('withdraw')}
                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                    data-testid="withdraw-button"
                  >
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                  <Button
                    onClick={() => openTransactionDialog('deposit')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    data-testid="deposit-button"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Deposit
                  </Button>
                  <Button
                    onClick={handleCheckBalance}
                    variant="outline"
                    className="flex-1"
                    data-testid="check-balance-button"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Check
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card className="glass-card border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-slate-400">Account Holder</div>
              <div className="text-white font-semibold">{user.name}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Account Number</div>
              <div className="text-white font-mono">{user.account_number}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Auth Method</div>
              <div className="text-cyan-400 font-semibold flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                Iris Biometric
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="md:col-span-3 glass-card border-slate-700" data-testid="transaction-history">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <History className="w-5 h-5 mr-2 text-cyan-400" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No transactions yet</div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <div
                    key={tx.id || index}
                    className="flex justify-between items-center p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                    data-testid={`transaction-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'withdraw' 
                          ? 'bg-red-500/20 text-red-400'
                          : tx.type === 'deposit'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {tx.type === 'withdraw' ? <TrendingDown className="w-5 h-5" /> : 
                         tx.type === 'deposit' ? <TrendingUp className="w-5 h-5" /> : 
                         <Eye className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-white font-semibold capitalize">{tx.type}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        tx.type === 'withdraw' ? 'text-red-400' : 
                        tx.type === 'deposit' ? 'text-green-400' : 'text-white'
                      }`}>
                        {tx.type === 'withdraw' ? '-' : tx.type === 'deposit' ? '+' : ''}
                        ${tx.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">
                        Balance: ${tx.balance_after.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white" data-testid="transaction-dialog">
          <DialogHeader>
            <DialogTitle className="capitalize">{transactionType}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter the amount to {transactionType}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransaction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-800 border-slate-600 text-white pl-10"
                  data-testid="transaction-amount-input"
                  required
                />
              </div>
              {transactionType === 'withdraw' && (
                <p className="text-xs text-slate-400">
                  Available: ${balance.toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="submit"
                className={`flex-1 ${transactionType === 'withdraw' 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                }`}
                disabled={processing}
                data-testid="confirm-transaction-button"
              >
                {processing ? 'Processing...' : `Confirm ${transactionType}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTransactionDialog(false)}
                disabled={processing}
                data-testid="cancel-transaction-button"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
