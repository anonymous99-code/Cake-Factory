import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { EmptyState, Field, Input, Textarea } from "../components/ui";
import { useCart } from "../context/CartContext";
import { useSettings } from "../context/SettingsContext";
import { api, errorMessage, fieldErrors } from "../lib/api";
import { fetchBookable } from "../lib/bookable";
import { formatDate, naira, toDateInput } from "../lib/format";

export default function Checkout() {
  const { lines, subtotal, clear, sync, bookingDate } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const today = toDateInput();
  const date = bookingDate || today; // the day chosen on the menu or cart page
  const isAdvance = date > today;

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    method: "PICKUP",
    time: "",
    delivery_address: "",
    delivery_notes: "",
    customer_notes: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const delivery = form.method === "DELIVERY";

  // Make sure prices and quantities are current before the customer pays attention to totals.
  useEffect(() => {
    if (lines.length)
      fetchBookable(bookingDate)
        .then(sync)
        .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deliveryFee = useMemo(() => {
    if (!delivery) return 0;
    const threshold = settings.free_delivery_threshold;
    if (threshold != null && subtotal >= Number(threshold)) return 0;
    return Number(settings.delivery_fee || 0);
  }, [delivery, settings, subtotal]);

  if (!lines.length) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Nothing to check out yet"
          action={
            <Link to="/menu" className="btn btn-primary">
              Browse the menu
            </Link>
          }
        >
          Add some items to your cart first.
        </EmptyState>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (form.customer_name.trim().length < 2)
      e.customer_name = "Please enter your name.";
    if (form.customer_phone.replace(/\D/g, "").length < 7)
      e.customer_phone = "Please enter a valid phone number.";
    if (form.customer_email && !/^\S+@\S+\.\S+$/.test(form.customer_email))
      e.customer_email = "That email does not look right.";
    if (delivery && !form.delivery_address.trim())
      e.delivery_address = "Please enter the delivery address.";
    return e;
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) {
      document
        .querySelector('[data-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const payload = {
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      customer_email: form.customer_email.trim(),
      fulfillment_method: form.method,
      customer_notes: form.customer_notes.trim(),
      items: lines.map((l) => ({
        product_id: l.product.id,
        quantity: l.quantity,
      })),
    };
    if (delivery) {
      payload.delivery_address = form.delivery_address.trim();
      payload.delivery_notes = form.delivery_notes.trim();
      payload.requested_delivery_date = date;
      if (form.time) payload.requested_delivery_time = form.time;
    } else {
      payload.requested_pickup_date = date;
      if (form.time) payload.requested_pickup_time = form.time;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/orders/", payload);
      clear();
      navigate(`/order/${data.order_number}`, { state: { justPlaced: true } });
    } catch (err) {
      const fe = fieldErrors(err);
      const mapped = {};
      if (fe.customer_name) mapped.customer_name = fe.customer_name;
      if (fe.customer_phone) mapped.customer_phone = fe.customer_phone;
      if (fe.delivery_address) mapped.delivery_address = fe.delivery_address;
      if (fe.requested_pickup_time || fe.requested_delivery_time)
        mapped.time = fe.requested_pickup_time || fe.requested_delivery_time;
      setErrors(mapped);
      setFormError(errorMessage(err));
      // Stock may have changed while the customer was typing.
      fetchBookable(bookingDate)
        .then(sync)
        .catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const invalid = (k) => (errors[k] ? { "data-invalid": "true" } : {});
  const methodCard = (value, Icon, title, text, disabled) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setForm((f) => ({ ...f, method: value }))}
      className={`flex flex-1 items-start gap-3 rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${form.method === value ? "border-berry-500 bg-berry-50" : "border-cocoa-200 bg-white hover:border-cocoa-300"}`}
      aria-pressed={form.method === value}
    >
      <Icon
        className={`mt-0.5 h-6 w-6 ${form.method === value ? "text-berry-600" : "text-cocoa-400"}`}
      />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-xs text-cocoa-500">{text}</span>
      </span>
    </button>
  );

  return (
    <div className="container-page py-10">
      <h1 className="section-title">Checkout</h1>
      {!settings.accepts_orders && (
        <div className="mt-6 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" /> We are not taking
          online orders right now. Please contact us instead.
        </div>
      )}
      <form
        onSubmit={submit}
        noValidate
        className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]"
      >
        <div className="space-y-6">
          <section className="card space-y-4">
            <h2 className="text-xl font-semibold">Your details</h2>
            <Field label="Full name" required error={errors.customer_name}>
              <Input
                {...invalid("customer_name")}
                error={errors.customer_name}
                value={form.customer_name}
                onChange={set("customer_name")}
                autoComplete="name"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Phone number"
                required
                error={errors.customer_phone}
                hint="We may call or WhatsApp you about your order."
              >
                <Input
                  {...invalid("customer_phone")}
                  error={errors.customer_phone}
                  type="tel"
                  value={form.customer_phone}
                  onChange={set("customer_phone")}
                  autoComplete="tel"
                  placeholder="0801 234 5678"
                />
              </Field>
              <Field
                label="Email (optional)"
                error={errors.customer_email}
                hint="For order updates by email."
              >
                <Input
                  {...invalid("customer_email")}
                  error={errors.customer_email}
                  type="email"
                  value={form.customer_email}
                  onChange={set("customer_email")}
                  autoComplete="email"
                />
              </Field>
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-xl font-semibold">Pickup or delivery</h2>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cocoa-50 p-3 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <CalendarClock className="h-4 w-4 text-berry-500" />
                {isAdvance
                  ? formatDate(date, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Today"}
              </span>
              <Link
                to="/cart"
                className="font-semibold text-berry-600 hover:underline"
              >
                Change date
              </Link>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {methodCard("PICKUP", Store, "Pickup", "Collect it yourself")}
              {methodCard(
                "DELIVERY",
                Truck,
                "Delivery",
                settings.delivery_enabled
                  ? "We bring it to you"
                  : "Not available right now",
                !settings.delivery_enabled,
              )}
            </div>
            {delivery && settings.delivery_policy && (
              <p className="rounded-2xl bg-cocoa-50 p-3 text-xs text-cocoa-600">
                {settings.delivery_policy}
              </p>
            )}
            {delivery && (
              <>
                <Field
                  label="Delivery address"
                  required
                  error={errors.delivery_address}
                >
                  <Textarea
                    {...invalid("delivery_address")}
                    error={errors.delivery_address}
                    value={form.delivery_address}
                    onChange={set("delivery_address")}
                    placeholder="House number, street, area"
                  />
                </Field>
                <Field label="Delivery instructions (optional)">
                  <Input
                    value={form.delivery_notes}
                    onChange={set("delivery_notes")}
                    placeholder="Landmark, gate code, call on arrival…"
                  />
                </Field>
              </>
            )}
            <Field
              label={
                isAdvance
                  ? "Preferred time on that day (optional)"
                  : "Preferred time today (optional)"
              }
              error={errors.time}
            >
              <Input
                error={errors.time}
                type="time"
                value={form.time}
                onChange={set("time")}
              />
            </Field>

            {isAdvance && (
              <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-100">
                <p className="flex items-center gap-2 font-semibold">
                  <CalendarClock className="h-4 w-4" /> Advance order
                </p>
                <p className="mt-1 text-xs text-sky-800">
                  We are reserving your items for {formatDate(date)}. We will
                  review and confirm your order before it is final.
                </p>
              </div>
            )}

            <Field label="Anything else we should know? (optional)">
              <Textarea
                value={form.customer_notes}
                onChange={set("customer_notes")}
                rows={2}
                placeholder="Allergies, packaging, special requests…"
              />
            </Field>
          </section>
        </div>

        <aside className="card h-fit space-y-4 lg:sticky lg:top-24">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <ul className="space-y-2 text-sm">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span className="text-cocoa-600">
                  {quantity} × {product.name}
                </span>
                <span className="font-semibold">
                  {naira(Number(product.price) * quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-cocoa-100 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-cocoa-500">Subtotal</span>
              <span>{naira(subtotal)}</span>
            </div>
            {delivery && (
              <div className="flex justify-between">
                <span className="text-cocoa-500">Delivery</span>
                <span>{deliveryFee ? naira(deliveryFee) : "Free"}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 font-display text-xl font-semibold">
              <span>Total</span>
              <span>{naira(subtotal + deliveryFee)}</span>
            </div>
          </div>
          <p className="text-xs text-cocoa-500">
            You will not be charged online. We confirm your order and agree on
            payment with you.
          </p>
          {formError && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100"
            >
              {formError}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={submitting || !settings.accepts_orders}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Placing order…
              </>
            ) : isAdvance ? (
              "Place advance order"
            ) : (
              "Place order"
            )}
          </button>
        </aside>
      </form>
    </div>
  );
}
