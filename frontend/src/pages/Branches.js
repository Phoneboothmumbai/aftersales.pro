import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Plus, Trash2, Loader2, Building, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Branches() {
  const { isAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
    } catch (error) {
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error("Branch name is required");
      return;
    }

    setActionLoading(true);
    try {
      const response = await axios.post(`${API}/branches`, formData);
      setBranches([...branches, response.data]);
      setCreateModal(false);
      setFormData({ name: "", address: "", phone: "" });
      toast.success("Branch created successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create branch");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (branchId) => {
    setActionLoading(true);
    try {
      await axios.delete(`${API}/branches/${branchId}`);
      setBranches(branches.filter((b) => b.id !== branchId));
      setDeleteId(null);
      toast.success("Branch deleted");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete branch");
    } finally {
      setActionLoading(false);
    }
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

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="branches-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Branches</h1>
            <p className="text-muted-foreground">Manage your shop locations</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateModal(true)} data-testid="add-branch-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
            </Button>
          )}
        </div>

        {/* Branches List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <Card key={branch.id} className="card-shadow" data-testid={`branch-${branch.name}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{branch.name}</p>
                    </div>
                  </div>
                  {isAdmin && branches.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(branch.id)}
                      data-testid={`delete-branch-${branch.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {(branch.address || branch.phone) && (
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {branch.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {branch.address}
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {branch.phone}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Modal */}
        <Dialog open={createModal} onOpenChange={setCreateModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Branch Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Downtown Store"
                  data-testid="branch-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City"
                  data-testid="branch-address-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  data-testid="branch-phone-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={actionLoading} data-testid="create-branch-btn">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Branch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Branch</DialogTitle>
            </DialogHeader>
            <p>
              Are you sure you want to delete this branch? You can only delete branches that don't have
              any jobs associated with them.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
                disabled={actionLoading}
                data-testid="confirm-delete-btn"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
