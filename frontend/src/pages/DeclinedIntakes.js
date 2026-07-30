import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { toast } from "sonner";
import {
  Smartphone,
  Monitor,
  ArrowLeft,
  Plus,
  Search,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Loader2,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MOBILE_CATEGORIES = [
  { value: "smartphone", label: "Smartphone" },
  { value: "feature_phone", label: "Feature Phone" },
  { value: "tablet", label: "Tablet" },
  { value: "smartwatch", label: "Smartwatch" },
];

const IT_CATEGORIES = [
  { value: "laptop", label: "Laptop" },
  { value: "desktop", label: "Desktop / PC" },
  { value: "monitor", label: "Monitor" },
  { value: "printer", label: "Printer / Scanner" },
  { value: "networking", label: "Networking" },
  { value: "storage", label: "Storage" },
  { value: "component", label: "Components" },
  { value: "ups_power", label: "UPS / Power" },
  { value: "peripheral", label: "Peripherals" },
  { value: "other_it", label: "Other IT" },
];

const DECLINE_REASONS = [
  "Suspicious ownership - seller couldn't verify",
  "Device reported stolen/lost",
  "IMEI blocked/blacklisted",
  "Price disagreement",
  "Device has loan/EMI pending",
  "FRP/iCloud lock present",
  "Device too damaged",
  "Fake/counterfeit device",
  "Seller wanted cash only (not available)",
  "Other",
];

export default function DeclinedIntakes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  
  const isMobile = location.pathname.includes("mobile-trading");
  const categories = isMobile ? MOBILE_CATEGORIES : IT_CATEGORIES;
  const backPath = isMobile ? "/mobile-trading" : "/it-equipment";
  const ModuleIcon = isMobile ? Smartphone : Monitor;
  const moduleLabel = isMobile ? "Mobile Phone" : "IT Equipment";

  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    category: "",
    brand: "",
    model: "",
    imei_serial: "",
    seller_name: "",
    seller_phone: "",
    seller_id_type: "",
    seller_id_masked: "",
    reason_declined: "",
    staff_notes: "",
  });

  useEffect(() => {
    fetchIntakes();
  }, []);

  const fetchIntakes = async () => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const response = await axios.get(`${API}/declined-intakes${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIntakes(response.data);
    } catch (error) {
      console.error("Failed to fetch declined intakes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchIntakes();
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.seller_name || !formData.seller_phone || !formData.reason_declined) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/declined-intakes`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Declined intake logged successfully");
      setShowAddDialog(false);
      setFormData({
        category: "",
        brand: "",
        model: "",
        imei_serial: "",
        seller_name: "",
        seller_phone: "",
        seller_id_type: "",
        seller_id_masked: "",
        reason_declined: "",
        staff_notes: "",
      });
      fetchIntakes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to log declined intake");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="declined-intakes-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-500" />
                Declined Intake Log
              </h1>
              <p className="text-muted-foreground">
                Devices that were not purchased due to issues
              </p>
            </div>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="log-declined-btn">
                <Plus className="w-4 h-4 mr-2" />
                Log Declined Intake
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Log Declined Intake</DialogTitle>
                <DialogDescription>
                  Record a device that was not purchased for compliance tracking
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger data-testid="declined-category-select"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      placeholder="e.g., Apple, Dell"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      placeholder="e.g., iPhone 13"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IMEI / Serial (if captured)</Label>
                    <Input
                      placeholder="Optional"
                      value={formData.imei_serial}
                      onChange={(e) => setFormData({ ...formData, imei_serial: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-medium mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Seller Information
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Seller Name *</Label>
                      <Input
                        placeholder="Full name"
                        value={formData.seller_name}
                        onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
                        data-testid="declined-seller-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Seller Phone *</Label>
                      <Input
                        placeholder="Phone number"
                        value={formData.seller_phone}
                        onChange={(e) => setFormData({ ...formData, seller_phone: e.target.value })}
                        data-testid="declined-seller-phone-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>ID Type (if captured)</Label>
                      <Select value={formData.seller_id_type} onValueChange={(v) => setFormData({ ...formData, seller_id_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                          <SelectItem value="PAN">PAN</SelectItem>
                          <SelectItem value="DL">Driving License</SelectItem>
                          <SelectItem value="Voter">Voter ID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>ID Number (last 4 digits)</Label>
                      <Input
                        placeholder="e.g., 1234"
                        maxLength={4}
                        value={formData.seller_id_masked}
                        onChange={(e) => setFormData({ ...formData, seller_id_masked: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Decline Details
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Reason for Declining *</Label>
                      <Select value={formData.reason_declined} onValueChange={(v) => setFormData({ ...formData, reason_declined: v })}>
                        <SelectTrigger data-testid="declined-reason-select"><SelectValue placeholder="Select reason" /></SelectTrigger>
                        <SelectContent>
                          {DECLINE_REASONS.map(reason => (
                            <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Staff Notes</Label>
                      <Textarea
                        placeholder="Additional observations or details..."
                        value={formData.staff_notes}
                        onChange={(e) => setFormData({ ...formData, staff_notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={saving} data-testid="submit-declined-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Log Declined Intake
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="card-shadow">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by seller name, phone, brand, model, IMEI..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="card-shadow">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : intakes.length === 0 ? (
              <div className="p-8 text-center">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No declined intakes logged yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use this log to track devices you declined to purchase for compliance
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {intakes.map((intake) => (
                    <TableRow key={intake.id} data-testid={`declined-row-${intake.id}`}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(intake.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium capitalize">{intake.category?.replace("_", " ")}</p>
                          {(intake.brand || intake.model) && (
                            <p className="text-sm text-muted-foreground">
                              {intake.brand} {intake.model}
                            </p>
                          )}
                          {intake.imei_serial && (
                            <p className="text-xs font-mono text-muted-foreground">
                              {intake.imei_serial}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{intake.seller_name}</p>
                          <p className="text-sm text-muted-foreground">{intake.seller_phone}</p>
                          {intake.seller_id_type && (
                            <p className="text-xs text-muted-foreground">
                              {intake.seller_id_type}: ...{intake.seller_id_masked}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          {intake.reason_declined}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate">
                          {intake.staff_notes || "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
