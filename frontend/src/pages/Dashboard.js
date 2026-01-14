import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Wrench,
  Package,
  Plus,
  ArrowRight,
} from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel } from "../lib/utils";
import Layout from "../components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, jobsRes] = await Promise.all([
        axios.get(`${API}/jobs/stats`),
        axios.get(`${API}/jobs?limit=5`),
      ]);
      setStats(statsRes.data);
      setRecentJobs(jobsRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Jobs",
      value: stats?.total || 0,
      icon: ClipboardList,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending Diagnosis",
      value: stats?.received || 0,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Waiting Approval",
      value: stats?.waiting_for_approval || 0,
      icon: AlertCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Ready for Delivery",
      value: stats?.repaired || 0,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Completed Today",
      value: stats?.closed || 0,
      icon: Package,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
    },
    {
      title: "Jobs Today",
      value: stats?.today || 0,
      icon: Wrench,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-in" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back to {tenant?.company_name}</p>
          </div>
          <Button onClick={() => navigate("/jobs/new")} data-testid="new-job-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="card-shadow" data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-4">
                <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Jobs */}
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Jobs</CardTitle>
            <Button variant="ghost" onClick={() => navigate("/jobs")} data-testid="view-all-jobs-btn">
              View all
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No jobs yet</p>
                <Button variant="link" onClick={() => navigate("/jobs/new")}>
                  Create your first job
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    data-testid={`job-card-${job.job_number}`}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-mono font-medium">{job.job_number}</p>
                        <p className="text-sm text-muted-foreground">{job.customer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm">{job.device.brand} {job.device.model}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(job.created_at)}</p>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card
            className="card-interactive cursor-pointer"
            onClick={() => navigate("/jobs?status=received")}
            data-testid="quick-action-pending"
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold">Pending Diagnosis</p>
                <p className="text-sm text-muted-foreground">{stats?.received || 0} jobs waiting</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="card-interactive cursor-pointer"
            onClick={() => navigate("/jobs?status=waiting_for_approval")}
            data-testid="quick-action-approval"
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold">Awaiting Approval</p>
                <p className="text-sm text-muted-foreground">{stats?.waiting_for_approval || 0} need response</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="card-interactive cursor-pointer"
            onClick={() => navigate("/jobs?status=repaired")}
            data-testid="quick-action-delivery"
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-semibold">Ready for Delivery</p>
                <p className="text-sm text-muted-foreground">{stats?.repaired || 0} to be collected</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
