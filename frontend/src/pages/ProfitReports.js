import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Lock,
  Unlock,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  Settings,
  Eye,
  EyeOff,
  Calculator,
  FileText,
  IndianRupee,
  Wrench,
  Calendar,
} from "lucide-react";
import { formatDate, formatCurrency } from "../lib/utils";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProfitReports() {
  // Auth state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Set password state
  const [settingPassword, setSettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordModal, setPasswordModal] = useState(false);

  // Data state
  const [activeTab, setActiveTab] = useState("summary");
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState(null);
  const [jobWiseData, setJobWiseData] = useState(null);
  const [partyWiseData, setPartyWiseData] = useState(null);
  const [pendingExpenses, setPendingExpenses] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Bulk expense state
  const [expenseEdits, setExpenseEdits] = useState({});
  const [savingExpenses, setSavingExpenses] = useState(false);

  // Date filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    checkPasswordStatus();
  }, []);

  const checkPasswordStatus = async () => {
    try {
      const response = await axios.get(`${API}/settings/profit-password-status`);
      setHasPassword(response.data.has_password);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("Only admin can access profit reports");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password) {
      toast.error("Please enter password");
      return;
    }
    setVerifying(true);
    try {
      await axios.post(`${API}/settings/verify-profit-password`, { password });
      setIsUnlocked(true);
      toast.success("Access granted");
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid password");
    } finally {
      setVerifying(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSettingPassword(true);
    try {
      await axios.post(`${API}/settings/profit-password`, { password: newPassword });
      toast.success("Profit section password set successfully");
      setHasPassword(true);
      setPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to set password");
    } finally {
      setSettingPassword(false);
    }
  };

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        fetchSummary(),
        fetchJobWise(),
        fetchPartyWise(),
        fetchPendingExpenses(),
      ]);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/profit/summary?period=${period}`);
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  const fetchJobWise = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const response = await axios.get(`${API}/profit/job-wise?${params.toString()}`);
      setJobWiseData(response.data);
    } catch (error) {
      console.error("Failed to fetch job-wise data:", error);
    }
  };

  const fetchPartyWise = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const response = await axios.get(`${API}/profit/party-wise?${params.toString()}`);
      setPartyWiseData(response.data);
    } catch (error) {
      console.error("Failed to fetch party-wise data:", error);
    }
  };

  const fetchPendingExpenses = async () => {
    try {
      const response = await axios.get(`${API}/profit/pending-expenses`);
      setPendingExpenses(response.data);
      // Initialize expense edits
      const edits = {};
      response.data.jobs.forEach((job) => {
        edits[job.id] = {
          expense_parts: job.delivery?.expense_parts || "",
          expense_labor: job.delivery?.expense_labor || "",
        };
      });
      setExpenseEdits(edits);
    } catch (error) {
      console.error("Failed to fetch pending expenses:", error);
    }
  };

  const handleExpenseChange = (jobId, field, value) => {
    setExpenseEdits((prev) => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        [field]: value,
      },
    }));
  };

  const handleSaveBulkExpenses = async () => {
    // Filter jobs that have expenses entered
    const expensesToSave = Object.entries(expenseEdits)
      .filter(([_, values]) => values.expense_parts || values.expense_labor)
      .map(([jobId, values]) => ({
        job_id: jobId,
        expense_parts: parseFloat(values.expense_parts) || 0,
        expense_labor: parseFloat(values.expense_labor) || 0,
      }));

    if (expensesToSave.length === 0) {
      toast.error("No expenses entered to save");
      return;
    }

    setSavingExpenses(true);
    try {
      const response = await axios.put(`${API}/profit/bulk-expense`, {
        expenses: expensesToSave,
      });
      toast.success(response.data.message);
      if (response.data.errors.length > 0) {
        response.data.errors.forEach((err) => toast.error(err));
      }
      // Refresh data
      await fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save expenses");
    } finally {
      setSavingExpenses(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    if (isUnlocked && (dateFrom || dateTo)) {
      fetchJobWise();
      fetchPartyWise();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Password not set - show setup UI
  if (!hasPassword) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-20">
          <Card className="card-shadow">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Set Profit Section Password</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                To protect your financial data, please set a password for the profit reports section.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter password (min 4 chars)"
                    data-testid="new-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  data-testid="confirm-password-input"
                />
              </div>
              <Button
                onClick={handleSetPassword}
                disabled={settingPassword}
                className="w-full"
                data-testid="set-password-btn"
              >
                {settingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Set Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Password set but not unlocked - show login UI
  if (!isUnlocked) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-20">
          <Card className="card-shadow">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Profit Reports</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your password to access profit tracking and reports.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter profit section password"
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                onClick={handleVerifyPassword}
                disabled={verifying}
                className="w-full"
                data-testid="unlock-btn"
              >
                {verifying ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Unlock className="w-4 h-4 mr-2" />
                )}
                Unlock
              </Button>
              <div className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setPasswordModal(true)}
                  className="text-xs text-muted-foreground"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Change Password Modal */}
        <Dialog open={passwordModal} onOpenChange={setPasswordModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Profit Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetPassword} disabled={settingPassword}>
                {settingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Update Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  // Unlocked - show profit reports
  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="profit-reports-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-green-500" />
              Profit Reports
            </h1>
            <p className="text-muted-foreground">Track expenses and profit for your repair jobs</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPasswordModal(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsUnlocked(false)}
            >
              <Lock className="w-4 h-4 mr-2" />
              Lock
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-shadow bg-blue-500/10 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(summary.total_received)}</p>
                    <p className="text-sm text-muted-foreground">Total Received</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow bg-orange-500/10 border-orange-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(summary.total_expense)}</p>
                    <p className="text-sm text-muted-foreground">Total Expense</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow bg-green-500/10 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_profit)}</p>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow bg-purple-500/10 border-purple-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{summary.profit_margin}%</p>
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Period Selector */}
        <div className="flex items-center gap-4">
          <Label className="text-sm">Period:</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          {summary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{summary.total_jobs} jobs</span>
              {summary.jobs_pending_expense > 0 && (
                <Badge variant="outline" className="text-orange-500 border-orange-500">
                  {summary.jobs_pending_expense} pending expense
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="job-wise" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Job-wise
            </TabsTrigger>
            <TabsTrigger value="party-wise" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Party-wise
            </TabsTrigger>
            <TabsTrigger value="bulk-expense" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Add Expenses
              {pendingExpenses?.count > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingExpenses.count}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-6">
            {summary && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Expense Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Parts/Materials</span>
                      <span className="font-semibold">{formatCurrency(summary.total_expense_parts)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Labor Cost</span>
                      <span className="font-semibold">{formatCurrency(summary.total_expense_labor)}</span>
                    </div>
                    <div className="border-t pt-4 flex justify-between items-center">
                      <span className="font-medium">Total Expense</span>
                      <span className="font-bold text-lg">{formatCurrency(summary.total_expense)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Job Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Jobs Completed</span>
                      <span className="font-semibold">{summary.total_jobs}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Jobs with Expense Data</span>
                      <span className="font-semibold text-green-600">{summary.jobs_with_expense}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pending Expense Entry</span>
                      <span className="font-semibold text-orange-500">{summary.jobs_pending_expense}</span>
                    </div>
                    <div className="border-t pt-4 flex justify-between items-center">
                      <span className="font-medium">Avg Profit per Job</span>
                      <span className="font-bold text-lg text-green-600">
                        {formatCurrency(summary.total_jobs > 0 ? summary.total_profit / summary.total_jobs : 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Job-wise Tab */}
          <TabsContent value="job-wise" className="mt-6">
            {/* Date Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">From:</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">To:</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                  Clear
                </Button>
              )}
            </div>

            <Card className="card-shadow">
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : jobWiseData?.jobs?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No delivered jobs found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Parts</TableHead>
                        <TableHead className="text-right">Labor</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobWiseData?.jobs?.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{job.job_number}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{job.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{job.customer_mobile}</p>
                          </TableCell>
                          <TableCell>{job.device}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(job.amount_received)}
                          </TableCell>
                          <TableCell className="text-right">
                            {job.expense_parts > 0 ? formatCurrency(job.expense_parts) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {job.expense_labor > 0 ? formatCurrency(job.expense_labor) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {job.has_expense ? (
                              <span className={`font-bold ${job.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(job.profit)}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-orange-500">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(job.delivered_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              {jobWiseData?.summary && (
                <div className="border-t p-4 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Totals ({jobWiseData.summary.total_jobs} jobs)</span>
                    <div className="flex gap-8">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Received</p>
                        <p className="font-bold">{formatCurrency(jobWiseData.summary.total_received)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Expense</p>
                        <p className="font-bold">{formatCurrency(jobWiseData.summary.total_expense)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Profit</p>
                        <p className="font-bold text-green-600">{formatCurrency(jobWiseData.summary.total_profit)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Party-wise Tab */}
          <TabsContent value="party-wise" className="mt-6">
            <Card className="card-shadow">
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : partyWiseData?.parties?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No customer data found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-center">Jobs</TableHead>
                        <TableHead className="text-right">Total Received</TableHead>
                        <TableHead className="text-right">Total Expense</TableHead>
                        <TableHead className="text-right">Total Profit</TableHead>
                        <TableHead>Last Visit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partyWiseData?.parties?.map((party, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <p className="font-medium">{party.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{party.customer_mobile}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{party.total_jobs}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(party.total_received)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(party.total_expense)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold ${party.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(party.profit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(party.last_visit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              {partyWiseData?.summary && (
                <div className="border-t p-4 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Totals ({partyWiseData.summary.total_customers} customers)</span>
                    <div className="flex gap-8">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Received</p>
                        <p className="font-bold">{formatCurrency(partyWiseData.summary.total_received)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Expense</p>
                        <p className="font-bold">{formatCurrency(partyWiseData.summary.total_expense)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Profit</p>
                        <p className="font-bold text-green-600">{formatCurrency(partyWiseData.summary.total_profit)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Bulk Expense Entry Tab */}
          <TabsContent value="bulk-expense" className="mt-6">
            <Card className="card-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Add Expenses for Delivered Jobs</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter parts and labor cost for jobs without expense data
                  </p>
                </div>
                <Button
                  onClick={handleSaveBulkExpenses}
                  disabled={savingExpenses}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {savingExpenses ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save All Expenses
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : pendingExpenses?.jobs?.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-muted-foreground text-sm">All delivered jobs have expense data entered.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead className="text-right">Amount Received</TableHead>
                        <TableHead className="w-32">Parts Cost (₹)</TableHead>
                        <TableHead className="w-32">Labor Cost (₹)</TableHead>
                        <TableHead className="text-right">Est. Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingExpenses?.jobs?.map((job) => {
                        const received = job.delivery?.amount_received || 0;
                        const parts = parseFloat(expenseEdits[job.id]?.expense_parts) || 0;
                        const labor = parseFloat(expenseEdits[job.id]?.expense_labor) || 0;
                        const profit = received - parts - labor;
                        
                        return (
                          <TableRow key={job.id}>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">{job.job_number}</Badge>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{job.customer?.name}</p>
                            </TableCell>
                            <TableCell>
                              {job.device?.brand} {job.device?.model}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(received)}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={expenseEdits[job.id]?.expense_parts || ""}
                                onChange={(e) => handleExpenseChange(job.id, "expense_parts", e.target.value)}
                                placeholder="0"
                                className="h-8"
                                data-testid={`parts-${job.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={expenseEdits[job.id]?.expense_labor || ""}
                                onChange={(e) => handleExpenseChange(job.id, "expense_labor", e.target.value)}
                                placeholder="0"
                                className="h-8"
                                data-testid={`labor-${job.id}`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {(parts > 0 || labor > 0) ? (
                                <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(profit)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Change Password Modal */}
        <Dialog open={passwordModal} onOpenChange={setPasswordModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Profit Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetPassword} disabled={settingPassword}>
                {settingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Update Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
