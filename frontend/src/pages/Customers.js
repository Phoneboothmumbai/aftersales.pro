import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Users,
  Search,
  Phone,
  Mail,
  Smartphone,
  Laptop,
  Tablet,
  HardDrive,
  ChevronRight,
  ChevronDown,
  Calendar,
  Wrench,
  History,
  UserPlus,
  Repeat,
  Loader2,
  ExternalLink,
  MoreVertical,
  Receipt,
  CreditCard,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Plus,
} from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, PAYMENT_MODES } from "../lib/utils";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const deviceIcons = {
  Mobile: Smartphone,
  Laptop: Laptop,
  Tablet: Tablet,
  Other: HardDrive,
};

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Expanded states
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [customerDevices, setCustomerDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  
  // Device history modal
  const [historyModal, setHistoryModal] = useState(false);
  const [deviceHistory, setDeviceHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Ledger modal
  const [ledgerModal, setLedgerModal] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_mode: "",
    payment_reference: "",
    notes: "",
    job_id: "",
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      
      const response = await axios.get(`${API}/customers?${params.toString()}`);
      setCustomers(response.data.customers);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/customers/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const toggleCustomerExpand = async (mobile) => {
    if (expandedCustomer === mobile) {
      setExpandedCustomer(null);
      setCustomerDevices([]);
      return;
    }

    setExpandedCustomer(mobile);
    setLoadingDevices(true);
    try {
      const response = await axios.get(`${API}/customers/${encodeURIComponent(mobile)}/devices`);
      setCustomerDevices(response.data.devices);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      setCustomerDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const openDeviceHistory = async (mobile, serialImei) => {
    setHistoryModal(true);
    setLoadingHistory(true);
    try {
      const response = await axios.get(
        `${API}/customers/${encodeURIComponent(mobile)}/devices/${encodeURIComponent(serialImei)}/history`
      );
      setDeviceHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setDeviceHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeHistory = () => {
    setHistoryModal(false);
    setDeviceHistory(null);
  };

  // Ledger functions
  const openLedger = async (customer) => {
    setSelectedCustomer(customer);
    setLedgerModal(true);
    setLoadingLedger(true);
    try {
      const response = await axios.get(`${API}/customers/${encodeURIComponent(customer.mobile)}/ledger`);
      setLedgerData(response.data);
    } catch (error) {
      console.error("Failed to fetch ledger:", error);
      toast.error("Failed to load customer ledger");
      setLedgerData(null);
    } finally {
      setLoadingLedger(false);
    }
  };

  const closeLedger = () => {
    setLedgerModal(false);
    setLedgerData(null);
    setSelectedCustomer(null);
  };

  // Payment functions
  const openPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    setPaymentForm({
      amount: "",
      payment_mode: "",
      payment_reference: "",
      notes: "",
      job_id: "",
    });
    setPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || !paymentForm.payment_mode) {
      toast.error("Please fill amount and payment mode");
      return;
    }

    setPaymentLoading(true);
    try {
      await axios.post(`${API}/customers/${encodeURIComponent(selectedCustomer.mobile)}/payment`, {
        customer_id: selectedCustomer.mobile,
        amount: parseFloat(paymentForm.amount),
        payment_mode: paymentForm.payment_mode,
        payment_reference: paymentForm.payment_reference || null,
        notes: paymentForm.notes || null,
        job_id: paymentForm.job_id || null,
      });
      toast.success("Payment recorded successfully");
      setPaymentModal(false);
      // Refresh ledger if open
      if (ledgerModal && selectedCustomer) {
        openLedger(selectedCustomer);
      }
      // Refresh customers list
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  const getDeviceIcon = (type) => {
    return deviceIcons[type] || HardDrive;
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case "payment":
        return CheckCircle;
      case "job":
        return Wrench;
      case "job_pending":
        return Clock;
      default:
        return FileText;
    }
  };

  const getTransactionColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-600";
      case "credit":
        return "bg-orange-500/10 text-orange-600";
      case "payment_received":
        return "bg-blue-500/10 text-blue-600";
      case "pending_delivery":
        return "bg-yellow-500/10 text-yellow-600";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="customers-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">View customer history, device repairs, and ledger</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_customers}</p>
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Repeat className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.repeat_customers}</p>
                    <p className="text-sm text-muted-foreground">Repeat Customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.new_customers_this_month}</p>
                    <p className="text-sm text-muted-foreground">New This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.customers_with_credit || 0}</p>
                    <p className="text-sm text-muted-foreground">With Outstanding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, mobile, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="customer-search-input"
                />
              </div>
              <Button type="submit" data-testid="search-btn">
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Customers List */}
        <Card className="card-shadow">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No customers found</h3>
                <p className="text-muted-foreground">
                  {search ? "Try a different search term" : "Customers will appear here after creating jobs"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-center">Devices</TableHead>
                    <TableHead className="text-center">Total Jobs</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <React.Fragment key={customer.mobile}>
                      {/* Customer Row */}
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleCustomerExpand(customer.mobile)}
                        data-testid={`customer-row-${customer.mobile}`}
                      >
                        <TableCell>
                          {expandedCustomer === customer.mobile ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{customer.name}</p>
                          {customer.total_jobs > 1 && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              <Repeat className="w-3 h-3 mr-1" />
                              Repeat Customer
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {customer.mobile}
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{customer.device_count}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {customer.total_jobs}
                        </TableCell>
                        <TableCell className="text-right">
                          {(customer.outstanding_balance || 0) > 0 ? (
                            <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20">
                              <IndianRupee className="w-3 h-3 mr-1" />
                              {customer.outstanding_balance?.toLocaleString()}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(customer.last_visit)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openLedger(customer)}>
                                <Receipt className="w-4 h-4 mr-2" />
                                View Statement
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPaymentModal(customer)}>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Record Payment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Devices Section */}
                      {expandedCustomer === customer.mobile && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                Devices ({customerDevices.length})
                              </h4>
                              {loadingDevices ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                </div>
                              ) : customerDevices.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No devices found</p>
                              ) : (
                                <div className="grid gap-3">
                                  {customerDevices.map((device) => {
                                    const DeviceIconComponent = getDeviceIcon(device.device_type);
                                    return (
                                    <div
                                      key={device.serial_imei || device.brand + device.model}
                                      className="flex items-center justify-between p-3 bg-background rounded-lg border cursor-pointer hover:border-primary/50 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (device.serial_imei) {
                                          openDeviceHistory(customer.mobile, device.serial_imei);
                                        }
                                      }}
                                      data-testid={`device-${device.serial_imei || 'unknown'}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                          <DeviceIconComponent className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <p className="font-medium">
                                            {device.brand} {device.model}
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            {device.device_type} {device.serial_imei ? `• ${device.serial_imei}` : ''}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <p className="text-sm">
                                            <span className="text-muted-foreground">Repairs:</span>{" "}
                                            <span className="font-medium">{device.total_repairs}</span>
                                          </p>
                                          <Badge className={getStatusColor(device.latest_status)}>
                                            {getStatusLabel(device.latest_status)}
                                          </Badge>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device History Modal */}
      <Dialog open={historyModal} onOpenChange={closeHistory}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Device Repair History
            </DialogTitle>
          </DialogHeader>
          
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : deviceHistory ? (
            <div className="space-y-6">
              {/* Customer & Device Info */}
              <div className="grid sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Customer</h4>
                  <p className="font-medium">{deviceHistory.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{deviceHistory.customer.mobile}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Device</h4>
                  <p className="font-medium">
                    {deviceHistory.device.brand} {deviceHistory.device.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {deviceHistory.device.device_type} • {deviceHistory.device.serial_imei}
                  </p>
                </div>
              </div>

              {/* Repair History */}
              <div>
                <h4 className="font-medium mb-3">
                  Repair History ({deviceHistory.total_repairs} repairs)
                </h4>
                <div className="space-y-4">
                  {deviceHistory.history.map((job, index) => (
                    <Card key={job.id} className="overflow-hidden">
                      <CardHeader className="py-3 px-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {job.job_number}
                            </Badge>
                            <Badge className={getStatusColor(job.status)}>
                              {getStatusLabel(job.status)}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            data-testid={`view-job-${job.id}`}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4 space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Problem</p>
                          <p className="text-sm">{job.problem_description}</p>
                        </div>
                        {job.diagnosis && (
                          <div>
                            <p className="text-sm text-muted-foreground">Diagnosis</p>
                            <p className="text-sm">{job.diagnosis.diagnosis}</p>
                          </div>
                        )}
                        {job.repair && (
                          <div>
                            <p className="text-sm text-muted-foreground">Work Done</p>
                            <p className="text-sm">{job.repair.work_done}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Created: {formatDate(job.created_at)}
                          </span>
                          {job.repair?.final_amount && (
                            <span className="flex items-center gap-1">
                              <Wrench className="w-3 h-3" />
                              Amount: {formatCurrency(job.repair.final_amount)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Failed to load device history
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Ledger Modal */}
      <Dialog open={ledgerModal} onOpenChange={closeLedger}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Customer Statement
            </DialogTitle>
          </DialogHeader>
          
          {loadingLedger ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : ledgerData ? (
            <div className="space-y-6">
              {/* Customer Summary */}
              <div className="grid sm:grid-cols-4 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-semibold">{ledgerData.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{ledgerData.customer_mobile}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Total Billed</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(ledgerData.total_billed)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Total Received</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(ledgerData.total_received)}</p>
                  </CardContent>
                </Card>
                <Card className={ledgerData.outstanding_balance > 0 ? "bg-orange-500/10" : "bg-gray-500/10"}>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className={`text-xl font-bold ${ledgerData.outstanding_balance > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {formatCurrency(ledgerData.outstanding_balance)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Action Button */}
              {ledgerData.outstanding_balance > 0 && (
                <div className="flex justify-end">
                  <Button onClick={() => openPaymentModal(selectedCustomer)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              )}

              {/* Transactions Table */}
              <div>
                <h4 className="font-medium mb-3">Transactions</h4>
                {ledgerData.transactions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No transactions found</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead className="text-right">Billed</TableHead>
                          <TableHead className="text-right">Received</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerData.transactions.map((txn) => {
                          const TxnIcon = getTransactionIcon(txn.type);
                          return (
                            <TableRow key={txn.id}>
                              <TableCell className="text-sm">
                                {txn.date ? formatDate(txn.date) : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <TxnIcon className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm capitalize">{txn.type.replace('_', ' ')}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  {txn.job_number && (
                                    <Badge variant="outline" className="font-mono text-xs mb-1">
                                      {txn.job_number}
                                    </Badge>
                                  )}
                                  <p className="text-sm">{txn.device}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {txn.problem}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {txn.billed_amount > 0 ? formatCurrency(txn.billed_amount) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {txn.received_amount > 0 ? formatCurrency(txn.received_amount) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-medium text-orange-600">
                                {txn.credit_amount > 0 ? formatCurrency(txn.credit_amount) : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge className={getTransactionColor(txn.status)}>
                                  {txn.status.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Failed to load customer statement
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={paymentModal} onOpenChange={setPaymentModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCustomer.mobile}</p>
                {selectedCustomer.outstanding_balance > 0 && (
                  <p className="text-sm mt-2">
                    Outstanding: <span className="font-bold text-orange-600">{formatCurrency(selectedCustomer.outstanding_balance)}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  data-testid="payment-amount-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select
                  value={paymentForm.payment_mode}
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_mode: v })}
                >
                  <SelectTrigger data-testid="payment-mode-select">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference (Optional)</Label>
                <Input
                  value={paymentForm.payment_reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                  placeholder="Transaction ID, cheque number, etc."
                  data-testid="payment-reference-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Any additional notes"
                  data-testid="payment-notes-input"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={paymentLoading}>
              {paymentLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
