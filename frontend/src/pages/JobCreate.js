import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ArrowLeft, Save, Loader2, MessageSquare, CheckCircle, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { DEVICE_TYPES, DEVICE_CONDITIONS, DEFAULT_ACCESSORIES } from "../lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function JobCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJob, setCreatedJob] = useState(null);
  const [whatsappData, setWhatsappData] = useState(null);
  const [formData, setFormData] = useState({
    customer: {
      name: "",
      mobile: "",
      email: "",
    },
    device: {
      device_type: "",
      brand: "",
      model: "",
      serial_imei: "",
      condition: "",
      condition_notes: "",
      notes: "",
      password: "",
    },
    accessories: [...DEFAULT_ACCESSORIES],
    problem_description: "",
    technician_observation: "",
    branch_id: "",
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
      if (response.data.length === 1) {
        setFormData((prev) => ({ ...prev, branch_id: response.data[0].id }));
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error);
    }
  };

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      customer: { ...prev.customer, [name]: value },
    }));
  };

  const handleDeviceChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      device: { ...prev.device, [name]: value },
    }));
  };

  const handleDeviceSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      device: { ...prev.device, [name]: value },
    }));
  };

  const handleAccessoryToggle = (index) => {
    setFormData((prev) => ({
      ...prev,
      accessories: prev.accessories.map((acc, i) =>
        i === index ? { ...acc, checked: !acc.checked } : acc
      ),
    }));
  };

  const addCustomAccessory = () => {
    const name = prompt("Enter accessory name:");
    if (name && name.trim()) {
      setFormData((prev) => ({
        ...prev,
        accessories: [...prev.accessories, { name: name.trim(), checked: true }],
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.customer.name || !formData.customer.mobile) {
      toast.error("Customer name and mobile are required");
      return;
    }
    if (!formData.device.device_type || !formData.device.brand || !formData.device.model) {
      toast.error("Device type, brand, and model are required");
      return;
    }
    if (!formData.device.serial_imei) {
      toast.error("Serial/IMEI number is required");
      return;
    }
    if (!formData.device.condition) {
      toast.error("Device condition is required");
      return;
    }
    if (!formData.problem_description) {
      toast.error("Problem description is required");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/jobs`, formData);
      toast.success(`Job ${response.data.job_number} created successfully!`);
      navigate(`/jobs/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-in" data-testid="job-create-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/jobs")}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">New Job Sheet</h1>
            <p className="text-muted-foreground">Create a new repair job</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Customer Name *</Label>
                  <Input
                    id="customer-name"
                    name="name"
                    value={formData.customer.name}
                    onChange={handleCustomerChange}
                    placeholder="John Doe"
                    required
                    data-testid="customer-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-mobile">Mobile Number *</Label>
                  <Input
                    id="customer-mobile"
                    name="mobile"
                    value={formData.customer.mobile}
                    onChange={handleCustomerChange}
                    placeholder="+91 98765 43210"
                    required
                    data-testid="customer-mobile-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email (Optional)</Label>
                <Input
                  id="customer-email"
                  name="email"
                  type="email"
                  value={formData.customer.email}
                  onChange={handleCustomerChange}
                  placeholder="john@example.com"
                  data-testid="customer-email-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Device Information */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Device Type *</Label>
                  <Select
                    value={formData.device.device_type}
                    onValueChange={(v) => handleDeviceSelectChange("device_type", v)}
                  >
                    <SelectTrigger data-testid="device-type-select">
                      <SelectValue placeholder="Select device type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-brand">Brand *</Label>
                  <Input
                    id="device-brand"
                    name="brand"
                    value={formData.device.brand}
                    onChange={handleDeviceChange}
                    placeholder="Dell, Apple, Samsung..."
                    required
                    data-testid="device-brand-input"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device-model">Model *</Label>
                  <Input
                    id="device-model"
                    name="model"
                    value={formData.device.model}
                    onChange={handleDeviceChange}
                    placeholder="Inspiron 15, iPhone 14..."
                    required
                    data-testid="device-model-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-serial">Serial / IMEI *</Label>
                  <Input
                    id="device-serial"
                    name="serial_imei"
                    value={formData.device.serial_imei}
                    onChange={handleDeviceChange}
                    placeholder="Enter serial number or IMEI"
                    required
                    className="font-mono"
                    data-testid="device-serial-input"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Device Condition *</Label>
                  <Select
                    value={formData.device.condition}
                    onValueChange={(v) => handleDeviceSelectChange("condition", v)}
                  >
                    <SelectTrigger data-testid="device-condition-select">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_CONDITIONS.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition-notes">Condition Notes</Label>
                  <Input
                    id="condition-notes"
                    name="condition_notes"
                    value={formData.device.condition_notes}
                    onChange={handleDeviceChange}
                    placeholder="Scratches on back, dent on corner..."
                    data-testid="device-condition-notes-input"
                  />
                </div>
              </div>

              {/* Notes and Password */}
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="device-password">Device Password / PIN</Label>
                  <Input
                    id="device-password"
                    name="password"
                    value={formData.device.password}
                    onChange={handleDeviceChange}
                    placeholder="Enter device password or PIN"
                    type="text"
                    data-testid="device-password-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for diagnosis. Stored securely.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-notes">Additional Notes</Label>
                  <Textarea
                    id="device-notes"
                    name="notes"
                    value={formData.device.notes}
                    onChange={handleDeviceChange}
                    placeholder="Any additional notes about the device..."
                    rows={2}
                    data-testid="device-notes-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accessories */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Accessories Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {formData.accessories.map((accessory, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2"
                    data-testid={`accessory-${accessory.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Checkbox
                      id={`accessory-${index}`}
                      checked={accessory.checked}
                      onCheckedChange={() => handleAccessoryToggle(index)}
                    />
                    <Label
                      htmlFor={`accessory-${index}`}
                      className="text-sm cursor-pointer"
                    >
                      {accessory.name}
                    </Label>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={addCustomAccessory}
                data-testid="add-accessory-btn"
              >
                + Add Other Accessory
              </Button>
            </CardContent>
          </Card>

          {/* Problem Description */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Problem Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="problem">Customer-Reported Issue *</Label>
                <Textarea
                  id="problem"
                  value={formData.problem_description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, problem_description: e.target.value }))
                  }
                  placeholder="Describe the issue as reported by the customer..."
                  rows={4}
                  required
                  data-testid="problem-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observation">Technician Observation (Optional)</Label>
                <Textarea
                  id="observation"
                  value={formData.technician_observation}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, technician_observation: e.target.value }))
                  }
                  placeholder="Your initial observations..."
                  rows={3}
                  data-testid="technician-observation-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Branch Selection */}
          {branches.length > 1 && (
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.branch_id}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, branch_id: v }))}
                >
                  <SelectTrigger data-testid="branch-select">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/jobs")}
              data-testid="cancel-btn"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} data-testid="submit-job-btn">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Job Sheet
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
