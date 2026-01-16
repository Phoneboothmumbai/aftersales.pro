import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Shield,
  Scale,
  FileText,
  AlertTriangle,
  Edit,
  Eye,
  RotateCcw,
  Loader2,
  Check,
  ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAGES = [
  {
    key: "privacy_policy",
    title: "Privacy Policy",
    icon: Shield,
    enabledKey: "privacy_enabled",
    description: "Required by GDPR, CCPA, and most privacy regulations"
  },
  {
    key: "terms_of_service",
    title: "Terms of Service",
    icon: Scale,
    enabledKey: "terms_enabled",
    description: "Defines the rules users must agree to"
  },
  {
    key: "refund_policy",
    title: "Refund Policy",
    icon: FileText,
    enabledKey: "refund_enabled",
    description: "Required for payment processing compliance"
  },
  {
    key: "disclaimer",
    title: "Disclaimer",
    icon: AlertTriangle,
    enabledKey: "disclaimer_enabled",
    description: "Limits liability and sets expectations"
  }
];

export default function LegalPagesSettings() {
  const [legalPages, setLegalPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [previewPage, setPreviewPage] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchLegalPages();
  }, []);

  const fetchLegalPages = async () => {
    try {
      const response = await axios.get(`${API}/tenants/legal-pages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLegalPages(response.data);
    } catch (error) {
      console.error("Failed to fetch legal pages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setEditContent(legalPages[page.key] || "");
    setEditEnabled(legalPages[page.enabledKey] !== false);
  };

  const handleSave = async () => {
    if (!editingPage) return;
    setSaving(true);
    try {
      await axios.put(
        `${API}/tenants/legal-pages/${editingPage.key}`,
        { content: editContent, is_enabled: editEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchLegalPages();
      setEditingPage(null);
      setSuccessMessage(`${editingPage.title} updated successfully`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (pageKey) => {
    if (!window.confirm("Reset to default content? Your customizations will be lost.")) return;
    try {
      await axios.post(
        `${API}/tenants/legal-pages/reset/${pageKey}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchLegalPages();
      setSuccessMessage("Page reset to default");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to reset:", error);
    }
  };

  const handleToggleEnabled = async (page) => {
    try {
      await axios.put(
        `${API}/tenants/legal-pages/${page.key}`,
        { 
          content: legalPages[page.key], 
          is_enabled: !legalPages[page.enabledKey] 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchLegalPages();
    } catch (error) {
      console.error("Failed to toggle:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3 flex items-center gap-2 text-green-400">
          <Check className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Legal Pages</h3>
          <p className="text-sm text-slate-400">
            Manage your regulatory compliance pages. These are required for most businesses.
          </p>
        </div>
        <a
          href="/legal/privacy_policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
        >
          <ExternalLink className="w-4 h-4" />
          View Live Pages
        </a>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAGES.map((page) => {
          const Icon = page.icon;
          const isEnabled = legalPages[page.enabledKey] !== false;
          
          return (
            <Card key={page.key} className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isEnabled ? "bg-green-600/20" : "bg-slate-700"
                    }`}>
                      <Icon className={`w-5 h-5 ${isEnabled ? "text-green-400" : "text-slate-500"}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{page.title}</h4>
                      <p className="text-xs text-slate-400">{page.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggleEnabled(page)}
                      data-testid={`toggle-${page.key}`}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(page)}
                    className="flex-1 border-slate-600"
                    data-testid={`edit-${page.key}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewPage(page)}
                    className="border-slate-600"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReset(page.key)}
                    className="text-slate-400 hover:text-white"
                    title="Reset to default"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Links */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <p className="text-sm text-slate-400 mb-3">Public Links (share with customers):</p>
          <div className="flex flex-wrap gap-2">
            {PAGES.filter(p => legalPages[p.enabledKey] !== false).map((page) => (
              <a
                key={page.key}
                href={`/legal/${page.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-full"
              >
                {page.title}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editingPage} onOpenChange={() => setEditingPage(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingPage && <editingPage.icon className="w-5 h-5 text-red-500" />}
              Edit {editingPage?.title}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="edit" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-slate-700 mb-4">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="flex-1 overflow-hidden mt-0">
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <Label>Content (Markdown supported)</Label>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-slate-400">Page Enabled</Label>
                    <Switch
                      checked={editEnabled}
                      onCheckedChange={setEditEnabled}
                    />
                  </div>
                </div>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 min-h-[400px] bg-slate-900 border-slate-600 font-mono text-sm resize-none"
                  placeholder="Enter page content in Markdown format..."
                />
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 overflow-auto mt-0">
              <div className="bg-slate-900 rounded-lg p-6 min-h-[400px] prose prose-invert prose-slate max-w-none
                prose-headings:text-white
                prose-h1:text-xl prose-h2:text-lg
                prose-p:text-slate-300
                prose-li:text-slate-300
                prose-strong:text-white
              ">
                <ReactMarkdown>{editContent}</ReactMarkdown>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="ghost" onClick={() => setEditingPage(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewPage} onOpenChange={() => setPreviewPage(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewPage && <previewPage.icon className="w-5 h-5 text-red-500" />}
              {previewPage?.title} Preview
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-invert prose-slate max-w-none
            prose-headings:text-white
            prose-h1:text-xl prose-h2:text-lg
            prose-p:text-slate-300
            prose-li:text-slate-300
            prose-strong:text-white
          ">
            <ReactMarkdown>{previewPage ? legalPages[previewPage.key] : ""}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
