import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
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
} from "../components/ui/dialog";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import {
  Smartphone,
  Monitor,
  ArrowLeft,
  Edit,
  FileText,
  CheckCircle,
  ShoppingCart,
  XCircle,
  Package,
  Clock,
  AlertTriangle,
  User,
  CreditCard,
  Calendar,
  Hash,
  Loader2,
  Save,
  IndianRupee,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  pending_signature: { label: "Pending Signature", color: "bg-yellow-500", icon: Clock },
  in_stock: { label: "In Stock", color: "bg-green-500", icon: Package },
  needs_repair: { label: "Needs Repair", color: "bg-orange-500", icon: AlertTriangle },
  sold: { label: "Sold", color: "bg-blue-500", icon: ShoppingCart },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: XCircle },
};

export default function DeviceDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { token } = useAuth();
  
  const isMobile = location.pathname.includes("mobile-trading");
  const backPath = isMobile ? "/mobile-trading" : "/it-equipment";
  const ModuleIcon = isMobile ? Smartphone : Monitor;

  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [sellData, setSellData] = useState({
    selling_price: "",
    payment_mode: "Cash",
    buyer_name: "",
    buyer_phone: "",
    buyer_address: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  
  // Password protection for margin
  const [isMarginUnlocked, setIsMarginUnlocked] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [marginPassword, setMarginPassword] = useState("");
  const [hasPasswordSet, setHasPasswordSet] = useState(true);

  useEffect(() => {
    fetchDevice();
    checkPasswordStatus();
  }, [id]);

  const checkPasswordStatus = async () => {
    try {
      const response = await axios.get(`${API}/settings/profit-password-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasPasswordSet(response.data.has_password);
      // If no password is set, margin is visible by default
      if (!response.data.has_password) {
        setIsMarginUnlocked(true);
      }
    } catch (error) {
      console.error("Failed to check password status:", error);
    }
  };

  const handleUnlockMargin = async () => {
    if (!marginPassword) {
      toast.error("Please enter your password");
      return;
    }
    try {
      await axios.post(`${API}/settings/verify-profit-password`, 
        { password: marginPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsMarginUnlocked(true);
      setShowPasswordDialog(false);
      setMarginPassword("");
      toast.success("Margin data unlocked");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid password");
    }
  };

  const fetchDevice = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/used-devices/detail/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevice(response.data);
      setEditData({
        condition_notes: response.data.condition_notes || "",
        accessories: response.data.accessories || [],
      });
    } catch (error) {
      console.error("Failed to fetch device:", error);
      toast.error("Device not found");
      navigate(backPath);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/used-devices/${device.id}`, editData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Device updated successfully");
      setEditing(false);
      fetchDevice();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update device");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDeclaration = () => {
    window.open(`${API}/used-devices/${device.id}/generate-declaration?token=${token}`, '_blank');
  };

  const handleSignDeclaration = async () => {
    try {
      await axios.post(`${API}/used-devices/${device.id}/sign-declaration`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Declaration signed! Device moved to stock.");
      fetchDevice();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to sign declaration");
    }
  };

  const handleSell = async () => {
    if (!sellData.selling_price || !sellData.buyer_name || !sellData.buyer_phone) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/used-devices/${device.id}/sell`, {
        selling_price: parseFloat(sellData.selling_price),
        payment_mode: sellData.payment_mode,
        buyer_name: sellData.buyer_name,
        buyer_phone: sellData.buyer_phone,
        buyer_address: sellData.buyer_address || null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(`Device sold! Margin: ₹${response.data.margin.toLocaleString()}`);
      setShowSellDialog(false);
      fetchDevice();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record sale");
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) {
      toast.error("Please provide a reason for cancellation");
      return;
    }
    
    try {
      await axios.post(`${API}/used-devices/${device.id}/cancel`, {
        reason: cancelReason,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Device purchase cancelled");
      setShowCancelDialog(false);
      navigate(backPath);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to cancel");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.post(`${API}/used-devices/${device.id}/update-status`, {
        status: newStatus,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      fetchDevice();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update status");
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!device) return null;

  const statusConfig = STATUS_CONFIG[device.status] || STATUS_CONFIG.in_stock;
  const StatusIcon = statusConfig.icon;
  const canEdit = device.status === "pending_signature";
  const canSell = device.status === "in_stock";
  const canCancel = !["sold", "cancelled"].includes(device.status);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="device-detail-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ModuleIcon className="w-6 h-6 text-primary" />
                  {device.device_id}
                </h1>
                <Badge variant="secondary" className={`${statusConfig.color} text-white`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {device.brand} {device.model} {device.variant && `• ${device.variant}`}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {canEdit && !editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {editing && (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!editing && (
          <div className="flex flex-wrap gap-2">
            {device.status === "pending_signature" && (
              <>
                <Button variant="outline" onClick={handleGenerateDeclaration} data-testid="generate-declaration-btn">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Declaration
                </Button>
                <Button onClick={handleSignDeclaration} data-testid="sign-declaration-btn">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Signed & Release Payment
                </Button>
              </>
            )}
            {canSell && (
              <Button onClick={() => setShowSellDialog(true)} data-testid="sell-device-btn">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Sell Device
              </Button>
            )}
            {device.status === "in_stock" && (
              <Button variant="outline" onClick={() => handleStatusChange("needs_repair")}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Mark Needs Repair
              </Button>
            )}
            {device.status === "needs_repair" && (
              <Button variant="outline" onClick={() => handleStatusChange("in_stock")}>
                <Package className="w-4 h-4 mr-2" />
                Mark Ready (In Stock)
              </Button>
            )}
            {canCancel && (
              <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Purchase
              </Button>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Device Information */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{device.category.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Brand</p>
                  <p className="font-medium">{device.brand}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model</p>
                  <p className="font-medium">{device.model}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Variant</p>
                  <p className="font-medium">{device.variant || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Color</p>
                  <p className="font-medium">{device.color || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days in Stock</p>
                  <p className={`font-medium ${device.days_in_stock > 30 ? "text-orange-500" : ""}`}>
                    {device.days_in_stock} days
                  </p>
                </div>
              </div>
              
              <Separator />
              
              {/* Identification */}
              <div>
                <p className="text-muted-foreground text-sm mb-2">Identification</p>
                {device.imei_1 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono">IMEI 1: {device.imei_1}</span>
                  </div>
                )}
                {device.imei_2 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono">IMEI 2: {device.imei_2}</span>
                  </div>
                )}
                {device.serial_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono">Serial: {device.serial_number}</span>
                  </div>
                )}
                {device.mac_address && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono">MAC: {device.mac_address}</span>
                  </div>
                )}
              </div>

              {/* Specs */}
              {device.specs && Object.keys(device.specs).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Specifications</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(device.specs).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key.replace("_", " ")}: </span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Condition */}
              <Separator />
              <div>
                <p className="text-muted-foreground text-sm mb-2">Condition</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {device.physical_condition && (
                    <div>
                      <span className="text-muted-foreground">Physical: </span>
                      <span className="font-medium">{device.physical_condition}</span>
                    </div>
                  )}
                  {device.working_status && (
                    <div>
                      <span className="text-muted-foreground">Working: </span>
                      <span className="font-medium">{device.working_status}</span>
                    </div>
                  )}
                  {device.cosmetic_issues && (
                    <div>
                      <span className="text-muted-foreground">Cosmetic: </span>
                      <span className="font-medium">{device.cosmetic_issues}</span>
                    </div>
                  )}
                </div>
                
                {editing ? (
                  <div className="mt-3">
                    <Label>Condition Notes</Label>
                    <Textarea
                      value={editData.condition_notes}
                      onChange={(e) => setEditData({ ...editData, condition_notes: e.target.value })}
                      placeholder="Additional notes..."
                    />
                  </div>
                ) : device.condition_notes && (
                  <p className="mt-2 text-sm bg-muted/50 p-2 rounded">{device.condition_notes}</p>
                )}
              </div>

              {device.accessories && device.accessories.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Accessories</p>
                    <div className="flex flex-wrap gap-2">
                      {device.accessories.map((acc) => (
                        <Badge key={acc} variant="outline">{acc}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Purchase & Seller Info */}
          <div className="space-y-6">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Purchase Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Purchase Price</p>
                    <p className="font-bold text-lg">{formatCurrency(device.purchase_price)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Mode</p>
                    <p className="font-medium">{device.payment_mode}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Purchase Date</p>
                    <p className="font-medium">{device.purchase_date}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Declaration</p>
                    <p className="font-medium">
                      {device.declaration_signed ? (
                        <span className="text-green-600">✓ Signed</span>
                      ) : device.declaration_generated ? (
                        <span className="text-yellow-600">Generated (Not Signed)</span>
                      ) : (
                        <span className="text-muted-foreground">Not Generated</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Sale Info (if sold) */}
                {device.status === "sold" && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-muted-foreground text-sm">Sale Information</p>
                        {hasPasswordSet && !isMarginUnlocked && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowPasswordDialog(true)}
                            data-testid="unlock-margin-btn"
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            Unlock to see margin
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Selling Price</p>
                          {isMarginUnlocked ? (
                            <p className="font-bold text-lg text-green-600">{formatCurrency(device.selling_price)}</p>
                          ) : (
                            <p className="font-medium text-muted-foreground">••••••</p>
                          )}
                        </div>
                        <div data-testid="margin-block">
                          <p className="text-muted-foreground">Margin</p>
                          {isMarginUnlocked ? (
                            <p data-testid="margin-value" className={`font-bold text-lg ${(device.selling_price - device.purchase_price) >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(device.selling_price - device.purchase_price)}
                            </p>
                          ) : (
                            <p className="font-medium text-muted-foreground">••••••</p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sale Date</p>
                          <p className="font-medium">{device.sale_date}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Buyer</p>
                          <p className="font-medium">{device.buyer_name}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Seller Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{device.seller_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{device.seller_phone}</p>
                  </div>
                </div>
                {device.seller_address && (
                  <div>
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{device.seller_address}</p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">ID Proof Type</p>
                    <p className="font-medium">{device.id_proof_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ID Number</p>
                    <p className="font-mono">{device.id_proof_number_masked}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(device.created_at).toLocaleString()}</span>
                </div>
                {device.last_edited_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Edited</span>
                    <span>{new Date(device.last_edited_at).toLocaleString()}</span>
                  </div>
                )}
                {device.cancelled_at && (
                  <div className="flex justify-between text-red-500">
                    <span>Cancelled</span>
                    <span>{new Date(device.cancelled_at).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sell Dialog */}
        <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sell Device - {device.device_id}</DialogTitle>
              <DialogDescription>
                Record the sale details for {device.brand} {device.model}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Purchase Price</p>
                <p className="text-lg font-bold">{formatCurrency(device.purchase_price)}</p>
              </div>
              <div className="space-y-2">
                <Label>Selling Price (₹) *</Label>
                <Input
                  type="number"
                  placeholder="Enter selling price"
                  value={sellData.selling_price}
                  onChange={(e) => setSellData({ ...sellData, selling_price: e.target.value })}
                  data-testid="selling-price-input"
                />
                {sellData.selling_price && (
                  <p className={`text-sm ${parseFloat(sellData.selling_price) > device.purchase_price ? "text-green-600" : "text-red-600"}`}>
                    Margin: {formatCurrency(parseFloat(sellData.selling_price) - device.purchase_price)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={sellData.payment_mode} onValueChange={(v) => setSellData({ ...sellData, payment_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buyer Name *</Label>
                <Input
                  placeholder="Enter buyer name"
                  value={sellData.buyer_name}
                  onChange={(e) => setSellData({ ...sellData, buyer_name: e.target.value })}
                  data-testid="buyer-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Buyer Phone *</Label>
                <Input
                  placeholder="Enter phone number"
                  value={sellData.buyer_phone}
                  onChange={(e) => setSellData({ ...sellData, buyer_phone: e.target.value })}
                  data-testid="buyer-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Buyer Address (Optional)</Label>
                <Textarea
                  placeholder="Enter address"
                  value={sellData.buyer_address}
                  onChange={(e) => setSellData({ ...sellData, buyer_address: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSellDialog(false)}>Cancel</Button>
              <Button onClick={handleSell} data-testid="record-sale-btn">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Record Sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Purchase - {device.device_id}</DialogTitle>
              <DialogDescription>
                This will cancel the purchase. {device.status !== "pending_signature" && "Note: Payment was already released."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason for Cancellation *</Label>
                <Textarea
                  placeholder="Enter reason..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Back</Button>
              <Button variant="destructive" onClick={handleCancel}>
                <XCircle className="w-4 h-4 mr-2" />
                Confirm Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Dialog for Margin Unlock */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Unlock Margin Data
              </DialogTitle>
              <DialogDescription>
                Enter your profit section password to view selling price and margin.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter profit section password"
                  value={marginPassword}
                  onChange={(e) => setMarginPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlockMargin()}
                  data-testid="margin-password-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
              <Button onClick={handleUnlockMargin} data-testid="unlock-margin-submit">
                <Lock className="w-4 h-4 mr-2" />
                Unlock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
