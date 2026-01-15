import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  Smartphone,
  Laptop,
  Tablet,
  HardDrive,
  CalendarIcon,
  X,
} from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel } from "../lib/utils";
import { format } from "date-fns";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const deviceIcons = {
  Mobile: Smartphone,
  Laptop: Laptop,
  Tablet: Tablet,
  Other: HardDrive,
};

export default function Jobs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [branchFilter, setBranchFilter] = useState(searchParams.get("branch") || "all");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, branchFilter, dateFrom, dateTo]);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
    } catch (error) {
      console.error("Failed to fetch branches:", error);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status_filter", statusFilter);
      if (branchFilter && branchFilter !== "all") params.append("branch_id", branchFilter);
      if (search) params.append("search", search);
      if (dateFrom) params.append("date_from", format(dateFrom, "yyyy-MM-dd"));
      if (dateTo) params.append("date_to", format(dateTo, "yyyy-MM-dd"));

      const response = await axios.get(`${API}/jobs?${params.toString()}`);
      setJobs(response.data);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setSearchParams((prev) => {
      if (value === "all") {
        prev.delete("status");
      } else {
        prev.set("status", value);
      }
      return prev;
    });
  };

  const handleBranchChange = (value) => {
    setBranchFilter(value);
    setSearchParams((prev) => {
      if (value === "all") {
        prev.delete("branch");
      } else {
        prev.set("branch", value);
      }
      return prev;
    });
  };

  const clearDateFilter = () => {
    setDateFrom(null);
    setDateTo(null);
  };

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "received", label: "Received" },
    { value: "diagnosed", label: "Diagnosed" },
    { value: "waiting_for_approval", label: "Waiting for Approval" },
    { value: "repaired", label: "Repaired" },
    { value: "closed", label: "Closed" },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="jobs-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Jobs</h1>
            <p className="text-muted-foreground">Manage all repair jobs</p>
          </div>
          <Button onClick={() => navigate("/jobs/new")} data-testid="new-job-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
        </div>

        {/* Filters */}
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by job number, name, mobile, or IMEI..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
                <Button type="submit" variant="secondary" data-testid="search-btn">
                  Search
                </Button>
              </form>

              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[180px]" data-testid="status-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {branches.length > 1 && (
                  <Select value={branchFilter} onValueChange={handleBranchChange}>
                    <SelectTrigger className="w-[180px]" data-testid="branch-filter">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Date Range:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-[140px] justify-start ${!dateFrom && "text-muted-foreground"}`}
                    data-testid="date-from-btn"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-[140px] justify-start ${!dateTo && "text-muted-foreground"}`}
                    data-testid="date-to-btn"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd MMM yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilter}
                  data-testid="clear-date-btn"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner w-8 h-8 border-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="card-shadow">
            <CardContent className="p-12 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first job to get started"}
              </p>
              {!search && statusFilter === "all" && (
                <Button onClick={() => navigate("/jobs/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const DeviceIcon = deviceIcons[job.device.device_type] || HardDrive;
              return (
                <Card
                  key={job.id}
                  className="card-interactive cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  data-testid={`job-row-${job.job_number}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                          <DeviceIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-semibold">{job.job_number}</p>
                            <Badge className={getStatusColor(job.status)}>
                              {getStatusLabel(job.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {job.customer.name} • {job.customer.mobile}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="hidden md:block">
                          <p className="font-medium">
                            {job.device.brand} {job.device.model}
                          </p>
                          <p className="text-muted-foreground">{job.device.serial_imei}</p>
                        </div>
                        <div className="hidden lg:block text-right">
                          <p className="text-muted-foreground">{formatDate(job.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
