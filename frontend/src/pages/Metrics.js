import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  Briefcase,
  DollarSign,
  Calendar,
  Loader2,
  Award,
} from "lucide-react";
import { formatCurrency, getStatusColor, getStatusLabel } from "../lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Metrics() {
  const [overview, setOverview] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [overviewRes, techRes] = await Promise.all([
        axios.get(`${API}/metrics/overview`),
        axios.get(`${API}/metrics/technicians`),
      ]);
      setOverview(overviewRes.data);
      setTechnicians(techRes.data.technicians);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const maxJobs = Math.max(...(overview?.trend?.map((d) => d.jobs) || [1]), 1);

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="metrics-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Performance metrics and insights</p>
        </div>

        {/* Overview Stats */}
        {overview && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="card-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{overview.jobs_this_week}</p>
                      <p className="text-sm text-muted-foreground">Jobs This Week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{overview.jobs_this_month}</p>
                      <p className="text-sm text-muted-foreground">Jobs This Month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{overview.completed_this_week}</p>
                      <p className="text-sm text-muted-foreground">Completed This Week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(overview.monthly_revenue)}</p>
                      <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Jobs Trend Chart */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Jobs Trend (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-40">
                  {overview.trend?.map((day, index) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center">
                        <span className="text-sm font-medium mb-1">{day.jobs}</span>
                        <div
                          className="w-full bg-primary rounded-t transition-all"
                          style={{
                            height: `${Math.max((day.jobs / maxJobs) * 100, 5)}px`,
                            minHeight: "8px",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{day.day}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Jobs by Status */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Jobs by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {["received", "diagnosed", "waiting_for_approval", "repaired", "closed"].map(
                    (status) => (
                      <div
                        key={status}
                        className={`p-4 rounded-lg border ${getStatusColor(status)}`}
                      >
                        <p className="text-2xl font-bold">
                          {overview.jobs_by_status?.[status] || 0}
                        </p>
                        <p className="text-sm">{getStatusLabel(status)}</p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Technician Performance */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Technician Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {technicians.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No technicians yet</p>
                <p className="text-muted-foreground">Add team members to see their performance</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Jobs Created</TableHead>
                    <TableHead className="text-center">Jobs Closed</TableHead>
                    <TableHead className="text-center">Avg. Repair Time</TableHead>
                    <TableHead>Status Breakdown</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicians.map((tech, index) => (
                    <TableRow key={tech.id} data-testid={`technician-row-${tech.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index === 0 && tech.jobs_closed > 0 && (
                            <Award className="w-5 h-5 text-yellow-500" />
                          )}
                          <span className="font-bold text-muted-foreground">#{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tech.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tech.role === "admin" ? "default" : "secondary"}>
                          {tech.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">{tech.jobs_created}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-green-600">{tech.jobs_closed}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{tech.avg_repair_time_display}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(tech.jobs_by_status || {}).map(([status, count]) => (
                            <Badge
                              key={status}
                              variant="outline"
                              className={`text-xs ${getStatusColor(status)}`}
                            >
                              {getStatusLabel(status)}: {count}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Performance Tips */}
        <Card className="card-shadow bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Performance Insights</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • Average jobs per day this month:{" "}
                    <strong>{overview?.avg_jobs_per_day || 0}</strong>
                  </li>
                  <li>
                    • Total active jobs:{" "}
                    <strong>
                      {(overview?.jobs_by_status?.received || 0) +
                        (overview?.jobs_by_status?.diagnosed || 0) +
                        (overview?.jobs_by_status?.waiting_for_approval || 0) +
                        (overview?.jobs_by_status?.repaired || 0)}
                    </strong>
                  </li>
                  <li>
                    • Completion rate this week:{" "}
                    <strong>
                      {overview?.jobs_this_week
                        ? Math.round((overview.completed_this_week / overview.jobs_this_week) * 100)
                        : 0}
                      %
                    </strong>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
