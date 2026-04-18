import { auth } from "@/auth";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

type Role = "admin" | "manager" | "hr" | "accounting" | "staff" | string;

const ROLE_ACCESS: {
  label: string;
  modules: { name: string; href: string; roles: string[] }[];
}[] = [
  {
    label: "Core records",
    modules: [
      {
        name: "Dashboard",
        href: "/",
        roles: ["admin", "manager", "hr", "accounting", "staff"],
      },
      {
        name: "Clients & Deceased",
        href: "/clients",
        roles: ["admin", "manager", "hr", "accounting", "staff"],
      },
      {
        name: "Services",
        href: "/services",
        roles: ["admin", "manager", "hr", "accounting", "staff"],
      },
      {
        name: "Service Packages",
        href: "/packages",
        roles: ["admin", "manager", "hr", "accounting", "staff"],
      },
    ],
  },
  {
    label: "Money in / out",
    modules: [
      {
        name: "Payments",
        href: "/payments",
        roles: ["admin", "manager", "hr", "accounting", "staff"],
      },
      {
        name: "Expenses",
        href: "/expenses",
        roles: ["admin", "manager", "accounting"],
      },
      {
        name: "Liabilities",
        href: "/liabilities",
        roles: ["admin", "manager", "accounting"],
      },
    ],
  },
  {
    label: "Operations",
    modules: [
      {
        name: "Inventory",
        href: "/inventory",
        roles: ["admin", "manager", "accounting", "staff"],
      },
      {
        name: "Suppliers",
        href: "/suppliers",
        roles: ["admin", "manager", "accounting", "staff"],
      },
    ],
  },
  {
    label: "People",
    modules: [
      {
        name: "Employees",
        href: "/employees",
        roles: ["admin", "manager", "hr"],
      },
      {
        name: "Payroll",
        href: "/payroll",
        roles: ["admin", "manager", "hr"],
      },
    ],
  },
  {
    label: "Reporting",
    modules: [
      {
        name: "Reports",
        href: "/reports",
        roles: ["admin", "manager", "hr", "accounting", "staff"],
      },
      { name: "Accounting", href: "/accounting", roles: ["admin", "accounting"] },
    ],
  },
  {
    label: "Admin",
    modules: [{ name: "Admin Panel", href: "/admin", roles: ["admin"] }],
  },
];

function canAccess(role: Role, modRoles: string[]): boolean {
  return modRoles.includes(role);
}

