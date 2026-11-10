'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Edit3,
  Moon,
  Package,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  Store,
  Trash2,
  Vibrate,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePwaStatus } from '@/components/pwa/ServiceWorkerRegistrar';
import { triggerHaptic } from '@/lib/haptics';
import { formatINR } from '@/lib/math';
import { isValidUpiId } from '@/lib/upi';
import { useBillStore } from '@/store/useBillStore';
import type { InventoryItem } from '@/types/bill';

type SettingsSection = 'inventory' | 'shop';

const UNIT_OPTIONS = ['pc', 'kg', 'g', 'L', 'ml', 'pack', 'box', 'tray', 'btl'];
const CATEGORY_SUGGESTIONS = [
  'General',
  'Dairy',
  'Grains',
  'Essentials',
  'Beverages',
  'Bakery',
  'Snacks',
];

export function SettingsView() {
  const shopDetails = useBillStore((s) => s.shopDetails);
  const updateShopDetails = useBillStore((s) => s.updateShopDetails);
  const inventory = useBillStore((s) => s.inventory);
  const addInventoryItem = useBillStore((s) => s.addInventoryItem);
  const updateInventoryItem = useBillStore((s) => s.updateInventoryItem);
  const deleteInventoryItem = useBillStore((s) => s.deleteInventoryItem);
  const loadStarterInventory = useBillStore((s) => s.loadStarterInventory);
  const bills = useBillStore((s) => s.bills);
  const clearAllBills = useBillStore((s) => s.clearAllBills);
  const theme = useBillStore((s) => s.theme);
  const toggleTheme = useBillStore((s) => s.toggleTheme);
  const hapticsEnabled = useBillStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useBillStore((s) => s.setHapticsEnabled);

  const { canInstall, isInstalled, swReady, promptInstall } = usePwaStatus();

  const [section, setSection] = useState<SettingsSection>('shop');

  // Shop form local state synced cleanly on mount/save
  const [shopName, setShopName] = useState(shopDetails.shopName);
  const [phone, setPhone] = useState(shopDetails.phone);
  const [upiId, setUpiId] = useState(shopDetails.upiId);
  const [address, setAddress] = useState(shopDetails.address);
  const [gstin, setGstin] = useState(shopDetails.gstin);
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    String(shopDetails.defaultTaxRate)
  );
  const [shopSavedBanner, setShopSavedBanner] = useState(false);

  // Add inventory item state
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemUnit, setItemUnit] = useState('pc');
  const [itemCategory, setItemCategory] = useState('General');
  const [invSearch, setInvSearch] = useState('');

  // Edit inventory modal state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editUnit, setEditUnit] = useState('pc');
  const [editCategory, setEditCategory] = useState('General');

  // Confirm clear bills
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const filteredInventory = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [inventory, invSearch]);

  const handleSaveShop = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTax = parseFloat(defaultTaxRate);
    updateShopDetails({
      shopName: shopName.trim() || 'My Shop',
      phone: phone.trim(),
      upiId: upiId.trim(),
      address: address.trim(),
      gstin: gstin.trim().toUpperCase(),
      defaultTaxRate: Number.isNaN(parsedTax) ? 0 : parsedTax,
    });
    triggerHaptic('success', hapticsEnabled);
    setShopSavedBanner(true);
    setTimeout(() => setShopSavedBanner(false), 2600);
  };

  const handleAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(itemPrice);
    if (!itemName.trim() || Number.isNaN(price) || price < 0) return;

    addInventoryItem({
      name: itemName.trim(),
      price,
      unit: itemUnit.trim() || 'pc',
      category: itemCategory.trim() || 'General',
    });
    triggerHaptic('success', hapticsEnabled);
    setItemName('');
    setItemPrice('');
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditUnit(item.unit);
    setEditCategory(item.category);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const parsedPrice = parseFloat(editPrice);
    if (!editName.trim() || Number.isNaN(parsedPrice) || parsedPrice < 0) return;

    updateInventoryItem(editingItem.id, {
      name: editName.trim(),
      price: parsedPrice,
      unit: editUnit.trim() || 'pc',
      category: editCategory.trim() || 'General',
    });
    triggerHaptic('success', hapticsEnabled);
    setEditingItem(null);
  };

  const upiLooksValid = upiId.trim().length === 0 || isValidUpiId(upiId);

  return (
    <div className="space-y-4">
      {/* Sub-tab Segmented Control */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap', hapticsEnabled);
            setSection('shop');
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
            section === 'shop'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Store className="h-4 w-4" />
          Shop &amp; App
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap', hapticsEnabled);
            setSection('inventory');
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
            section === 'inventory'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Package className="h-4 w-4" />
          Inventory ({inventory.length})
        </button>
      </div>

      {section === 'shop' ? (
        <div className="space-y-4">
          {/* Shop Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Shop Profile &amp; UPI</CardTitle>
              <CardDescription>
                Printed at the top of every thermal receipt and encoded into your
                UPI payment QR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveShop} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="shop-name">Shop Name</Label>
                  <Input
                    id="shop-name"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Sharma Kirana & General Store"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="shop-phone">Phone Number</Label>
                    <Input
                      id="shop-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="shop-upi">Merchant UPI ID</Label>
                      {upiId.trim() ? (
                        <Badge
                          variant={upiLooksValid ? 'default' : 'amber'}
                          className="text-[10px] py-0"
                        >
                          {upiLooksValid ? 'Valid Format' : 'Check @handle'}
                        </Badge>
                      ) : null}
                    </div>
                    <Input
                      id="shop-upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. shopname@okicici"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="shop-address">Address / Tagline</Label>
                    <Input
                      id="shop-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Station Road, Pune"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="shop-gstin">GSTIN (Optional)</Label>
                    <Input
                      id="shop-gstin"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="e.g. 27ABCDE1234F1Z5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Default GST Rate for New Bills</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['0', '5', '12', '18'].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap', hapticsEnabled);
                          setDefaultTaxRate(rate);
                        }}
                        className={`h-9 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                          defaultTaxRate === rate
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'border-slate-200 bg-white text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={defaultTaxRate}
                      onChange={(e) => setDefaultTaxRate(e.target.value)}
                      className="h-9 text-center font-mono-receipt text-xs"
                    />
                  </div>
                </div>

                {shopSavedBanner ? (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Check className="h-4 w-4" />
                    Shop profile saved offline to IndexedDB
                  </div>
                ) : null}

                <Button type="submit" className="w-full">
                  Save Shop Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preferences & PWA Status */}
          <Card>
            <CardHeader>
              <CardTitle>Shift &amp; Device Controls</CardTitle>
              <CardDescription>
                Customize night mode, tactile feedback, and offline install
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <Moon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Night Shift Dark Mode</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      High-contrast dark POS interface
                    </p>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={() => {
                    triggerHaptic('tap', hapticsEnabled);
                    toggleTheme();
                  }}
                  aria-label="Toggle dark mode"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <Vibrate className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Haptic Feedback</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Vibrate on item taps and bill creation
                    </p>
                  </div>
                </div>
                <Switch
                  checked={hapticsEnabled}
                  onCheckedChange={(checked) => {
                    setHapticsEnabled(checked);
                    if (checked) triggerHaptic('tap', true);
                  }}
                  aria-label="Toggle haptic feedback"
                />
              </div>

              {/* Offline & Install Box */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <WifiOff className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Offline PWA Engine
                  </div>
                  <Badge variant={swReady ? 'default' : 'secondary'}>
                    {swReady ? 'Cached & Ready' : 'Initializing'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  All inventory items, shop details, and bills are persisted locally
                  in IndexedDB so Bill Book works seamlessly in Airplane Mode.
                </p>

                {canInstall ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => promptInstall()}
                    className="w-full"
                  >
                    <Download className="h-4 w-4" />
                    Install Bill Book to Home Screen
                  </Button>
                ) : isInstalled ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Smartphone className="h-3.5 w-3.5" />
                    Running as installed app
                  </div>
                ) : null}
              </div>

              {/* Clear History Guard */}
              {bills.length > 0 ? (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    <span>{bills.length} saved bills on device</span>
                  </div>
                  {confirmClearHistory ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          triggerHaptic('warning', hapticsEnabled);
                          clearAllBills();
                          setConfirmClearHistory(false);
                        }}
                      >
                        Confirm Clear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmClearHistory(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      onClick={() => setConfirmClearHistory(true)}
                    >
                      Clear History
                    </Button>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Add Inventory Item Card */}
          <Card>
            <CardHeader>
              <CardTitle>Add Inventory Item</CardTitle>
              <CardDescription>
                Items appear in the POS tap grid with their default price
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddInventory} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-item-name">Item Name</Label>
                  <Input
                    id="new-item-name"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Tata Salt 1kg"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-item-price">Price (₹)</Label>
                    <Input
                      id="new-item-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      required
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      placeholder="28"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-item-unit">Unit</Label>
                    <select
                      id="new-item-unit"
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-item-category">Category</Label>
                    <select
                      id="new-item-category"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                    >
                      {CATEGORY_SUGGESTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" />
                  Add Item to Catalog
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Manage Existing Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold tracking-tight">
                Saved Items ({inventory.length})
              </h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  triggerHaptic('tap', hapticsEnabled);
                  loadStarterInventory();
                }}
                className="text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Add Sample Items
              </Button>
            </div>

            {inventory.length > 0 ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <Input
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder="Filter saved items..."
                  className="pl-10"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              {filteredInventory.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                          {item.name}
                        </p>
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="mt-0.5 font-mono-receipt text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatINR(item.price)} / {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => openEditModal(item)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => {
                          triggerHaptic('remove', hapticsEnabled);
                          deleteInventoryItem(item.id);
                        }}
                        className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Inventory Item Modal */}
      <Dialog
        open={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update item name, default price, or category
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="px-5 pb-5 space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-item-name">Item Name</Label>
              <Input
                id="edit-item-name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="edit-item-price">Price (₹)</Label>
                <Input
                  id="edit-item-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-item-unit">Unit</Label>
                <select
                  id="edit-item-unit"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-item-category">Category</Label>
                <select
                  id="edit-item-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

