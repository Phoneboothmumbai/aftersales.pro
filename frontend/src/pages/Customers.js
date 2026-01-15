import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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
} from "../components/ui/dialog";
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
  X,
} from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel } from "../lib/utils";

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

  const getDeviceIcon = (type) => {
    return deviceIcons[type] || HardDrive;
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="customers-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">View customer history and device repairs</p>
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
                    <Repeat className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.repeat_rate}%</p>
                    <p className="text-sm text-muted-foreground">Repeat Rate</p>
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
                    <TableHead>Last Visit</TableHead>
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
                        <TableCell className="text-muted-foreground">
                          {formatDate(customer.last_visit)}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Devices Section */}
                      {expandedCustomer === customer.mobile && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-0">
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
                                      key={device.serial_imei}
                                      className="flex items-center justify-between p-3 bg-background rounded-lg border cursor-pointer hover:border-primary/50 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDeviceHistory(customer.mobile, device.serial_imei);
                                      }}
                                      data-testid={`device-${device.serial_imei}`}
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
                                            {device.device_type} • {device.serial_imei}
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
                              Amount: ₹{job.repair.final_amount}
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
    </Layout>
  );
}