export default async function GuidePage() {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role: Role = (session?.user as any)?.role ?? "staff";

  return (
    <div>
      <PageHeader
        title="How to Use"
        subtitle="Daily workflow, module guides, and end-of-month reporting"
      />

      <div className="card bg-[var(--brand-bg-alt)] mb-6">
        <p className="text-sm">
          You are signed in as{" "}
          <span
            className={`badge badge-${role === "admin" ? "active" : "warn"} capitalize`}
          >
            {role}
          </span>
          . The sections below highlight what <em>you</em> can do — but the
          monthly flow and module guides are shown in full so everyone has
          the same mental model.
        </p>
      </div>

      <Section num={1} title="The Monthly Flow (big picture)">
        <ol className="list-decimal pl-6 flex flex-col gap-2 text-sm">
          <li>
            <strong>Record a new client</strong> when a family contacts you.
            Capture the deceased&apos;s details and the family contact.
          </li>
          <li>
            <strong>Create a service</strong> for that client — pick a package
            or set custom pricing, enter wake / burial dates and location. If
            an embalmer is assigned, pick them and set the fee for this body.
          </li>
          <li>
            <strong>Record payments</strong> as the family pays (from the
            service page). Full or partial — you&apos;ll always see the
            remaining balance.
          </li>
          <li>
            <strong>Log expenses</strong> as they occur. If an expense is for a
            specific service (flowers, casket, transport for <em>this</em>{" "}
            body), link it to the service — that&apos;s how direct costs
            become part of that service&apos;s profit calculation. Upload the
            receipt photo(s) while you&apos;re at it.
          </li>
          <li>
            <strong>Track liabilities</strong> (loans, credit, inter-company
            advances). When you make a payment on a loan, record it — the
            remaining balance updates automatically.
          </li>
          <li>
            <strong>Run payroll</strong> twice a month. Use{" "}
            <em>Generate Cutoffs</em> to auto-create the 1–15 and 16–end
            periods, then <em>Add all missing</em> to seed entries for every
            active employee.
          </li>
          <li>
            <strong>End of month:</strong> open <Link href="/accounting" className="text-[var(--brand-blue)] underline">Accounting</Link>,
            pick the month, review the partner distributions and Company Fund
            balance, then <em>Print / Save as PDF</em> and send it to Larry
            and Eduardo.
          </li>
        </ol>
        <p className="text-xs text-[#4a5678] mt-3">
          Share splits happen <em>immediately</em> when services get paid. The
          Company Fund (the 50% share) absorbs overhead + liability payments +
          salaries, so it can go negative in a light month — that&apos;s fine,
          it&apos;ll net out against next month&apos;s services.
        </p>
      </Section>

      <Section num={2} title="Your Access">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {ROLE_ACCESS.map((group) => (
            <div key={group.label} className="bg-[var(--brand-bg-alt)] rounded-lg p-3">
              <div className="font-bold mb-2">{group.label}</div>
              <ul className="flex flex-col gap-1">
                {group.modules.map((m) => {
                  const ok = canAccess(role, m.roles);
                  return (
                    <li
                      key={m.name}
                      className={`flex items-center gap-2 ${ok ? "" : "opacity-50 line-through"}`}
                    >
                      {ok ? (
                        <Link
                          href={m.href}
                          className="text-[var(--brand-blue)] hover:underline"
                        >
                          ✓ {m.name}
                        </Link>
                      ) : (
                        <span>✗ {m.name}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section num={3} title="Module Guides">
        <div className="flex flex-col gap-3">
          <HowTo
            title="Clients & Deceased"
            path="/clients"
            steps={[
              "Click + New Record.",
              "Fill the deceased section (name, age, gender, date of death, cause). Only first + last names are required.",
              "Fill the family contact section (name, relationship, phone).",
              "Add any extra notes and Save.",
              "From the client detail page you can add a Service directly — this is the usual next step.",
            ]}
            tips={[
              "You can edit or delete a client. Delete only works if all services for that client are cancelled.",
            ]}
          />
          <HowTo
            title="Services"
            path="/services"
            steps={[
              "Click + New Service, pick the client (or use + Add Service from the client page).",
              "Pick a package — the total auto-fills with the package price. You can override.",
              "Set wake start/end and burial date, plus burial location.",
              "If an embalmer handled this body, pick them under Embalmer and enter the fee for this service. That fee automatically rolls up to their next payroll period.",
              "Status is active by default. From the service detail page you can Mark Completed or Cancel.",
            ]}
            tips={[
              "Every payment / expense linked to this service feeds into the per-service profit on the Accounting page.",
              "If the burial is in 3 days and no full payment has been received, the Dashboard will alert you.",
            ]}
          />
          <HowTo
            title="Payments (from the family)"
            path="/payments"
            steps={[
              "Open the service detail page. Scroll to Record Payment.",
              "Enter date, amount, method (cash / GCash / Maya / bank / cheque), reference number and notes.",
              "Click Record Payment. The remaining balance updates and the 25 / 25 / 50 split is reflected immediately on the Accounting page.",
              "To edit a past payment, click Edit on the row. To remove a wrongly-entered payment, Delete.",
            ]}
          />
          <HowTo
            title="Expenses"
            path="/expenses"
            steps={[
              "Click + New Expense.",
              "Enter date and amount.",
              "Pick a category, or choose + Add new category… to create one on the fly (e.g. Flowers, Fuel, Utilities).",
              "Pick an Account / Source (optional — e.g., Main Bank Account).",
              "Pick a Linked Service IF the expense is for a specific body. This is how it becomes a direct cost on that service's profit calc. Leave blank for overhead (rent, utilities, office supplies).",
              "Describe what it was, add reference (invoice or OR number).",
              "Attach receipt photos — one via Receipt field, or many via Additional Receipts. Phone photos work fine.",
              "Save.",
            ]}
            tips={[
              "Overhead expenses come out of the Company Fund in the accounting report.",
              "To replace a receipt, pick a new file on the edit page — the old one is deleted automatically.",
            ]}
          />
          <HowTo
            title="Liabilities"
            path="/liabilities"
            steps={[
              "Click + New Liability for each loan, credit card, or supplier credit.",
              "Enter name, type, creditor, principal amount. Remaining balance defaults to the principal.",
              "Set due date and monthly payment if regular.",
              "On each repayment, open the liability, use Record Payment. Attach proof of payment receipts.",
              "Remaining balance auto-decreases; status flips to paid when it reaches 0.",
            ]}
            tips={[
              "If the Company Fund goes negative in a month, record the cover from Triple J Corp or Ascendryx Digital here as a new liability.",
              "Past payments are editable — adjusting the amount retroactively re-syncs the remaining balance.",
            ]}
          />
          <HowTo
            title="Inventory"
            path="/inventory"
            steps={[
              "Click + New Item. Enter the name (e.g. Premium Hardwood Casket).",
              "Pick category or + Add new category (e.g. Caskets, Urns, Flowers, Embalming Supplies).",
              "Set unit, quantity on hand, reorder level, cost/unit, selling price, location.",
              "Upload an item image — coffins / urns especially benefit from a photo so the branch recognises them at a glance.",
              "Save. The list shows a thumbnail column. Quantity turns red when at or below the reorder level.",
            ]}
            tips={[
              "Disable (not delete) items that still have stock movement history.",
              "Branch staff can add + edit inventory and suppliers — the system is designed for frontline use, not just admins.",
            ]}
          />
          <HowTo
            title="Suppliers"
            path="/suppliers"
            steps={[
              "Click + New Supplier.",
              "Enter business name, contact person, phone, email, address.",
              "Under Payment Details, record how you pay them (bank account, GCash, Maya, terms). This becomes a quick reference when you need to settle a bill.",
              "Save. On the list card you'll see the payment methods surfaced.",
            ]}
          />
          <HowTo
            title="Employees"
            path="/employees"
            steps={[
              "Click + New Employee. Fill First Name + Last Name (required).",
              "Pick Rate Type: monthly / daily / hourly / per_service. For per_service (e.g. embalmer), enter the default per-body fee under Rate Amount.",
              "Fill Government IDs (SSS, PhilHealth, Pag-IBIG, TIN) — used on payslips.",
              "Add emergency contact and 201 file extras as needed.",
              "Use Separate (not Delete) when someone leaves — preserves history and records a separation date + reason.",
            ]}
          />
          <HowTo
            title="Payroll"
            path="/payroll"
            steps={[
              "Click Generate Cutoffs, pick the month. Two periods are created: 1–15 (pay date 15th) and 16–end (pay date last day).",
              "Open a period. Click Add all N missing to seed entries for every active employee.",
              "For each entry, click Edit if you need to adjust: OT, absences, late, cash advances, bonuses, or any deduction notes.",
              "Mark Paid when you've released the money. The Accounting report sums paid salaries as a Company Fund outflow using the period's pay date.",
              "Click Payslip on any entry for a printable A4 payslip you can hand to the employee or Save as PDF.",
            ]}
            tips={[
              "Monthly rate employees: basic pay + statutory (SSS, PhilHealth, Pag-IBIG, tax) seed automatically at 50% for semi-monthly.",
              "Daily / hourly: basic is 0 on seed — enter manually based on days or hours worked.",
              "Per-service (embalmer, etc.): basic auto-fills with the sum of embalmer fees from services whose burial date falls inside the period.",
            ]}
          />
          {(role === "admin" || role === "accounting") && (
            <HowTo
              title="Accounting (monthly report)"
              path="/accounting"
              steps={[
                "Set View = By Month and pick the month to close.",
                "Review Partner Distributions — this is how much Larry, Eduardo and the Company Fund earned before and after overhead / liabilities / salaries.",
                "Review Per-Service Profit & Distribution — drill into any service to audit the numbers.",
                "Review Company Fund Cash Flow — this is the one-page P&L that shows the final balance. Negative is fine and recorded as-is.",
                "Scroll through Overhead, Liability Payments, Salaries Paid, and Debt Position for the supporting detail.",
                "Click Print / Save as PDF, choose Save as PDF in the browser dialog, send the file to Larry and Eduardo.",
              ]}
            />
          )}
          {role === "admin" && (
            <HowTo
              title="Admin Panel"
              path="/admin"
              steps={[
                "Profit Sharing — add / edit / disable partners. Active shares must total 100%. The biggest share is treated as the Company Fund.",
                "Add New User — invite staff (pick role: staff / manager / hr / accounting / admin). Usernames auto-lowercase on save.",
                "Per-user actions: change role on the fly, disable login, reset password, delete. The primary admin account can't be demoted or deleted.",
              ]}
            />
          )}
        </div>
      </Section>

      <Section num={4} title="End-of-Month Checklist">
        <ul className="list-disc pl-6 flex flex-col gap-1 text-sm">
          <li>All services for the month have their payments recorded.</li>
          <li>All expenses for the month are entered with receipts attached.</li>
          <li>
            Linked vs unlinked is correct — service-specific costs linked to
            the service, overhead left unlinked.
          </li>
          <li>All liability repayments this month are logged.</li>
          <li>
            Both payroll periods exist. Every entry that was paid this month
            is marked paid.
          </li>
          <li>
            Open <Link href="/accounting" className="text-[var(--brand-blue)] underline">Accounting</Link>
            {" "}→ By Month → Print / Save as PDF.
          </li>
          <li>Send the PDF to Larry and Eduardo.</li>
          <li>
            If the Company Fund is negative, record the cover from Triple J
            Corp or Ascendryx Digital as a new{" "}
            <Link
              href="/liabilities/new"
              className="text-[var(--brand-blue)] underline"
            >
              liability
            </Link>
            .
          </li>
        </ul>
      </Section>

      <Section num={5} title="Tips">
        <ul className="list-disc pl-6 flex flex-col gap-1 text-sm">
          <li>
            <strong>Attach receipts every time.</strong> Future-you will hate
            past-you otherwise. The app accepts phone photos up to 4 MB each,
            any count.
          </li>
          <li>
            <strong>Link expenses to services</strong> when they&apos;re for a
            specific family. That&apos;s what makes the partner split
            accurate.
          </li>
          <li>
            <strong>Cancel, don&apos;t delete,</strong> when a service or
            employee is no longer active — keeps history intact.
          </li>
          <li>
            <strong>Change your password</strong> in Profile on first login,
            and again if you suspect it&apos;s been shared.
          </li>
          <li>
            <strong>Print works everywhere.</strong> Any page with a Print
            button is laid out for A4 — use the browser&apos;s Save as PDF
            option to email it.
          </li>
        </ul>
      </Section>
    </div>
  );
}

function Section({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card mb-6">
      <h2 className="font-bold text-lg mb-3">
        <span className="text-[var(--brand-orange)]">{num}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

function HowTo({
  title,
  path,
  steps,
  tips,
}: {
  title: string;
  path: string;
  steps: string[];
  tips?: string[];
}) {
  return (
    <details className="bg-[var(--brand-bg-alt)] rounded-lg">
      <summary className="cursor-pointer px-4 py-3 font-semibold text-[var(--brand-navy)] flex items-center justify-between">
        <span>{title}</span>
        <Link
          href={path}
          className="text-[var(--brand-blue)] hover:underline text-xs font-normal"
          onClick={(e) => e.stopPropagation()}
        >
          Open →
        </Link>
      </summary>
      <div className="px-4 pb-4 text-sm flex flex-col gap-3">
        <ol className="list-decimal pl-6 flex flex-col gap-1">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {tips && tips.length > 0 && (
          <div className="bg-white rounded p-3 text-xs">
            <div className="font-bold mb-1 text-[var(--brand-orange)]">Tips</div>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              {tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
