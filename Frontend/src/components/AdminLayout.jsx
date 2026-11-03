import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ChefHat,
  ClipboardList,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  PartyPopper,
  Settings,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "./ui";

import { adminApi } from "../lib/api";
import { useFeedback } from "./feedback";

const nav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/admin/orders",
    label: "Orders",
    icon: ClipboardList,
    badge: "orders",
  },
  { to: "/admin/products", label: "Products", icon: UtensilsCrossed },
  { to: "/admin/availability", label: "Availability", icon: CalendarDays },
  {
    to: "/admin/catering",
    label: "Catering",
    icon: ChefHat,
    badge: "catering",
  },
  {
    to: "/admin/event-planning",
    label: "Event planning",
    icon: PartyPopper,
    badge: "event",
  },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* sound is optional */
  }
}

/** Checks for new orders and inquiries every 30 seconds while the dashboard is open. */
function useActivityAlerts(enabled) {
  const { toast } = useFeedback();
  const [counts, setCounts] = useState({ orders: 0, catering: 0, event: 0 });
  const previous = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;
    const check = async () => {
      try {
        const { data } = await adminApi.get("/dashboard/summary/", {
          params: { days: 1 },
        });
        if (stopped) return;
        const next = {
          orders: data.orders.pending,
          catering: data.catering.new_catering_inquiries,
          event: data.catering.new_event_inquiries,
        };
        const before = previous.current;
        if (before) {
          if (next.orders > before.orders) {
            toast("New order received!", "info");
            beep();
          }
          if (next.catering > before.catering || next.event > before.event) {
            toast("New catering / event inquiry!", "info");
            beep();
          }
        }
        previous.current = next;
        setCounts(next);
      } catch {
        /* try again on the next check */
      }
    };
    check();
    const timer = setInterval(check, 30000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [enabled, toast]);

  // Show the number of things waiting in the browser tab title.
  const total = counts.orders + counts.catering + counts.event;
  useEffect(() => {
    if (!enabled) return undefined;
    document.title = total > 0 ? `(${total}) Cake Factory` : "Cake Factory";
    return () => {
      document.title = "Cake Factory";
    };
  }, [enabled, total]);

  return counts;
}

export default function AdminLayout() {
  const { user, checking, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const alerts = useActivityAlerts(Boolean(user))

  if (checking) return <PageLoader />;
  if (!user)
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );

  const item = ({ isActive }) =>
    `flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "bg-berry-500 text-white shadow-md shadow-berry-500/25"
        : "text-cocoa-200 hover:bg-white/10 hover:text-white"
    }`;

  const sidebar = (
    <div className="flex h-full flex-col bg-cocoa-900 p-4">
      <Link
        to="/admin/dashboard"
        className="mb-6 flex items-center gap-2 px-2 pt-2"
      >
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-berry-500 text-xl">
          🎂
        </span>
        <span>
          <span className="block font-display text-lg font-bold leading-tight text-white">
            Cake Factory
          </span>
          <span className="block text-xs text-cocoa-300">Business manager</span>
        </span>
      </Link>
      <nav
        className="flex-1 space-y-1 overflow-y-auto"
        aria-label="Admin"
        onClick={() => setOpen(false)}
      >
        {nav.map(({ to, label, icon: Icon, badge }) => (
          <NavLink key={to} to={to} className={item}>
            <Icon className="h-5 w-5" /> {label}
            {badge && alerts[badge] > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-caramel-400 px-1.5 text-[11px] font-bold text-cocoa-900">
                {alerts[badge]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold text-cocoa-200 hover:bg-white/10"
        >
          <ExternalLink className="h-5 w-5" /> View website
        </a>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold text-cocoa-200 hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" /> Sign out
        </button>
        <p className="px-4 text-xs text-cocoa-400">
          Signed in as {user.username}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cocoa-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        {sidebar}
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between bg-cocoa-900 px-4 py-3 text-white lg:hidden">
        <span className="font-display text-lg font-bold">🎂 Cake Factory</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-full p-2 hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-cocoa-900/60" />
          <div
            className="absolute inset-y-0 left-0 w-72 animate-slide"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-3 top-3 z-10 rounded-full p-2 text-white hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="px-4 py-6 sm:px-8 lg:ml-64 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-cocoa-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
