import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
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
  Smartphone,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  FileText,
  CheckCircle,
  ShoppingCart,
  XCircle,
  Package,
  Clock,
  AlertTriangle,
  IndianRupee,
  TrendingUp,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MOBILE_CATEGORIES = [
  { value: "smartphone", label: "Smartphone" },
  { value: "feature_phone", label: "Feature Phone" },
  { value: "tablet", label: "Tablet" },
  { value: "smartwatch", label: "Smartwatch" },
];

const STATUS_CONFIG = {
  pending_signature: { label: "Pending Signature", color: "bg-yellow-500", icon: Clock },
  in_stock: { label: "In Stock", color: "bg-green-500", icon: Package },
  needs_repair: { label: "Needs Repair", color: "bg-orange-500", icon: AlertTriangle },
  sold: { label: "Sold", color: "bg-blue-500", icon: ShoppingCart },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: XCircle },
};

export default function MobileTrading() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useTranslation();
  
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, [statusFilter, categoryFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (search) params.append("search", search);

      const [devicesRes, statsRes] = await Promise.all([
        axios.get(`${API}/used-devices/mobile?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/used-devices/mobile/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setDevices(devicesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="mobile-trading-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-primary" />
              Mobile Phone Trading
            </h1>
            <p className="text-muted-foreground">Buy and sell used mobile devices</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/mobile-trading/declined")}
              data-testid="view-declined-btn"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Declined Log
            </Button>
            <Button onClick={() => navigate("/mobile-trading/buy")} data-testid="buy-device-btn">
              <Plus className="w-4 h-4 mr-2" />
              Buy Device
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="card-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">In Stock</p>
                    <p className="text-2xl font-bold">{stats.in_stock}</p>
                  </div>
                  <Package className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="card-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{stats.pending_signature}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="card-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Needs Repair</p>
                    <p className="text-2xl font-bold">{stats.needs_repair}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="card-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sold (MTD)</p>
                    <p className="text-2xl font-bold">{stats.sold_this_month}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="card-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Value</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.inventory_value)}</p>
                  </div>
                  <IndianRupee className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="card-shadow">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Device ID, IMEI, Brand, Model, Seller..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_signature">Pending Signature</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="needs_repair">Needs Repair</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {MOBILE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary">
                <Filter className="w-4 h-4 mr-2" />
                Apply
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Devices Table */}
        <Card className="card-shadow">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : devices.length === 0 ? (
              <div className="p-8 text-center">
                <Smartphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No devices found</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate("/mobile-trading/buy")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Buy Your First Device
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device ID</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Days in Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => {
                    const statusConfig = STATUS_CONFIG[device.status] || STATUS_CONFIG.in_stock;
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={device.id} data-testid={`device-row-${device.device_id}`}>
                        <TableCell className="font-mono font-medium">
                          {device.device_id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{device.brand} {device.model}</p>
                            <p className="text-sm text-muted-foreground">
                              {device.variant} {device.color && `• ${device.color}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {device.imei_1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(device.purchase_price)}
                        </TableCell>
                        <TableCell>
                          <span className={device.days_in_stock > 30 ? "text-orange-500 font-medium" : ""}>
                            {device.days_in_stock} days
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${statusConfig.color} text-white`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/mobile-trading/${device.id}`)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {device.status === "pending_signature" && (
                                <>
                                  <DropdownMenuItem onClick={() => navigate(`/mobile-trading/${device.id}/declaration`)}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Generate Declaration
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/mobile-trading/${device.id}/sign`)}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mark Signed & Pay
                                  </DropdownMenuItem>
                                </>
                              )}
                              {device.status === "in_stock" && (
                                <DropdownMenuItem onClick={() => navigate(`/mobile-trading/${device.id}/sell`)}>
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Sell Device
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
