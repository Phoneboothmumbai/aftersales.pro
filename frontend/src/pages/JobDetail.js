import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";
import PhotoUpload from "../components/PhotoUpload";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
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
  Camera,
  QrCode,
  Copy,
  Phone,
  User,
  CreditCard,
  Truck,
  Timer,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, formatCurrency, getStatusColor, getStatusLabel, PAYMENT_MODES } from "../lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status icons mapping
const STATUS_ICONS = {
  received: Clock,
  diagnosed: AlertCircle,
  waiting_for_approval: ThumbsUp,
  in_progress: Wrench,
  pending_parts: Timer,
  repaired: CheckCircle,
  delivered: Truck,
  closed: Package,
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [trackingLink, setTrackingLink] = useState(null);

  // Modals
  const [diagnosisModal, setDiagnosisModal] = useState(false);
  const [approvalModal, setApprovalModal] = useState(false);
  const [repairModal, setRepairModal] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState(false);
  const [whatsappData, setWhatsappData] = useState(null);
  const [whatsappType, setWhatsappType] = useState("received");

  // Form states
  const [diagnosisForm, setDiagnosisForm] = useState({
    diagnosis: "",
    estimated_cost: "",
    estimated_timeline: "",
    parts_required: "",
  });

  const [approvalForm, setApprovalForm] = useState({
    approved_by: "",
    approved_amount: "",
    approval_notes: "",
  });

  const [repairForm, setRepairForm] = useState({
    work_done: "",
    parts_replaced: "",
    final_amount: "",
    warranty_info: "",
  });

  const [deliveryForm, setDeliveryForm] = useState({
    delivered_to: "",
    amount_received: "",
    payment_mode: "",
    payment_reference: "",
    delivery_notes: "",
  });

  useEffect(() => {
    fetchJob();
    fetchTrackingLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (response.data.approval) {
        setApprovalForm({
          approved_by: response.data.approval.approved_by || "",
          approved_amount: response.data.approval.approved_amount || "",
          approval_notes: response.data.approval.approval_notes || "",
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
      if (response.data.delivery) {
        setDeliveryForm({
          delivered_to: response.data.delivery.delivered_to || "",
          amount_received: response.data.delivery.amount_received || "",
          payment_mode: response.data.delivery.payment_mode || "",
          payment_reference: response.data.delivery.payment_reference || "",
          delivery_notes: response.data.delivery.delivery_notes || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load job details");
      navigate("/jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingLink = async () => {
    try {
      const response = await axios.get(`${API}/jobs/${id}/tracking-link`);
      setTrackingLink(response.data);
    } catch (error) {
      console.error("Failed to fetch tracking link");
    }
  };

  const handlePhotoChange = (newPhotos) => {
    setJob((prev) => ({ ...prev, photos: newPhotos }));
  };

  const copyTrackingLink = () => {
    if (trackingLink) {
      const fullUrl = `${window.location.origin}${trackingLink.tracking_path}`;
      navigator.clipboard.writeText(fullUrl);
      toast.success("Tracking link copied!");
    }
  };

  // Diagnosis
  const handleDiagnosis = async (sendWhatsApp = false) => {
    if (!diagnosisForm.diagnosis || !diagnosisForm.estimated_cost || !diagnosisForm.estimated_timeline) {
      toast.error("Please fill all required fields");
      return;
    }
    setActionLoading(true);
    try {
      await axios.put(`${API}/jobs/${id}/diagnosis`, diagnosisForm);
      toast.success("Diagnosis added");
      setDiagnosisModal(false);
      await fetchJob();
      if (sendWhatsApp) {
        openWhatsApp("diagnosis");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add diagnosis");
    } finally {
      setActionLoading(false);
    }
  };

  // Approval
  const handleApproval = async (sendWhatsApp = false) => {
    if (!approvalForm.approved_by || !approvalForm.approved_amount) {
      toast.error("Please fill required fields");
      return;
    }
    setActionLoading(true);
    try {
      await axios.put(`${API}/jobs/${id}/approve`, approvalForm);
      toast.success("Approval recorded");
      setApprovalModal(false);
      await fetchJob();
      if (sendWhatsApp) {
        openWhatsApp("approved");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record approval");
    } finally {
      setActionLoading(false);
    }
  };

  // Pending Parts
  const handlePendingParts = async () => {
    setActionLoading(true);
    try {
      await axios.put(`${API}/jobs/${id}/pending-parts?notes=Waiting for parts to arrive`);
      toast.success("Marked as pending parts");
      fetchJob();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  // Repair
  const handleRepair = async (sendWhatsApp = false) => {
    if (!repairForm.work_done || !repairForm.final_amount) {
      toast.error("Please fill required fields");
      return;
    }
    setActionLoading(true);
    try {
      await axios.put(`${API}/jobs/${id}/repair`, repairForm);
      toast.success("Repair completed");
      setRepairModal(false);
      await fetchJob();
      if (sendWhatsApp) {
        openWhatsApp("repaired");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update repair");
    } finally {
      setActionLoading(false);
    }
  };

  // Delivery
  const handleDelivery = async (sendWhatsApp = false) => {
    if (!deliveryForm.delivered_to || !deliveryForm.amount_received || !deliveryForm.payment_mode) {
      toast.error("Please fill required fields");
      return;
    }
    setActionLoading(true);
    try {
      await axios.put(`${API}/jobs/${id}/deliver`, deliveryForm);
      toast.success("Delivery recorded");
      setDeliveryModal(false);
      await fetchJob();
      if (sendWhatsApp) {
        openWhatsApp("delivered");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record delivery");
    } finally {
      setActionLoading(false);
    }
  };

  // Close Job
  const handleClose = async () => {
    setActionLoading(true);
    try {
      await axios.put(`${API}/jobs/${id}/close`);
      toast.success("Job closed");
      fetchJob();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to close job");
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp
  const openWhatsApp = async (messageType) => {
    try {
      const response = await axios.get(`${API}/jobs/${id}/whatsapp-message?message_type=${messageType}`);
      setWhatsappData(response.data);
      setWhatsappType(messageType);
      setWhatsappModal(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate message");
    }
  };

  // PDF
  const downloadPDF = async () => {
    try {
      const response = await axios.get(`${API}/jobs/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `job-${job.job_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!job) return null;

  const StatusIcon = STATUS_ICONS[job.status] || Clock;

  // Determine which actions are available based on status
  const canDiagnose = job.status === "received";
  const canApprove = job.status === "diagnosed" || job.status === "waiting_for_approval";
  const canMarkPendingParts = job.status === "in_progress";
  const canRepair = job.status === "in_progress" || job.status === "pending_parts";
  const canDeliver = job.status === "repaired";
  const canClose = job.status === "delivered";

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="job-detail-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")} data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono">{job.job_number}</h1>
                <Badge className={`${getStatusColor(job.status)} text-sm`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {getStatusLabel(job.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Created {formatDateTime(job.created_at)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadPDF} data-testid="download-pdf-btn">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button 
              size="sm" 
              onClick={() => openWhatsApp(job.status)} 
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="whatsapp-btn"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp Customer
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
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
                    <p className="font-semibold">{job.device.brand} {job.device.model}</p>
                    <p className="text-sm font-mono">{job.device.serial_imei}</p>
                    <p className="text-sm">{job.device.device_type} • {job.device.condition}</p>
                    {job.device.condition_notes && (
                      <p className="text-sm text-muted-foreground">{job.device.condition_notes}</p>
                    )}
                  </div>
                </div>
                {/* Device Password and Notes */}
                {(job.device.password || job.device.notes) && (
                  <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t">
                    {job.device.password && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Device Password</h4>
                        <p className="font-mono bg-muted px-2 py-1 rounded inline-block">{job.device.password}</p>
                      </div>
                    )}
                    {job.device.notes && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Device Notes</h4>
                        <p className="text-sm">{job.device.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Problem */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Problem Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Customer-Reported Issue</h4>
                  <p>{job.problem_description}</p>
                </div>
                {job.technician_observation && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Technician Observation</h4>
                    <p>{job.technician_observation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Device Photos */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Device Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUpload jobId={id} photos={job.photos || []} onPhotoChange={handlePhotoChange} />
              </CardContent>
            </Card>

            {/* Diagnosis */}
            {job.diagnosis && (
              <Card className="card-shadow border-purple-500/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-purple-500" />
                    Diagnosis
                  </CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => openWhatsApp("diagnosis")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="whatsapp-diagnosis-btn"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Send WhatsApp
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Issue Found</h4>
                    <p>{job.diagnosis.diagnosis}</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Estimated Cost</h4>
                      <p className="text-xl font-bold text-primary">{formatCurrency(job.diagnosis.estimated_cost)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Timeline</h4>
                      <p>{job.diagnosis.estimated_timeline}</p>
                    </div>
                    {job.diagnosis.parts_required && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Parts Required</h4>
                        <p>{job.diagnosis.parts_required}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Approval */}
            {job.approval && (
              <Card className="card-shadow border-green-500/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-green-500" />
                    Customer Approval
                  </CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => openWhatsApp("approved")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="whatsapp-approval-btn"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Send WhatsApp
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Approved By</h4>
                      <p className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {job.approval.approved_by}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Approved Amount</h4>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(job.approval.approved_amount)}</p>
                    </div>
                    {job.approval.approval_notes && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes</h4>
                        <p>{job.approval.approval_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Repair */}
            {job.repair && (
              <Card className="card-shadow border-blue-500/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-blue-500" />
                    Repair Details
                  </CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => openWhatsApp("repaired")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="whatsapp-repair-btn"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Send WhatsApp
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Work Done</h4>
                    <p>{job.repair.work_done}</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {job.repair.parts_replaced && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Parts Replaced</h4>
                        <p>{job.repair.parts_replaced}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Final Amount</h4>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(job.repair.final_amount)}</p>
                    </div>
                    {job.repair.warranty_info && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Warranty</h4>
                        <p>{job.repair.warranty_info}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery */}
            {job.delivery && (
              <Card className="card-shadow border-emerald-500/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-emerald-500" />
                    Delivery Details
                  </CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => openWhatsApp("delivered")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="whatsapp-delivery-btn"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Send WhatsApp
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Delivered To</h4>
                      <p className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {job.delivery.delivered_to}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Amount Received</h4>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(job.delivery.amount_received)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Payment Mode</h4>
                      <p className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        {job.delivery.payment_mode}
                      </p>
                    </div>
                    {job.delivery.payment_reference && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Reference</h4>
                        <p className="font-mono text-sm">{job.delivery.payment_reference}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-6">
            {/* Actions Card */}
            {job.status !== "closed" && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canDiagnose && (
                    <Button className="w-full" onClick={() => setDiagnosisModal(true)} data-testid="diagnose-btn">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Add Diagnosis
                    </Button>
                  )}
                  {canApprove && (
                    <Button className="w-full" onClick={() => setApprovalModal(true)} data-testid="approve-btn">
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Record Approval
                    </Button>
                  )}
                  {canMarkPendingParts && (
                    <Button className="w-full" variant="outline" onClick={handlePendingParts} data-testid="pending-parts-btn">
                      <Timer className="w-4 h-4 mr-2" />
                      Mark Pending Parts
                    </Button>
                  )}
                  {canRepair && (
                    <Button className="w-full" onClick={() => setRepairModal(true)} data-testid="repair-btn">
                      <Wrench className="w-4 h-4 mr-2" />
                      {job.repair ? "Update Repair" : "Mark Repaired"}
                    </Button>
                  )}
                  {canDeliver && (
                    <Button className="w-full" onClick={() => setDeliveryModal(true)} data-testid="deliver-btn">
                      <Truck className="w-4 h-4 mr-2" />
                      Record Delivery
                    </Button>
                  )}
                  {canClose && (
                    <Button className="w-full" variant="default" onClick={handleClose} data-testid="close-btn">
                      <Package className="w-4 h-4 mr-2" />
                      Close Job
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer Tracking */}
            {trackingLink && (
              <Card className="card-shadow border-blue-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <QrCode className="w-5 h-5 text-blue-500" />
                    Customer Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Share this with customer to track status.
                  </p>
                  <div className="bg-muted rounded-lg p-3 font-mono text-xs">
                    <p className="text-muted-foreground mb-1">Token:</p>
                    <p className="font-bold text-lg">{trackingLink.tracking_token}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={copyTrackingLink}>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Link
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(trackingLink.tracking_path, "_blank")}>
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>
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
                  {[...job.status_history].reverse().map((entry, index) => {
                    const EntryIcon = STATUS_ICONS[entry.status] || Clock;
                    return (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(entry.status)}`}>
                            <EntryIcon className="w-4 h-4" />
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
              <Label>Issue Found *</Label>
              <Textarea
                value={diagnosisForm.diagnosis}
                onChange={(e) => setDiagnosisForm({ ...diagnosisForm, diagnosis: e.target.value })}
                placeholder="Describe the issue found..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Cost (₹) *</Label>
                <Input
                  type="number"
                  value={diagnosisForm.estimated_cost}
                  onChange={(e) => setDiagnosisForm({ ...diagnosisForm, estimated_cost: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Timeline *</Label>
                <Input
                  value={diagnosisForm.estimated_timeline}
                  onChange={(e) => setDiagnosisForm({ ...diagnosisForm, estimated_timeline: e.target.value })}
                  placeholder="e.g., 2-3 days"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parts Required</Label>
              <Input
                value={diagnosisForm.parts_required}
                onChange={(e) => setDiagnosisForm({ ...diagnosisForm, parts_required: e.target.value })}
                placeholder="e.g., Screen, Battery"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDiagnosisModal(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleDiagnosis(false)} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Only"}
            </Button>
            <Button onClick={() => handleDiagnosis(true)} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Send WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={approvalModal} onOpenChange={setApprovalModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Customer Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Estimated cost from diagnosis:</p>
              <p className="text-xl font-bold">{formatCurrency(job.diagnosis?.estimated_cost || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label>Approved By (Customer Name) *</Label>
              <Input
                value={approvalForm.approved_by}
                onChange={(e) => setApprovalForm({ ...approvalForm, approved_by: e.target.value })}
                placeholder="Customer name who approved"
              />
            </div>
            <div className="space-y-2">
              <Label>Approved Amount (₹) *</Label>
              <Input
                type="number"
                value={approvalForm.approved_amount}
                onChange={(e) => setApprovalForm({ ...approvalForm, approved_amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={approvalForm.approval_notes}
                onChange={(e) => setApprovalForm({ ...approvalForm, approval_notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setApprovalModal(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleApproval(false)} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Only"}
            </Button>
            <Button onClick={() => handleApproval(true)} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Send WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repair Modal */}
      <Dialog open={repairModal} onOpenChange={setRepairModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Repair Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Work Done *</Label>
              <Textarea
                value={repairForm.work_done}
                onChange={(e) => setRepairForm({ ...repairForm, work_done: e.target.value })}
                placeholder="Describe the repair work..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Parts Replaced</Label>
              <Input
                value={repairForm.parts_replaced}
                onChange={(e) => setRepairForm({ ...repairForm, parts_replaced: e.target.value })}
                placeholder="e.g., Screen, Battery"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Final Amount (₹) *</Label>
                <Input
                  type="number"
                  value={repairForm.final_amount}
                  onChange={(e) => setRepairForm({ ...repairForm, final_amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Warranty</Label>
                <Input
                  value={repairForm.warranty_info}
                  onChange={(e) => setRepairForm({ ...repairForm, warranty_info: e.target.value })}
                  placeholder="e.g., 3 months"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setRepairModal(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleRepair(false)} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Only"}
            </Button>
            <Button onClick={() => handleRepair(true)} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Send WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Modal */}
      <Dialog open={deliveryModal} onOpenChange={setDeliveryModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Final amount from repair:</p>
              <p className="text-xl font-bold">{formatCurrency(job.repair?.final_amount || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label>Delivered To (Name) *</Label>
              <Input
                value={deliveryForm.delivered_to}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, delivered_to: e.target.value })}
                placeholder="Person who received the device"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount Received (₹) *</Label>
                <Input
                  type="number"
                  value={deliveryForm.amount_received}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, amount_received: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select
                  value={deliveryForm.payment_mode}
                  onValueChange={(v) => setDeliveryForm({ ...deliveryForm, payment_mode: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Reference</Label>
              <Input
                value={deliveryForm.payment_reference}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, payment_reference: e.target.value })}
                placeholder="UPI ID, Transaction ID, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={deliveryForm.delivery_notes}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_notes: e.target.value })}
                placeholder="Any delivery notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeliveryModal(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleDelivery(false)} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Only"}
            </Button>
            <Button onClick={() => handleDelivery(true)} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Send WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Modal */}
      <Dialog open={whatsappModal} onOpenChange={setWhatsappModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              Send WhatsApp Message
            </DialogTitle>
          </DialogHeader>
          {whatsappData && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 max-h-80 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-sans">{whatsappData.message}</pre>
              </div>
              <p className="text-sm text-muted-foreground">
                This will open WhatsApp with the pre-filled message.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappModal(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                window.open(whatsappData.whatsapp_url, "_blank");
                setWhatsappModal(false);
              }}
            >
              <Phone className="w-4 h-4 mr-2" />
              Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
