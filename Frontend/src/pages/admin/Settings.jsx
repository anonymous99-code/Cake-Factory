import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { PageHeader } from "../../components/AdminLayout";
import { useFeedback } from "../../components/feedback";
import {
  ErrorBox,
  Field,
  Input,
  PageLoader,
  Textarea,
} from "../../components/ui";
import { useSettings } from "../../context/SettingsContext";
import { adminApi, errorMessage, fieldErrors } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";

export default function Settings() {
  const { data, loading, error, reloadLoud } = useFetch(
    () => adminApi.get("/dashboard/settings/").then((r) => r.data),
    [],
  );
  const { refresh } = useSettings();
  const { toast } = useFeedback();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data)
      setForm({
        ...data,
        free_delivery_threshold: data.free_delivery_threshold ?? "",
      });
  }, [data]);

  if (loading && !form) return <PageLoader />;
  if (error) return <ErrorBox message={error} onRetry={reloadLoud} />;
  if (!form) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.checked }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const { updated_at, ...body } = form;
      body.free_delivery_threshold =
        form.free_delivery_threshold === ""
          ? null
          : form.free_delivery_threshold;
      await adminApi.patch("/dashboard/settings/", body);
      toast("Settings saved");
      refresh();
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      toast(Object.values(fe)[0] || errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const Check = ({ k, label, hint }) => (
    <label className="flex items-start gap-3 rounded-2xl bg-cocoa-50 p-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-cocoa-300 text-berry-500 focus:ring-berry-400"
        checked={form[k]}
        onChange={toggle(k)}
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-xs text-cocoa-500">{hint}</span>
      </span>
    </label>
  );

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Business details and rules. Changes appear on the website immediately."
      />
      <form onSubmit={save} className="space-y-6">
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Business</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <Input
                value={form.business_name}
                onChange={set("business_name")}
              />
            </Field>
            <Field label="Tagline">
              <Input value={form.tagline} onChange={set("tagline")} />
            </Field>
          </div>
          <Field
            label="About us (shown on the About page)"
            hint="Tell your story. Leave a blank line between paragraphs."
          >
            <Textarea
              rows={5}
              value={form.about_text}
              onChange={set("about_text")}
            />
          </Field>
        </section>

        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Contact &amp; location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="WhatsApp number"
              error={errors.whatsapp_number}
              hint="With country code, no + or spaces. Example: 2348012345678. The WhatsApp buttons stay hidden until this is filled in."
            >
              <Input
                value={form.whatsapp_number}
                onChange={set("whatsapp_number")}
                error={errors.whatsapp_number}
                inputMode="numeric"
              />
            </Field>
            <Field label="Phone number">
              <Input value={form.phone_number} onChange={set("phone_number")} />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={set("email")}
                error={errors.email}
              />
            </Field>
            <Field
              label="Google Maps link"
              error={errors.google_maps_url}
              hint="Paste the share link from Google Maps."
            >
              <Input
                value={form.google_maps_url}
                onChange={set("google_maps_url")}
                error={errors.google_maps_url}
              />
            </Field>
          </div>
          <Field label="Address">
            <Textarea rows={2} value={form.address} onChange={set("address")} />
          </Field>
          <Field label="Opening hours">
            <Textarea
              rows={2}
              value={form.opening_hours}
              onChange={set("opening_hours")}
              placeholder={"Mon–Sat: 8am – 6pm"}
            />
          </Field>
        </section>
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <Field
            label="Email for new orders and inquiries"
            error={errors.notify_email}
            hint="We email this address every time a customer places an order or sends a catering or event inquiry. It is not shown on the website."
          >
            <Input
              type="email"
              value={form.notify_email}
              onChange={set("notify_email")}
              error={errors.notify_email}
              placeholder="you@example.com"
            />
          </Field>
        </section>
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Orders &amp; delivery</h2>
          <Check
            k="accepts_orders"
            label="Accept online orders"
            hint="Turn this off to pause ordering, for example when you are closed or fully booked."
          />
          <Check
            k="delivery_enabled"
            label="Offer delivery"
            hint="If off, customers can only choose pickup."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Delivery fee (₦)" error={errors.delivery_fee}>
              <Input
                type="number"
                min="0"
                value={form.delivery_fee}
                onChange={set("delivery_fee")}
                error={errors.delivery_fee}
              />
            </Field>
            <Field
              label="Free delivery from (₦)"
              hint="Leave empty for no free-delivery offer."
            >
              <Input
                type="number"
                min="0"
                value={form.free_delivery_threshold}
                onChange={set("free_delivery_threshold")}
              />
            </Field>
            <Field label="Book up to (days ahead)">
              <Input
                type="number"
                min="1"
                value={form.max_advance_days}
                onChange={set("max_advance_days")}
              />
            </Field>
            <Field label="Low-stock warning at (units)">
              <Input
                type="number"
                min="0"
                value={form.low_stock_threshold}
                onChange={set("low_stock_threshold")}
              />
            </Field>
          </div>
          <Field
            label="Delivery policy"
            hint="Shown to customers who choose delivery: areas covered, timing, etc."
          >
            <Textarea
              rows={3}
              value={form.delivery_policy}
              onChange={set("delivery_policy")}
            />
          </Field>
        </section>

        <div className="sticky bottom-4 flex justify-end">
          <button
            className="btn btn-primary btn-lg shadow-soft"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}{" "}
            Save settings
          </button>
        </div>
      </form>
    </>
  );
}
