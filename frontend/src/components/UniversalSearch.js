import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Search,
  ClipboardList,
  UserCircle,
  Package,
  Loader2,
  Phone,
  Smartphone,
} from "lucide-react";
import { getStatusColor, getStatusLabel } from "../lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function UniversalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if query is too short
    if (query.length < 2) {
      setResults([]);
      return;
    }

    // Debounce search
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/search?q=${encodeURIComponent(query)}&limit=15`);
        setResults(response.data.results || []);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelect = (result) => {
    setOpen(false);
    setQuery("");
    
    if (result.type === "job") {
      navigate(`/jobs/${result.id}`);
    } else if (result.type === "customer") {
      navigate(`/customers`);
    } else if (result.type === "inventory") {
      navigate(`/inventory`);
    }
  };

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const jobResults = results.filter((r) => r.type === "job");
  const customerResults = results.filter((r) => r.type === "customer");
  const inventoryResults = results.filter((r) => r.type === "inventory");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 w-full max-w-md px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border border-transparent hover:border-border transition-colors"
          onClick={() => setOpen(true)}
          data-testid="universal-search-trigger"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search jobs, customers, inventory...</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] sm:w-[500px] p-0" 
        align="start"
        sideOffset={8}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="w-4 h-4 text-muted-foreground mr-2" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by job #, customer, device, serial..."
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              data-testid="universal-search-input"
            />
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          <CommandList className="max-h-[400px] overflow-y-auto">
            {query.length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search...
              </div>
            ) : results.length === 0 && !loading ? (
              <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
            ) : (
              <>
                {/* Jobs */}
                {jobResults.length > 0 && (
                  <CommandGroup heading="Jobs">
                    {jobResults.map((result) => (
                      <CommandItem
                        key={`job-${result.id}`}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                        data-testid={`search-result-job-${result.id}`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ClipboardList className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">{result.job_number}</span>
                              <Badge className={`${getStatusColor(result.status)} text-xs`}>
                                {getStatusLabel(result.status)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {result.customer_name} • {result.device}
                            </p>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Customers */}
                {customerResults.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Customers">
                      {customerResults.map((result) => (
                        <CommandItem
                          key={`customer-${result.id}`}
                          onSelect={() => handleSelect(result)}
                          className="cursor-pointer"
                          data-testid={`search-result-customer-${result.id}`}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                              <UserCircle className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{result.customer_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                <span>{result.customer_mobile}</span>
                                <span>• {result.job_count} jobs</span>
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {/* Inventory */}
                {inventoryResults.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Inventory">
                      {inventoryResults.map((result) => (
                        <CommandItem
                          key={`inventory-${result.id}`}
                          onSelect={() => handleSelect(result)}
                          className="cursor-pointer"
                          data-testid={`search-result-inventory-${result.id}`}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{result.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono">{result.sku}</span>
                                <span>• Qty: {result.quantity}</span>
                                {result.category && <span>• {result.category}</span>}
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
