import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";
import PatternLock from "../components/PatternLock";
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
      unlock_pattern: "",
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
    // IMEI/Serial and Condition are now optional
    if (!formData.problem_description) {
      toast.error("Problem description is required");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/jobs`, formData);
      setCreatedJob(response.data);
      
      // Fetch WhatsApp message for the created job
      try {
        const whatsappRes = await axios.get(`${API}/jobs/${response.data.id}/whatsapp-message?message_type=received`);
        setWhatsappData(whatsappRes.data);
      } catch (e) {
        console.error("Failed to generate WhatsApp message:", e);
      }
      
      setShowSuccessModal(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (whatsappData?.whatsapp_url) {
      window.open(whatsappData.whatsapp_url, "_blank");
    }
  };

  const handleViewJob = () => {
    if (createdJob) {
      navigate(`/jobs/${createdJob.id}`);
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
                  <Label htmlFor="device-serial">Serial / IMEI (Optional)</Label>
                  <Input
                    id="device-serial"
                    name="serial_imei"
                    value={formData.device.serial_imei}
                    onChange={handleDeviceChange}
                    placeholder="Enter serial number or IMEI"
                    className="font-mono"
                    data-testid="device-serial-input"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Device Condition (Optional)</Label>
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

              {/* Password, Unlock Pattern and Notes */}
              <div className="grid sm:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="device-password">Device Password / PIN</Label>
                  <Input
                    id="device-password"
                    name="password"
                    value={formData.device.password}
                    onChange={handleDeviceChange}
                    placeholder="Enter password or PIN"
                    type="text"
                    data-testid="device-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unlock-pattern">Unlock Pattern (Android)</Label>
                  <Input
                    id="unlock-pattern"
                    name="unlock_pattern"
                    value={formData.device.unlock_pattern}
                    onChange={handleDeviceChange}
                    placeholder="e.g., L-shape, Z, 1-2-3-6-9"
                    type="text"
                    data-testid="unlock-pattern-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe the pattern or use dot numbers (1-9)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-notes">Additional Notes</Label>
                  <Textarea
                    id="device-notes"
                    name="notes"
                    value={formData.device.notes}
                    onChange={handleDeviceChange}
                    placeholder="Any additional notes..."
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

        {/* Success Modal with WhatsApp Option */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-6 h-6" />
                Job Created Successfully!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {createdJob && (
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="text-lg font-bold">Job #{createdJob.job_number}</p>
                  <p className="text-sm text-muted-foreground">
                    Customer: {createdJob.customer?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Device: {createdJob.device?.brand} {createdJob.device?.model}
                  </p>
                </div>
              )}
              
              <div className="text-center text-sm text-muted-foreground">
                Would you like to notify the customer via WhatsApp?
              </div>

              {whatsappData && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <pre className="whitespace-pre-wrap text-xs text-green-800 dark:text-green-200 max-h-40 overflow-y-auto">
                    {whatsappData.message}
                  </pre>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleOpenWhatsApp} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!whatsappData}
                  data-testid="send-whatsapp-btn"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send WhatsApp Message
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
                <Button 
                  onClick={handleViewJob} 
                  variant="outline"
                  className="w-full"
                  data-testid="view-job-btn"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Job Details
                </Button>
                <Button 
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCreatedJob(null);
                    setWhatsappData(null);
                    // Reset form
                    setFormData({
                      customer: { name: "", mobile: "", email: "" },
                      device: { device_type: "", brand: "", model: "", serial_imei: "", condition: "", condition_notes: "", notes: "", password: "" },
                      accessories: [...DEFAULT_ACCESSORIES],
                      problem_description: "",
                      technician_observation: "",
                      branch_id: branches.length === 1 ? branches[0].id : "",
                    });
                  }} 
                  variant="ghost"
                  className="w-full"
                  data-testid="create-another-btn"
                >
                  Create Another Job
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
