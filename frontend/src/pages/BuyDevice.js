import React, { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import {
  Smartphone,
  Monitor,
  ArrowLeft,
  User,
  CreditCard,
  Package,
  AlertCircle,
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
  { value: "networking", label: "Networking (Router/Switch)" },
  { value: "storage", label: "Storage (HDD/SSD/NAS)" },
  { value: "component", label: "Components (RAM/GPU/CPU)" },
  { value: "ups_power", label: "UPS / Power Equipment" },
  { value: "peripheral", label: "Peripherals (Keyboard/Mouse)" },
  { value: "other_it", label: "Other IT Equipment" },
];

const MOBILE_ACCESSORIES = ["Box", "Charger", "Earphones", "Bill/Invoice", "Case/Cover", "Screen Guard"];
const IT_ACCESSORIES = ["Power Cable", "Charger/Adapter", "Box", "Bill/Invoice", "Keyboard", "Mouse", "Stand", "Bag/Case"];

const ID_PROOF_TYPES = ["Aadhaar", "PAN", "Driving License", "Voter ID", "Passport"];
const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer"];

const PHYSICAL_CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
const WORKING_STATUS = ["Fully Working", "Partially Working", "Not Working", "Untested"];
const COSMETIC_ISSUES = ["None", "Minor Scratches", "Dents", "Cracks", "Heavy Damage"];

export default function BuyDevice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  
  // Determine module from URL path
  const isMobile = location.pathname.includes("mobile-trading");
  const module = isMobile ? "mobile" : "it";
  
  const categories = isMobile ? MOBILE_CATEGORIES : IT_CATEGORIES;
  const accessories = isMobile ? MOBILE_ACCESSORIES : IT_ACCESSORIES;
  const moduleLabel = isMobile ? "Mobile Phone" : "IT Equipment";
  const ModuleIcon = isMobile ? Smartphone : Monitor;
  const backPath = isMobile ? "/mobile-trading" : "/it-equipment";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    // Device Info
    category: "",
    brand: "",
    model: "",
    variant: "",
    color: "",
    
    // Identification (Mobile)
    imei_1: "",
    imei_2: "",
    
    // Identification (IT)
    serial_number: "",
    mac_address: "",
    custom_tag: "",
    
    // Specs (dynamic)
    specs: {},
    
    // Condition
    physical_condition: "",
    working_status: "",
    cosmetic_issues: "",
    condition_notes: "",
    accessories: [],
    
    // Purchase
    purchase_price: "",
    payment_mode: "",
    
    // Seller KYC
    seller_name: "",
    seller_phone: "",
    seller_address: "",
    id_proof_type: "",
    id_proof_number: "",
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      specs: { ...prev.specs, [field]: value }
    }));
  };

  const handleAccessoryToggle = (accessory) => {
    setFormData(prev => ({
      ...prev,
      accessories: prev.accessories.includes(accessory)
        ? prev.accessories.filter(a => a !== accessory)
        : [...prev.accessories, accessory]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        module: isMobile ? "mobile" : "it",
        category: formData.category,
        brand: formData.brand,
        model: formData.model,
        variant: formData.variant || null,
        color: formData.color || null,
        
        // Identification
        imei_1: isMobile ? formData.imei_1 : null,
        imei_2: isMobile && formData.imei_2 ? formData.imei_2 : null,
        serial_number: !isMobile ? formData.serial_number : null,
        mac_address: !isMobile && formData.mac_address ? formData.mac_address : null,
        custom_tag: !isMobile && formData.custom_tag ? formData.custom_tag : null,
        
        // Specs
        specs: Object.keys(formData.specs).length > 0 ? formData.specs : null,
        
        // Condition
        physical_condition: formData.physical_condition || null,
        working_status: formData.working_status || null,
        cosmetic_issues: formData.cosmetic_issues || null,
        condition_notes: formData.condition_notes || null,
        accessories: formData.accessories,
        
        // Purchase
        purchase_price: parseFloat(formData.purchase_price),
        payment_mode: formData.payment_mode,
        
        // Seller KYC
        seller_name: formData.seller_name,
        seller_phone: formData.seller_phone,
        seller_address: formData.seller_address || null,
        id_proof_type: formData.id_proof_type,
        id_proof_number: formData.id_proof_number,
      };

      const response = await axios.post(`${API}/used-devices`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`Device ${response.data.device_id} created successfully!`);
      navigate(backPath); // Go back to list page
    } catch (err) {
      const message = err.response?.data?.detail || "Failed to create device";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Render category-specific spec fields
  const renderSpecFields = () => {
    if (isMobile) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Storage</Label>
            <Select value={formData.specs.storage || ""} onValueChange={(v) => handleSpecChange("storage", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>RAM</Label>
            <Select value={formData.specs.ram || ""} onValueChange={(v) => handleSpecChange("ram", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["1GB", "2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Network Lock</Label>
            <Select value={formData.specs.network_lock || ""} onValueChange={(v) => handleSpecChange("network_lock", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Unlocked">Unlocked</SelectItem>
                <SelectItem value="Carrier Locked">Carrier Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>FRP/iCloud Status</Label>
            <Select value={formData.specs.frp_icloud_status || ""} onValueChange={(v) => handleSpecChange("frp_icloud_status", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Removed">Removed</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Battery Health</Label>
            <Select value={formData.specs.battery_health || ""} onValueChange={(v) => handleSpecChange("battery_health", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Good">Good (80%+)</SelectItem>
                <SelectItem value="Average">Average (60-80%)</SelectItem>
                <SelectItem value="Poor">Poor (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    // IT Equipment specs based on category
    const category = formData.category;
    
    if (["laptop", "desktop"].includes(category)) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Processor</Label>
            <Input placeholder="e.g., i5-1135G7, Ryzen 5" value={formData.specs.processor || ""} onChange={(e) => handleSpecChange("processor", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>RAM</Label>
            <Input placeholder="e.g., 8GB, 16GB" value={formData.specs.ram || ""} onChange={(e) => handleSpecChange("ram", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Storage Type</Label>
            <Select value={formData.specs.storage_type || ""} onValueChange={(v) => handleSpecChange("storage_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HDD">HDD</SelectItem>
                <SelectItem value="SSD">SSD</SelectItem>
                <SelectItem value="NVMe">NVMe SSD</SelectItem>
                <SelectItem value="Both">HDD + SSD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Storage Capacity</Label>
            <Input placeholder="e.g., 256GB, 1TB" value={formData.specs.storage_capacity || ""} onChange={(e) => handleSpecChange("storage_capacity", e.target.value)} />
          </div>
          {category === "laptop" && (
            <>
              <div className="space-y-2">
                <Label>Screen Size</Label>
                <Input placeholder='e.g., 14", 15.6"' value={formData.specs.screen_size || ""} onChange={(e) => handleSpecChange("screen_size", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Battery Health</Label>
                <Select value={formData.specs.battery_health || ""} onValueChange={(v) => handleSpecChange("battery_health", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Average">Average</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                    <SelectItem value="Dead">Dead/Needs Replacement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {category === "desktop" && (
            <>
              <div className="space-y-2">
                <Label>GPU</Label>
                <Input placeholder="e.g., Integrated, RTX 3060" value={formData.specs.gpu || ""} onChange={(e) => handleSpecChange("gpu", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>PSU Wattage</Label>
                <Input placeholder="e.g., 450W, 650W" value={formData.specs.psu_wattage || ""} onChange={(e) => handleSpecChange("psu_wattage", e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>OS License</Label>
            <Select value={formData.specs.os_license || ""} onValueChange={(v) => handleSpecChange("os_license", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Genuine">Genuine Windows</SelectItem>
                <SelectItem value="Not Activated">Not Activated</SelectItem>
                <SelectItem value="Linux">Linux</SelectItem>
                <SelectItem value="None">No OS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    if (category === "monitor") {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Screen Size</Label>
            <Input placeholder='e.g., 24", 27", 32"' value={formData.specs.screen_size || ""} onChange={(e) => handleSpecChange("screen_size", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Resolution</Label>
            <Select value={formData.specs.resolution || ""} onValueChange={(v) => handleSpecChange("resolution", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HD">HD (1366x768)</SelectItem>
                <SelectItem value="FHD">Full HD (1920x1080)</SelectItem>
                <SelectItem value="2K">2K (2560x1440)</SelectItem>
                <SelectItem value="4K">4K (3840x2160)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Panel Type</Label>
            <Select value={formData.specs.panel_type || ""} onValueChange={(v) => handleSpecChange("panel_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IPS">IPS</SelectItem>
                <SelectItem value="VA">VA</SelectItem>
                <SelectItem value="TN">TN</SelectItem>
                <SelectItem value="OLED">OLED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Refresh Rate</Label>
            <Input placeholder="e.g., 60Hz, 144Hz" value={formData.specs.refresh_rate || ""} onChange={(e) => handleSpecChange("refresh_rate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ports</Label>
            <Input placeholder="e.g., HDMI, VGA, DP" value={formData.specs.ports || ""} onChange={(e) => handleSpecChange("ports", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Dead Pixels</Label>
            <Select value={formData.specs.dead_pixels || ""} onValueChange={(v) => handleSpecChange("dead_pixels", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="1-3">1-3 pixels</SelectItem>
                <SelectItem value="More">More than 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    // Default for other categories - minimal specs
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Working Status</Label>
          <Select value={formData.specs.working_status || ""} onValueChange={(v) => handleSpecChange("working_status", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Tested OK">Tested OK</SelectItem>
              <SelectItem value="Untested">Untested</SelectItem>
              <SelectItem value="Faulty">Faulty</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="buy-device-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ModuleIcon className="w-6 h-6 text-primary" />
              Buy {moduleLabel}
            </h1>
            <p className="text-muted-foreground">Record a new device purchase</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Device Info */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Device Information
              </CardTitle>
              <CardDescription>Enter the device details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => handleChange("category", v)} required>
                    <SelectTrigger data-testid="category-select"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Brand *</Label>
                  <Input placeholder="e.g., Apple, Samsung, Dell" value={formData.brand} onChange={(e) => handleChange("brand", e.target.value)} required data-testid="brand-input" />
                </div>
                <div className="space-y-2">
                  <Label>Model *</Label>
                  <Input placeholder="e.g., iPhone 13, Galaxy S21" value={formData.model} onChange={(e) => handleChange("model", e.target.value)} required data-testid="model-input" />
                </div>
                <div className="space-y-2">
                  <Label>Variant</Label>
                  <Input placeholder="e.g., 128GB/6GB, Pro Max" value={formData.variant} onChange={(e) => handleChange("variant", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input placeholder="e.g., Black, Silver" value={formData.color} onChange={(e) => handleChange("color", e.target.value)} />
                </div>
              </div>

              {/* Identification Fields */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Identification</h4>
                {isMobile ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>IMEI 1 *</Label>
                      <Input placeholder="15-digit IMEI" value={formData.imei_1} onChange={(e) => handleChange("imei_1", e.target.value)} required maxLength={16} data-testid="imei1-input" />
                      <p className="text-xs text-muted-foreground">Dial *#06# to find IMEI</p>
                    </div>
                    <div className="space-y-2">
                      <Label>IMEI 2 (Dual SIM)</Label>
                      <Input placeholder="15-digit IMEI" value={formData.imei_2} onChange={(e) => handleChange("imei_2", e.target.value)} maxLength={16} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Serial Number</Label>
                      <Input placeholder="Device serial number" value={formData.serial_number} onChange={(e) => handleChange("serial_number", e.target.value)} data-testid="serial-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>MAC Address</Label>
                      <Input placeholder="For networking devices" value={formData.mac_address} onChange={(e) => handleChange("mac_address", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Tag</Label>
                      <Input placeholder="For assembled PCs" value={formData.custom_tag} onChange={(e) => handleChange("custom_tag", e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Category-Specific Specs */}
              {formData.category && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-4">Specifications</h4>
                  {renderSpecFields()}
                </div>
              )}

              {/* Condition */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Condition</h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Physical Condition</Label>
                    <Select value={formData.physical_condition} onValueChange={(v) => handleChange("physical_condition", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {PHYSICAL_CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Working Status</Label>
                    <Select value={formData.working_status} onValueChange={(v) => handleChange("working_status", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {WORKING_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cosmetic Issues</Label>
                    <Select value={formData.cosmetic_issues} onValueChange={(v) => handleChange("cosmetic_issues", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {COSMETIC_ISSUES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Condition Notes</Label>
                  <Textarea placeholder="Additional notes about device condition..." value={formData.condition_notes} onChange={(e) => handleChange("condition_notes", e.target.value)} />
                </div>
                <div className="mt-4">
                  <Label className="mb-2 block">Accessories Included</Label>
                  <div className="flex flex-wrap gap-3">
                    {accessories.map(acc => (
                      <div key={acc} className="flex items-center gap-2">
                        <Checkbox
                          id={acc}
                          checked={formData.accessories.includes(acc)}
                          onCheckedChange={() => handleAccessoryToggle(acc)}
                        />
                        <label htmlFor={acc} className="text-sm cursor-pointer">{acc}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Details */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Purchase Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Price (₹) *</Label>
                  <Input type="number" placeholder="Enter amount" value={formData.purchase_price} onChange={(e) => handleChange("purchase_price", e.target.value)} required data-testid="price-input" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select value={formData.payment_mode} onValueChange={(v) => handleChange("payment_mode", v)} required>
                    <SelectTrigger data-testid="payment-mode-select"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seller KYC */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Seller Information (KYC)
              </CardTitle>
              <CardDescription>Mandatory for compliance and ownership verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name (as per ID) *</Label>
                  <Input placeholder="Seller's full name" value={formData.seller_name} onChange={(e) => handleChange("seller_name", e.target.value)} required data-testid="seller-name-input" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input placeholder="10-digit mobile" value={formData.seller_phone} onChange={(e) => handleChange("seller_phone", e.target.value)} required data-testid="seller-phone-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea placeholder="Full address" value={formData.seller_address} onChange={(e) => handleChange("seller_address", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Proof Type *</Label>
                  <Select value={formData.id_proof_type} onValueChange={(v) => handleChange("id_proof_type", v)} required>
                    <SelectTrigger data-testid="id-type-select"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ID_PROOF_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID Proof Number *</Label>
                  <Input placeholder="ID number (will be masked)" value={formData.id_proof_number} onChange={(e) => handleChange("id_proof_number", e.target.value)} required data-testid="id-number-input" />
                  <p className="text-xs text-muted-foreground">Only last 4 digits will be stored for Aadhaar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(backPath)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1" data-testid="submit-btn">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Create Device Entry
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
