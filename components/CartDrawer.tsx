'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import {
  ADDON_OPTIONS,
  BLOOMS,
  DELIVERY_FEE_INR,
  DELIVERY_SLOTS,
  FREE_DELIVERY_THRESHOLD_INR,
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  formatINR,
  getRibbonById,
  getWrapById,
  type CartBouquetItem,
} from '@/lib/bouquet-data';

interface CartDrawerProps {
  open: boolean;
  items: CartBouquetItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onNotify: (message: string) => void;
}

type DrawerView = 'bag' | 'checkout' | 'confirmed';
type PaymentMethod = 'upi' | 'card';

function getTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function CartDrawer({
  open,
  items,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onNotify,
}: CartDrawerProps) {
  const [view, setView] = useState<DrawerView>('bag');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<string>(getTomorrowIso);
  const [deliverySlotId, setDeliverySlotId] = useState<string>(DELIVERY_SLOTS[0].id);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const [confirmedReceipt, setConfirmedReceipt] = useState<{
    orderId: string;
    totalInr: number;
    recipientName: string;
    deliveryDate: string;
    slotLabel: string;
    paymentLabel: string;
    itemCount: number;
  } | null>(null);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0),
    [items]
  );

  const deliveryFee =
    subtotal >= FREE_DELIVERY_THRESHOLD_INR || subtotal === 0 ? 0 : DELIVERY_FEE_INR;
  const grandTotal = subtotal + deliveryFee;

  const selectedSlot =
    DELIVERY_SLOTS.find((s) => s.id === deliverySlotId) ?? DELIVERY_SLOTS[0];

  const whatsAppText = useMemo(
    () =>
      buildWhatsAppOrderMessage({
        items,
        recipientName,
        deliveryDate,
        deliverySlot: `${selectedSlot.label} (${selectedSlot.window})`,
        address,
        totalInr: grandTotal,
      }),
    [items, recipientName, deliveryDate, selectedSlot, address, grandTotal]
  );

  const whatsAppHref = useMemo(
    () => buildWhatsAppUrl(whatsAppText),
    [whatsAppText]
  );

  const handleCopyWhatsAppSummary = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppText);
      setCopiedWhatsApp(true);
      onNotify('WhatsApp order summary copied to clipboard');
      window.setTimeout(() => setCopiedWhatsApp(false), 2600);
    } catch {
      onNotify('Opening WhatsApp order summary');
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!recipientName.trim()) {
      setFormError('Please enter the recipient name.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!address.trim()) {
      setFormError('Please enter the delivery address.');
      return;
    }
    if (!deliveryDate) {
      setFormError('Please choose a delivery date.');
      return;
    }
    if (paymentMethod === 'upi' && !upiId.includes('@')) {
      setFormError('Please enter a valid UPI ID (e.g. name@okaxis) or switch to Card.');
      return;
    }
    if (paymentMethod === 'card' && cardNumber.replace(/\D/g, '').length < 12) {
      setFormError('Please enter a valid card number.');
      return;
    }

    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

    setConfirmedReceipt({
      orderId: `FRC-${orderNum}`,
      totalInr: grandTotal,
      recipientName: recipientName.trim(),
      deliveryDate,
      slotLabel: `${selectedSlot.label} (${selectedSlot.window})`,
      paymentLabel:
        paymentMethod === 'upi' ? `UPI / Razorpay (${upiId.trim()})` : 'Credit / Debit Card',
      itemCount: totalQty,
    });
    onClearCart();
    setView('confirmed');
    onNotify(`Order #FRC-${orderNum} confirmed`);
  };

  const handleClose = () => {
    if (view === 'confirmed') {
      setView('bag');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Bag and Checkout"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-[#17271C]/50 backdrop-blur-[2px]"
          />

          {/* Slide-Out Glassmorphic Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative z-10 w-full max-w-lg h-full bg-[#FAF7F2]/96 backdrop-blur-md border-l border-[#C8B288]/45 shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-[#A7C0A8]/35 flex items-center justify-between gap-4 shrink-0 bg-[#FAF7F2]">
              <div>
                <h2 className="font-serif text-2xl text-[#17271C] leading-none">
                  {view === 'bag' && 'Your Bag'}
                  {view === 'checkout' && 'Delivery & Payment'}
                  {view === 'confirmed' && 'Order Confirmed'}
                </h2>
                {view !== 'confirmed' && (
                  <p className="text-xs text-[#4F6D52] mt-1 tabular-nums">
                    {items.length === 0
                      ? 'No bouquets added yet'
                      : `${items.reduce((s, i) => s + i.quantity, 0)} bouquet${
                          items.reduce((s, i) => s + i.quantity, 0) > 1 ? 's' : ''
                        } · ${formatINR(grandTotal)}`}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close bag drawer"
                className="w-9 h-9 rounded-full border border-[#A7C0A8]/50 text-[#17271C] hover:bg-[#EBF1EC] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto atelier-scroll px-6 py-5">
              {/* VIEW 1: ITEMIZED BAG */}
              {view === 'bag' && (
                <>
                  {items.length === 0 ? (
                    <div className="py-16 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-[#EBF1EC] border border-[#C8B288]/50 flex items-center justify-center mb-4 text-[#4F6D52]">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <p className="font-serif text-2xl text-[#17271C] mb-1.5">
                        Your bag is empty
                      </p>
                      <p className="text-xs sm:text-sm text-[#4F6D52] max-w-xs mb-6 leading-relaxed">
                        Design your own custom bouquet or pick one of our
                        popular ready-made bouquets to start.
                      </p>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-6 py-2.5 rounded-full bg-[#17271C] text-[#EDE0C9] text-xs font-semibold tracking-wide hover:bg-[#243B2B] transition-colors"
                      >
                        Design Your Bouquet
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {items.map((item) => {
                        const wrap = getWrapById(item.config.wrapId);
                        const ribbon = getRibbonById(item.config.ribbonId);
                        const stemRows = BLOOMS.filter(
                          (b) => (item.config.stems[b.id] || 0) > 0
                        );
                        const addonRows = ADDON_OPTIONS.filter((a) =>
                          item.config.addons.includes(a.id)
                        );

                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl p-4 sm:p-5 bg-[#FAF7F2] border border-[#C8B288]/50"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <h3 className="font-serif text-xl text-[#17271C] leading-snug">
                                  {item.title}
                                </h3>
                                <p className="text-xs text-[#4F6D52] mt-0.5">
                                  {wrap.name} · {ribbon.name}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.id)}
                                aria-label={`Remove ${item.title}`}
                                className="p-1.5 text-[#4F6D52] hover:text-[#7F1D2B] transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Itemized Stem Breakdown */}
                            <div className="py-2.5 border-y border-[#A7C0A8]/30 space-y-1.5 text-xs">
                              {stemRows.map((bloom) => {
                                const qty = item.config.stems[bloom.id];
                                return (
                                  <div
                                    key={bloom.id}
                                    className="flex items-center justify-between text-[#17271C]/85"
                                  >
                                    <span>
                                      {qty} × {bloom.name}
                                    </span>
                                    <span className="tabular-nums text-[#4F6D52]">
                                      {formatINR(qty * bloom.priceInr)}
                                    </span>
                                  </div>
                                );
                              })}
                              {addonRows.map((addon) => (
                                <div
                                  key={addon.id}
                                  className="flex items-center justify-between text-[#17271C]/85 pt-1 border-t border-dashed border-[#A7C0A8]/35"
                                >
                                  <span>+ {addon.name}</span>
                                  <span className="tabular-nums text-[#4F6D52]">
                                    {formatINR(addon.priceInr)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Gift Note Display */}
                            {item.config.giftNote.trim() && (
                              <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-[#EBF1EC]/75 border border-[#C8B288]/40">
                                <p className="text-[11px] font-medium text-[#4F6D52] mb-0.5">
                                  Hanging Tag Note
                                </p>
                                <p className="font-serif italic text-sm text-[#17271C]">
                                  “{item.config.giftNote.trim()}”
                                </p>
                              </div>
                            )}

                            {/* Quantity & Line Total */}
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.id, -1)}
                                  aria-label="Decrease quantity"
                                  className="w-7 h-7 rounded-full border border-[#A7C0A8] flex items-center justify-center text-[#17271C] hover:bg-[#EBF1EC]"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.id, 1)}
                                  aria-label="Increase quantity"
                                  className="w-7 h-7 rounded-full border border-[#A7C0A8] flex items-center justify-center text-[#17271C] hover:bg-[#EBF1EC]"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <p className="font-serif text-xl font-semibold text-[#17271C] tabular-nums">
                                {formatINR(item.unitPriceInr * item.quantity)}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Totals Breakdown */}
                      <div className="rounded-2xl p-4 bg-[#EBF1EC]/65 border border-[#A7C0A8]/40 space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between text-[#17271C]/80">
                          <span>Bouquets Subtotal</span>
                          <span className="tabular-nums font-medium">
                            {formatINR(subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[#17271C]/80">
                          <span>Fresh Delivery</span>
                          <span className="tabular-nums font-medium text-[#4F6D52]">
                            {deliveryFee === 0 ? 'Free' : formatINR(deliveryFee)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-[#A7C0A8]/40 flex justify-between font-semibold text-[#17271C]">
                          <span>Total</span>
                          <span className="tabular-nums text-base">
                            {formatINR(grandTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* VIEW 2: DELIVERY SCHEDULE & PAYMENT */}
              {view === 'checkout' && (
                <form id="atelier-checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">
                  <button
                    type="button"
                    onClick={() => setView('bag')}
                    className="text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors"
                  >
                    ← Back to Bag Summary
                  </button>

                  {/* Recipient & Address */}
                  <div className="space-y-3">
                    <h3 className="font-serif text-xl text-[#17271C]">
                      Recipient Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#4F6D52] mb-1">
                          Recipient Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="e.g. Ananya Sharma"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/60 text-sm text-[#17271C] focus:outline-none focus:ring-2 focus:ring-[#4F6D52]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#4F6D52] mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/60 text-sm text-[#17271C] focus:outline-none focus:ring-2 focus:ring-[#4F6D52]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#4F6D52] mb-1">
                        Delivery Address
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House/Flat no., Street, Locality, City & PIN"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/60 text-sm text-[#17271C] focus:outline-none focus:ring-2 focus:ring-[#4F6D52] resize-none"
                      />
                    </div>
                  </div>

                  {/* Delivery Date & Time Slot */}
                  <div className="space-y-3">
                    <h3 className="font-serif text-xl text-[#17271C]">
                      Delivery Date & Time Slot
                    </h3>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[#4F6D52] mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Preferred Delivery Date</span>
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/60 text-sm text-[#17271C] focus:outline-none focus:ring-2 focus:ring-[#4F6D52]"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {DELIVERY_SLOTS.map((slot) => {
                        const selected = deliverySlotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setDeliverySlotId(slot.id)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-colors ${
                              selected
                                ? 'bg-[#EBF1EC] border-[#4F6D52] text-[#17271C]'
                                : 'bg-[#FAF7F2] border-[#A7C0A8]/40 text-[#17271C]/80 hover:bg-[#EBF1EC]/50'
                            }`}
                          >
                            <span className="inline-flex items-center gap-2 text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5 text-[#4F6D52]" />
                              {slot.label}
                            </span>
                            <span className="text-xs text-[#4F6D52] tabular-nums">
                              {slot.window}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Options */}
                  <div className="space-y-3">
                    <h3 className="font-serif text-xl text-[#17271C]">
                      Payment Method
                    </h3>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                          paymentMethod === 'upi'
                            ? 'bg-[#17271C] text-[#EDE0C9] border-[#17271C]'
                            : 'bg-[#FAF7F2] text-[#17271C] border-[#A7C0A8]/55 hover:bg-[#EBF1EC]'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 shrink-0" />
                        <span>UPI / Razorpay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                          paymentMethod === 'card'
                            ? 'bg-[#17271C] text-[#EDE0C9] border-[#17271C]'
                            : 'bg-[#FAF7F2] text-[#17271C] border-[#A7C0A8]/55 hover:bg-[#EBF1EC]'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 shrink-0" />
                        <span>Credit / Debit Card</span>
                      </button>
                    </div>

                    {paymentMethod === 'upi' ? (
                      <div className="p-3.5 rounded-xl bg-[#EBF1EC]/65 border border-[#A7C0A8]/45 space-y-2">
                        <label className="block text-xs font-medium text-[#4F6D52]">
                          UPI ID (GPay, PhonePe, Paytm, BHIM via Razorpay)
                        </label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@okhdfcbank"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/60 text-sm text-[#17271C] focus:outline-none focus:ring-2 focus:ring-[#4F6D52]"
                        />
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-[#EBF1EC]/65 border border-[#A7C0A8]/45 space-y-2.5">
                        <div>
                          <label className="block text-xs font-medium text-[#4F6D52] mb-1">
                            Card Number
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="4532 8910 2234 5678"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/60 text-sm text-[#17271C] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#4F6D52]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM / YY"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/60 text-sm text-[#17271C] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#4F6D52]"
                          />
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="CVV"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/60 text-sm text-[#17271C] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#4F6D52]"
                          />
                        </div>
                      </div>
                    )}

                    {formError && (
                      <p
                        role="alert"
                        className="text-xs font-medium text-[#7F1D2B] bg-[#7F1D2B]/10 border border-[#7F1D2B]/25 rounded-xl px-3.5 py-2.5"
                      >
                        {formError}
                      </p>
                    )}

                    <p className="flex items-center gap-1.5 text-[11px] text-[#4F6D52]">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Freshness guarantee · Hand-tied minutes before dispatch
                      </span>
                    </p>
                  </div>
                </form>
              )}

              {/* VIEW 3: ORDER CONFIRMED RECEIPT */}
              {view === 'confirmed' && confirmedReceipt && (
                <div className="py-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#EBF1EC] border border-[#4F6D52]/40 flex items-center justify-center text-[#4F6D52] mb-5">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <p className="text-xs tracking-[0.22em] text-[#4F6D52] font-medium mb-1.5">
                    ORDER #{confirmedReceipt.orderId}
                  </p>
                  <h3 className="font-serif text-3xl text-[#17271C] mb-2">
                    Your Order Is Confirmed
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4F6D52] max-w-sm leading-relaxed mb-7">
                    Our FLOWER rchii florists have received your order for{' '}
                    {confirmedReceipt.recipientName}.
                  </p>

                  <div className="w-full rounded-2xl p-5 bg-[#EBF1EC]/70 border border-[#C8B288]/55 text-left space-y-2.5 text-xs sm:text-sm mb-7">
                    <div className="flex justify-between">
                      <span className="text-[#4F6D52]">Delivery Date</span>
                      <span className="font-medium text-[#17271C] tabular-nums">
                        {confirmedReceipt.deliveryDate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4F6D52]">Time Slot</span>
                      <span className="font-medium text-[#17271C]">
                        {confirmedReceipt.slotLabel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4F6D52]">Payment</span>
                      <span className="font-medium text-[#17271C]">
                        {confirmedReceipt.paymentLabel}
                      </span>
                    </div>
                    <div className="pt-2.5 border-t border-[#C8B288]/40 flex justify-between font-semibold text-[#17271C]">
                      <span>Amount Paid ({confirmedReceipt.itemCount} item{confirmedReceipt.itemCount > 1 ? 's' : ''})</span>
                      <span className="tabular-nums text-base">
                        {formatINR(confirmedReceipt.totalInr)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-3.5 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#243B2B] text-sm font-semibold tracking-wide transition-colors"
                  >
                    Create Another Bouquet
                  </button>
                </div>
              )}
            </div>

            {/* Sticky Drawer Footer */}
            {view !== 'confirmed' && items.length > 0 && (
              <div className="px-6 py-4 bg-[#FAF7F2] border-t border-[#C8B288]/45 space-y-2.5 shrink-0">
                {view === 'bag' ? (
                  <button
                    type="button"
                    onClick={() => setView('checkout')}
                    className="w-full py-3.5 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#243B2B] text-sm font-semibold tracking-wide transition-colors"
                  >
                    Proceed to Checkout · {formatINR(grandTotal)}
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="atelier-checkout-form"
                    className="w-full py-3.5 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#243B2B] text-sm font-semibold tracking-wide transition-colors"
                  >
                    Confirm & Pay · {formatINR(grandTotal)}
                  </button>
                )}

                {/* Order on WhatsApp Summary Action */}
                <div className="flex items-center gap-2">
                  <a
                    href={whatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onNotify('Opening WhatsApp order summary')}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border border-[#4F6D52]/55 bg-[#EBF1EC]/75 text-[#17271C] hover:bg-[#4F6D52] hover:text-[#FAF7F2] text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Order on WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppSummary}
                    title="Copy WhatsApp order summary"
                    aria-label="Copy WhatsApp order summary"
                    className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-full border border-[#C8B288]/60 text-[#17271C] hover:bg-[#EDE0C9]/45 text-xs font-medium transition-colors shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedWhatsApp ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
