import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  ArrowLeft,
  FileText,
  MessageSquare,
  Wrench,
  CheckCircle,
  Clock,
  Package,
  AlertCircle,
  Loader2,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, formatCurrency, getStatusColor, getStatusLabel, PAYMENT_MODES } from "../lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [diagnosisModal, setDiagnosisModal] = useState(false);
  const [repairModal, setRepairModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState(false);
  const [whatsappData, setWhatsappData] = useState(null);

  // Form states
  const [diagnosisForm, setDiagnosisForm] = useState({
    diagnosis: "",
    estimated_cost: "",
    estimated_timeline: "",
    parts_required: "",
  });

  const [repairForm, setRepairForm] = useState({
    work_done: "",
    parts_replaced: "",
    final_amount: "",
    warranty_info: "",
  });

  const [closeForm, setCloseForm] = useState({
    device_delivered: true,
    accessories_returned: [],
    payment_mode: "",
    invoice_reference: "",
  });

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await axios.get(`${API}/jobs/${id}`);
      setJob(response.data);

      // Pre-fill forms if data exists
      if (response.data.diagnosis) {
        setDiagnosisForm({
          diagnosis: response.data.diagnosis.diagnosis || "",
          estimated_cost: response.data.diagnosis.estimated_cost || "",
          estimated_timeline: response.data.diagnosis.estimated_timeline || "",
          parts_required: response.data.diagnosis.parts_required || "",
        });
      }
      if (response.data.repair) {
        setRepairForm({
          work_done: response.data.repair.work_done || "",
          parts_replaced: response.data.repair.parts_replaced || "",
          final_amount: response.data.repair.final_amount || "",
          warranty_info: response.data.repair.warranty_info || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load job details");
      navigate("/jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnosis = async () => {
    if (!diagnosisForm.diagnosis || !diagnosisForm.estimated_cost || !diagnosisForm.estimated_timeline) {
      toast.error("Please fill all required fields");
      return;
    }

    setActionLoading(true);
    try {
      const response = await axios.put(`${API}/jobs/${id}/diagnosis`, {
        ...diagnosisForm,
        estimated_cost: parseFloat(diagnosisForm.estimated_cost),
      });
      setJob(response.data);
      setDiagnosisModal(false);
      toast.success("Diagnosis saved successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save diagnosis");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepair = async () => {
    if (!repairForm.work_done || !repairForm.final_amount) {
      toast.error("Please fill all required fields");
      return;
    }

    setActionLoading(true);
    try {
      const response = await axios.put(`${API}/jobs/${id}/repair`, {
        ...repairForm,
        final_amount: parseFloat(repairForm.final_amount),
      });
      setJob(response.data);
      setRepairModal(false);
      toast.success("Repair details saved successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save repair details");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!closeForm.payment_mode) {
      toast.error("Please select payment mode");
      return;
    }

    setActionLoading(true);
    try {
      const response = await axios.put(`${API}/jobs/${id}/close`, closeForm);
      setJob(response.data);
      setCloseModal(false);
      toast.success("Job closed successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to close job");
    } finally {
      setActionLoading(false);
    }
  };

  const fetchWhatsappMessage = async (type) => {
    try {
      const response = await axios.get(`${API}/jobs/${id}/whatsapp-message?message_type=${type}`);
      setWhatsappData(response.data);
      setWhatsappModal(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate message");
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get(`${API}/jobs/${id}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `job-${job.job_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      received: Clock,
      diagnosed: AlertCircle,
      waiting_for_approval: AlertCircle,
      repaired: CheckCircle,
      closed: Package,
    };
    return icons[status] || Clock;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!job) return null;

  const checkedAccessories = job.accessories.filter((a) => a.checked);
  const isClosed = job.status === "closed";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 animate-in" data-testid="job-detail-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
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
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold font-mono">{job.job_number}</h1>
                <Badge className={`${getStatusColor(job.status)} text-sm`}>
                  {getStatusLabel(job.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Created {formatDateTime(job.created_at)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadPDF} data-testid="download-pdf-btn">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              className="whatsapp-btn"
              onClick={() => fetchWhatsappMessage(job.status === "waiting_for_approval" ? "diagnosis" : job.status === "repaired" ? "repaired" : "received")}
              data-testid="whatsapp-btn"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Device */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Customer & Device</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Customer</h4>
                    <p className="font-semibold">{job.customer.name}</p>
                    <p className="text-sm">{job.customer.mobile}</p>
                    {job.customer.email && (
                      <p className="text-sm text-muted-foreground">{job.customer.email}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Device</h4>
                    <p className="font-semibold">
                      {job.device.brand} {job.device.model}
                    </p>
                    <p className="text-sm font-mono">{job.device.serial_imei}</p>
                    <p className="text-sm">
                      {job.device.device_type} • {job.device.condition}
                    </p>
                    {job.device.condition_notes && (
                      <p className="text-sm text-muted-foreground">{job.device.condition_notes}</p>
                    )}
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
                {checkedAccessories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {checkedAccessories.map((acc, i) => (
                      <Badge key={i} variant="secondary">
                        {acc.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No accessories collected</p>
                )}
              </CardContent>
            </Card>

            {/* Problem & Observation */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Problem Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Customer-Reported Issue
                  </h4>
                  <p>{job.problem_description}</p>
                </div>
                {job.technician_observation && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Technician Observation
                    </h4>
                    <p>{job.technician_observation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Diagnosis */}
            {job.diagnosis && (
              <Card className="card-shadow border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-purple-500" />
                    Diagnosis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Issue Found</h4>
                    <p>{job.diagnosis.diagnosis}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Estimated Cost
                      </h4>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(job.diagnosis.estimated_cost)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Timeline</h4>
                      <p>{job.diagnosis.estimated_timeline}</p>
                    </div>
                  </div>
                  {job.diagnosis.parts_required && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Parts Required
                      </h4>
                      <p>{job.diagnosis.parts_required}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Repair */}
            {job.repair && (
              <Card className="card-shadow border-green-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Repair Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Work Done</h4>
                    <p>{job.repair.work_done}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Final Amount
                      </h4>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(job.repair.final_amount)}
                      </p>
                    </div>
                    {job.repair.warranty_info && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Warranty</h4>
                        <p>{job.repair.warranty_info}</p>
                      </div>
                    )}
                  </div>
                  {job.repair.parts_replaced && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Parts Replaced
                      </h4>
                      <p>{job.repair.parts_replaced}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Closure */}
            {job.closure && (
              <Card className="card-shadow border-gray-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-500" />
                    Job Closed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Payment Mode
                      </h4>
                      <p>{job.closure.payment_mode}</p>
                    </div>
                    {job.closure.invoice_reference && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          Invoice Reference
                        </h4>
                        <p className="font-mono">{job.closure.invoice_reference}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Accessories Returned
                    </h4>
                    {job.closure.accessories_returned.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {job.closure.accessories_returned.map((acc, i) => (
                          <Badge key={i} variant="secondary">
                            {acc}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">None specified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {!isClosed && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(job.status === "received" || job.status === "diagnosed") && (
                    <Button
                      className="w-full"
                      onClick={() => setDiagnosisModal(true)}
                      data-testid="diagnosis-btn"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {job.diagnosis ? "Update Diagnosis" : "Add Diagnosis"}
                    </Button>
                  )}
                  {(job.status === "waiting_for_approval" || job.status === "diagnosed") && (
                    <Button
                      className="w-full"
                      onClick={() => setRepairModal(true)}
                      data-testid="repair-btn"
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      {job.repair ? "Update Repair" : "Mark Repaired"}
                    </Button>
                  )}
                  {job.status === "repaired" && (
                    <Button
                      className="w-full"
                      variant="default"
                      onClick={() => setCloseModal(true)}
                      data-testid="close-job-btn"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Close Job
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Status Timeline */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {job.status_history.map((entry, index) => {
                    const StatusIcon = getStatusIcon(entry.status);
                    return (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(
                              entry.status
                            )}`}
                          >
                            <StatusIcon className="w-4 h-4" />
                          </div>
                          {index < job.status_history.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium">{getStatusLabel(entry.status)}</p>
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(entry.timestamp)} • {entry.user_name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Diagnosis Modal */}
      <Dialog open={diagnosisModal} onOpenChange={setDiagnosisModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Diagnosis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Diagnosis / Issue Found *</Label>
              <Textarea
                value={diagnosisForm.diagnosis}
                onChange={(e) =>
                  setDiagnosisForm((prev) => ({ ...prev, diagnosis: e.target.value }))
                }
                placeholder="Describe the issue found..."
                rows={3}
                data-testid="diagnosis-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Cost (₹) *</Label>
                <Input
                  type="number"
                  value={diagnosisForm.estimated_cost}
                  onChange={(e) =>
                    setDiagnosisForm((prev) => ({ ...prev, estimated_cost: e.target.value }))
                  }
                  placeholder="3500"
                  data-testid="diagnosis-cost-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Timeline *</Label>
                <Input
                  value={diagnosisForm.estimated_timeline}
                  onChange={(e) =>
                    setDiagnosisForm((prev) => ({ ...prev, estimated_timeline: e.target.value }))
                  }
                  placeholder="2-3 working days"
                  data-testid="diagnosis-timeline-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parts Required</Label>
              <Input
                value={diagnosisForm.parts_required}
                onChange={(e) =>
                  setDiagnosisForm((prev) => ({ ...prev, parts_required: e.target.value }))
                }
                placeholder="Power IC, Battery..."
                data-testid="diagnosis-parts-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiagnosisModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleDiagnosis} disabled={actionLoading} data-testid="save-diagnosis-btn">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Diagnosis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repair Modal */}
      <Dialog open={repairModal} onOpenChange={setRepairModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mark as Repaired</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Work Done *</Label>
              <Textarea
                value={repairForm.work_done}
                onChange={(e) =>
                  setRepairForm((prev) => ({ ...prev, work_done: e.target.value }))
                }
                placeholder="Describe the work done..."
                rows={3}
                data-testid="repair-work-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Final Amount (₹) *</Label>
                <Input
                  type="number"
                  value={repairForm.final_amount}
                  onChange={(e) =>
                    setRepairForm((prev) => ({ ...prev, final_amount: e.target.value }))
                  }
                  placeholder="3500"
                  data-testid="repair-amount-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Warranty</Label>
                <Input
                  value={repairForm.warranty_info}
                  onChange={(e) =>
                    setRepairForm((prev) => ({ ...prev, warranty_info: e.target.value }))
                  }
                  placeholder="30 days"
                  data-testid="repair-warranty-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parts Replaced</Label>
              <Input
                value={repairForm.parts_replaced}
                onChange={(e) =>
                  setRepairForm((prev) => ({ ...prev, parts_replaced: e.target.value }))
                }
                placeholder="Power IC, Battery..."
                data-testid="repair-parts-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepairModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRepair} disabled={actionLoading} data-testid="save-repair-btn">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Mark Repaired"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Job Modal */}
      <Dialog open={closeModal} onOpenChange={setCloseModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Close Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="device-delivered"
                checked={closeForm.device_delivered}
                onCheckedChange={(checked) =>
                  setCloseForm((prev) => ({ ...prev, device_delivered: checked }))
                }
                data-testid="device-delivered-checkbox"
              />
              <Label htmlFor="device-delivered">Device delivered to customer</Label>
            </div>

            <div className="space-y-2">
              <Label>Accessories Returned</Label>
              <div className="grid grid-cols-2 gap-2">
                {checkedAccessories.map((acc, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Checkbox
                      id={`return-${i}`}
                      checked={closeForm.accessories_returned.includes(acc.name)}
                      onCheckedChange={(checked) => {
                        setCloseForm((prev) => ({
                          ...prev,
                          accessories_returned: checked
                            ? [...prev.accessories_returned, acc.name]
                            : prev.accessories_returned.filter((a) => a !== acc.name),
                        }));
                      }}
                    />
                    <Label htmlFor={`return-${i}`} className="text-sm">
                      {acc.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Mode *</Label>
              <Select
                value={closeForm.payment_mode}
                onValueChange={(v) => setCloseForm((prev) => ({ ...prev, payment_mode: v }))}
              >
                <SelectTrigger data-testid="payment-mode-select">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Invoice Reference</Label>
              <Input
                value={closeForm.invoice_reference}
                onChange={(e) =>
                  setCloseForm((prev) => ({ ...prev, invoice_reference: e.target.value }))
                }
                placeholder="INV-001"
                data-testid="invoice-reference-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleClose} disabled={actionLoading} data-testid="close-job-confirm-btn">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Close Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Modal */}
      <Dialog open={whatsappModal} onOpenChange={setWhatsappModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send WhatsApp Message</DialogTitle>
          </DialogHeader>
          {whatsappData && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm">{whatsappData.message}</pre>
              </div>
              <p className="text-sm text-muted-foreground">
                This will open WhatsApp with the pre-filled message. You'll need to click send manually.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappModal(false)}>
              Cancel
            </Button>
            <Button
              className="whatsapp-btn"
              onClick={() => {
                window.open(whatsappData.whatsapp_url, "_blank");
                setWhatsappModal(false);
              }}
              data-testid="open-whatsapp-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
