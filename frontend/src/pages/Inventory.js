import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../components/Layout";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Loader2,
  Box,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  "Screens",
  "Batteries",
  "Chargers",
  "Cables",
  "IC/Chips",
  "Keyboards",
  "Storage",
  "Memory",
  "Other",
];

export default function Inventory() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modal states
  const [itemModal, setItemModal] = useState(false);
  const [adjustModal, setAdjustModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: "",
    sku: "",
    category: "",
    quantity: 0,
    min_stock_level: 5,
    cost_price: 0,
    selling_price: 0,
    supplier: "",
    description: "",
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity_change: 0,
    reason: "",
  });

  useEffect(() => {
    fetchInventory();
    fetchStats();
    fetchCategories();
  }, [categoryFilter, lowStockOnly]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
      if (lowStockOnly) params.append("low_stock_only", "true");
      if (search) params.append("search", search);

      const response = await axios.get(`${API}/inventory?${params.toString()}`);
      setItems(response.data);
    } catch (error) {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/inventory/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/inventory/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInventory();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setItemForm({
      name: "",
      sku: "",
      category: "",
      quantity: 0,
      min_stock_level: 5,
      cost_price: 0,
      selling_price: 0,
      supplier: "",
      description: "",
    });
    setItemModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      sku: item.sku || "",
      category: item.category || "",
      quantity: item.quantity,
      min_stock_level: item.min_stock_level,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      supplier: item.supplier || "",
      description: item.description || "",
    });
    setItemModal(true);
  };

  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setAdjustForm({ quantity_change: 0, reason: "" });
    setAdjustModal(true);
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setDeleteModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name) {
      toast.error("Item name is required");
      return;
    }

    setActionLoading(true);
    try {
      if (editingItem) {
        await axios.put(`${API}/inventory/${editingItem.id}`, itemForm);
        toast.success("Item updated");
      } else {
        await axios.post(`${API}/inventory`, itemForm);
        toast.success("Item added");
      }
      setItemModal(false);
      fetchInventory();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save item");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustForm.reason) {
      toast.error("Please provide a reason");
      return;
    }
    if (adjustForm.quantity_change === 0) {
      toast.error("Quantity change cannot be 0");
      return;
    }

    setActionLoading(true);
    try {
      await axios.post(`${API}/inventory/${selectedItem.id}/adjust`, adjustForm);
      toast.success("Stock adjusted");
      setAdjustModal(false);
      fetchInventory();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to adjust stock");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`${API}/inventory/${selectedItem.id}`);
      toast.success("Item deleted");
      setDeleteModal(false);
      fetchInventory();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete item");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="inventory-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventory</h1>
            <p className="text-muted-foreground">Manage parts and spares stock</p>
          </div>
          {isAdmin && (
            <Button onClick={openAddModal} data-testid="add-item-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Box className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_items}</p>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.low_stock_count}</p>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.out_of_stock}</p>
                    <p className="text-sm text-muted-foreground">Out of Stock</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(stats.total_selling_value)}</p>
                    <p className="text-sm text-muted-foreground">Stock Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {[...new Set([...CATEGORIES, ...categories])].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={lowStockOnly ? "default" : "outline"}
                onClick={() => setLowStockOnly(!lowStockOnly)}
                data-testid="low-stock-filter"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Low Stock
              </Button>
              <Button type="submit" data-testid="search-btn">
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card className="card-shadow">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No items found</p>
                <p className="text-muted-foreground">
                  {search || categoryFilter !== "all" || lowStockOnly
                    ? "Try adjusting your filters"
                    : "Add your first inventory item"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} data-testid={`inventory-row-${item.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.supplier && (
                            <p className="text-xs text-muted-foreground">{item.supplier}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>
                        {item.category && <Badge variant="secondary">{item.category}</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-bold ${item.is_low_stock ? "text-red-500" : ""}`}>
                            {item.quantity}
                          </span>
                          {item.is_low_stock && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Min: {item.min_stock_level}</p>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.cost_price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.selling_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAdjustModal(item)}
                            data-testid={`adjust-${item.id}`}
                          >
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                data-testid={`edit-${item.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => openDeleteModal(item)}
                                data-testid={`delete-${item.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Item Modal */}
      <Dialog open={itemModal} onOpenChange={setItemModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Item Name *</Label>
                <Input
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="iPhone 14 Screen"
                  data-testid="item-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={itemForm.sku}
                  onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                  placeholder="Auto-generated"
                  data-testid="item-sku-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(v) => setItemForm({ ...itemForm, category: v })}
                >
                  <SelectTrigger data-testid="item-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 })}
                  data-testid="item-quantity-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Stock Level</Label>
                <Input
                  type="number"
                  min="0"
                  value={itemForm.min_stock_level}
                  onChange={(e) => setItemForm({ ...itemForm, min_stock_level: parseInt(e.target.value) || 0 })}
                  data-testid="item-min-stock-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.cost_price}
                  onChange={(e) => setItemForm({ ...itemForm, cost_price: parseFloat(e.target.value) || 0 })}
                  data-testid="item-cost-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Selling Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.selling_price}
                  onChange={(e) => setItemForm({ ...itemForm, selling_price: parseFloat(e.target.value) || 0 })}
                  data-testid="item-price-input"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Supplier</Label>
                <Input
                  value={itemForm.supplier}
                  onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })}
                  placeholder="Supplier name"
                  data-testid="item-supplier-input"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                  data-testid="item-description-input"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem} disabled={actionLoading} data-testid="save-item-btn">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Modal */}
      <Dialog open={adjustModal} onOpenChange={setAdjustModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="font-medium">{selectedItem.name}</p>
                <p className="text-sm text-muted-foreground">
                  Current Stock: <span className="font-bold">{selectedItem.quantity}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Quantity Change</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAdjustForm({ ...adjustForm, quantity_change: adjustForm.quantity_change - 1 })}
                  >
                    <TrendingDown className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustForm.quantity_change}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity_change: parseInt(e.target.value) || 0 })}
                    className="text-center"
                    data-testid="adjust-quantity-input"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAdjustForm({ ...adjustForm, quantity_change: adjustForm.quantity_change + 1 })}
                  >
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  New Stock: {selectedItem.quantity + adjustForm.quantity_change}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Input
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g., Used in repair, Restocked, Damaged..."
                  data-testid="adjust-reason-input"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustStock} disabled={actionLoading} data-testid="adjust-stock-btn">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adjust Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <p>
              Are you sure you want to delete <strong>{selectedItem.name}</strong>? This action cannot
              be undone.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading} data-testid="confirm-delete-btn">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
