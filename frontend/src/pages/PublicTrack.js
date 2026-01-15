import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  Wrench,
  Search,
  ArrowRight,
  Smartphone,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getStatusColor = (status) => {
  const colors = {
    received: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    diagnosed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    waiting_for_approval: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    repaired: "bg-green-500/10 text-green-500 border-green-500/20",
    closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return colors[status] || colors.received;
};

const getStatusLabel = (status) => {
  const labels = {
    received: "Received",
    diagnosed: "Diagnosed",
    waiting_for_approval: "Waiting for Approval",
    repaired: "Repaired",
    closed: "Closed",
  };
  return labels[status] || status;
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

const formatDateTime = (isoString) => {
  return new Date(isoString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

// Search form component
function TrackingSearch({ onSearch }) {
  const [jobNumber, setJobNumber] = useState("");
  const [trackingToken, setTrackingToken] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (jobNumber && trackingToken) {
      onSearch(jobNumber, trackingToken);
    }
  };

  return (
    <Card className="max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Track Your Repair</CardTitle>
        <p className="text-muted-foreground">
          Enter your job number and tracking token to check the status of your repair
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job-number">Job Number</Label>
            <Input
              id="job-number"
              placeholder="e.g., JOB-2025-000001"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              className="font-mono"
              data-testid="job-number-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tracking-token">Tracking Token</Label>
            <Input
              id="tracking-token"
              placeholder="e.g., A1B2C3D4"
              value={trackingToken}
              onChange={(e) => setTrackingToken(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              data-testid="tracking-token-input"
            />
          </div>
          <Button type="submit" className="w-full" data-testid="track-btn">
            <Search className="w-4 h-4 mr-2" />
            Track Status
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Status display component
function StatusDisplay({ data }) {
  const StatusIcon = getStatusIcon(data.status);
  
  const statusSteps = ["received", "diagnosed", "waiting_for_approval", "repaired", "closed"];
  const currentStepIndex = statusSteps.indexOf(data.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{data.company_name}</p>
              <CardTitle className="text-2xl font-mono">{data.job_number}</CardTitle>
            </div>
            <Badge className={`${getStatusColor(data.status)} text-lg px-4 py-1`}>
              {getStatusLabel(data.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Smartphone className="w-5 h-5" />
            <span className="font-medium">{data.device_brand} {data.device_model}</span>
          </div>
        </CardContent>
      </Card>

      {/* Progress Steps */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Repair Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Progress bar */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>
            
            {/* Steps */}
            <div className="relative flex justify-between">
              {statusSteps.map((step, index) => {
                const StepIcon = getStatusIcon(step);
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step} className="flex flex-col items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                        isCompleted 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs mt-2 text-center max-w-16 ${
                      isCompleted ? "text-primary font-medium" : "text-muted-foreground"
                    }`}>
                      {getStatusLabel(step).split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis & Repair Summary */}
      {(data.diagnosis_summary || data.repair_summary) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.diagnosis_summary && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Diagnosis</h4>
                <p>{data.diagnosis_summary}</p>
              </div>
            )}
            {data.repair_summary && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Work Done</h4>
                <p>{data.repair_summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.status_history.slice().reverse().map((entry, index) => {
              const EntryIcon = getStatusIcon(entry.status);
              return (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(entry.status)}`}>
                      <EntryIcon className="w-4 h-4" />
                    </div>
                    {index < data.status_history.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium">{getStatusLabel(entry.status)}</p>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground">{entry.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Back to search */}
      <div className="text-center">
        <Link to="/track">
          <Button variant="outline">
            Track Another Job
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function PublicTrack() {
  const { jobNumber, trackingToken } = useParams();
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJobStatus = async (jn, token) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/public/track/${jn}/${token}`);
      setJobData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Job not found. Please check your details and try again.");
      setJobData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobNumber && trackingToken) {
      fetchJobStatus(jobNumber, trackingToken);
    }
  }, [jobNumber, trackingToken]);

  const handleSearch = (jn, token) => {
    window.history.pushState({}, "", `/track/${jn}/${token}`);
    fetchJobStatus(jn, token);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30" data-testid="public-track-page">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">AfterSales.pro</span>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm">
              Shop Login
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto">
            <Card className="border-destructive/50">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive font-medium mb-4">{error}</p>
                <TrackingSearch onSearch={handleSearch} />
              </CardContent>
            </Card>
          </div>
        ) : jobData ? (
          <StatusDisplay data={jobData} />
        ) : (
          <TrackingSearch onSearch={handleSearch} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Powered by AfterSales.pro - Repair Job Management System</p>
        </div>
      </footer>
    </div>
  );
}
