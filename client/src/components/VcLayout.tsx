import { useEffect, useState, type MouseEvent } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { hasRole } from "../types/auth";

const mastLinks = [
  { href: "#chamber", label: "Statutory Chamber" },
  { href: "#merit-rolls", label: "Merit Ratification" },
  { href: "#sensitivity", label: "Sensitivity Thresholds" },
  { href: "#seat-demand", label: "Seat & Demand Ledger" },
  { href: "#audit-feed", label: "Cryptographic Ledger" },
];

const railLinks = [
  { href: "#chamber", label: "Chamber Overview", icon: "account_balance" },
  { href: "#merit-rolls", label: "Provisional Merit Rolls", icon: "assignment_turned_in" },
  { href: "#sensitivity", label: "Sensitivity Thresholds", icon: "tune" },
  { href: "#seat-demand", label: "Seat & Demand Ledger", icon: "table_chart" },
  { href: "#quotas", label: "Provincial Quotas", icon: "policy" },
  { href: "#audit-feed", label: "Immutable Ledger", icon: "lock" },
];

function sectionActive(href: string, hash: string) {
  if (href === "#chamber") {
    return hash === "" || hash === "#chamber";
  }
  return hash === href;
}

function openSection(event: MouseEvent<HTMLAnchorElement>, href: string, setHash: (value: string) => void) {
  event.preventDefault();
  const id = href.slice(1);
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", href);
  setHash(href);
}

export function VcLayout() {
  const { user, logout } = useAuth();
  const isSuperAdmin = hasRole(user, "SUPER_ADMIN");
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "SYNDICATE GAZETTE & RECORD OF PROCEEDINGS — Session LXXIV";
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      document.title = previousTitle;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return (
    <div className="vc-shell">
      <header className="vc-masthead">
        <div className="vc-brand">
          <img className="usms-logo" src="/usms-logo.png" alt="University of Sufism and Modern Sciences" />
          <div>
            <div className="vc-stamps">
              <span className="vc-stamp">ORDINANCE IV/2025-26</span>
              <span className="vc-stamp-meta">SESSION LXXIV · EXTRAORDINARY RATIFICATION</span>
            </div>
            <h1>Syndicate Gazette &amp; Record of Proceedings</h1>
          </div>
        </div>

        <nav className="vc-mast-nav" aria-label="Gazette sections">
          {mastLinks.map((link) => (
            <a
              key={link.href}
              className={sectionActive(link.href, hash) ? "is-active" : undefined}
              href={link.href}
              onClick={(event) => openSection(event, link.href, setHash)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="vc-identity">
          <div className="vc-identity-copy">
            <strong>Prof. Dr. A. Q. Mahar, SI</strong>
            <small>Vice Chancellor &amp; Syndicate Chair</small>
          </div>
          <div className="vc-signet" title="Registrar Seal and Portrait of Vice Chancellor" aria-hidden="true">
            <span className="ms">verified</span>
          </div>
          <button className="vc-btn vc-btn-ghost" type="button" onClick={() => void logout()}>
            Registrar Sign-Off
          </button>
          <button className="vc-btn vc-btn-crimson" type="button">
            <span className="ms">gavel</span>
            <span>Enact Ordinance</span>
          </button>
        </div>
      </header>

      <section className="vc-strip" aria-label="Statutory broadsheet summary">
        <div className="vc-strip-grid">
          <article>
            <span className="ms vc-strip-icon is-crimson">account_balance_wallet</span>
            <div>
              <div className="vc-kicker is-upper">Realized Treasury Intake</div>
              <div className="vc-figure">PKR 6,447,000</div>
              <div className="vc-kicker">NBP &amp; HBL Direct Escrow Verified</div>
            </div>
          </article>
          <article>
            <span className="ms vc-strip-icon">how_to_reg</span>
            <div>
              <div className="vc-kicker is-upper">Total Sanctioned Cohort</div>
              <div className="vc-figure">
                1,842 <span> / 2,100 Seats</span>
              </div>
              <div className="vc-kicker">87.7% Academic Seat Utilization</div>
            </div>
          </article>
          <article>
            <span className="ms vc-strip-icon">fact_check</span>
            <div>
              <div className="vc-kicker is-upper">Statutory Admissibility Rate</div>
              <div className="vc-figure">
                80.8% <span className="vc-kicker is-plain is-crimson">(HEC § 12 Compliance)</span>
              </div>
              <div className="vc-kicker">2,279 Total Candidates Evaluated</div>
            </div>
          </article>
          <article className="vc-strip-status">
            <div>
              <div className="vc-kicker is-upper">Session Quorum Status</div>
              <div className="vc-quorum">
                <i />
                <span>SYNODUS RATIFIED</span>
              </div>
              <div className="vc-kicker">19 of 21 Syndicate Members Sitting</div>
            </div>
            <div className="vc-sync">SYNC: 09:44:12 PKT</div>
          </article>
        </div>
      </section>

      <div className="vc-body">
        <aside className="vc-rail">
          <div>
            <div className="vc-rail-brand">
              <div className="vc-rail-mark" aria-hidden="true">
                SA
              </div>
              <div>
                <h2>Synodus Academica</h2>
                <p>Session LXXIV · Extraordinary Sitting</p>
              </div>
            </div>
            <nav className="vc-rail-nav" aria-label="Statutory index">
              {railLinks.map((link) => (
                <a
                  key={link.href}
                  className={sectionActive(link.href, hash) ? "is-active" : undefined}
                  href={link.href}
                  onClick={(event) => openSection(event, link.href, setHash)}
                >
                  <span className="ms">{link.icon}</span>
                  <span>{link.label}</span>
                </a>
              ))}
            </nav>
          </div>
          <div className="vc-rail-foot">
            <div className="vc-imprimatur">
              <div className="vc-imprimatur-kicker">
                <span className="ms vc-icon-sm">history_edu</span>
                <span>Archival Imprimatur</span>
              </div>
              <p>All resolutions recorded under the statutory hand and seal of the Registrar. Act XIV of 1972, Sec 3(c).</p>
            </div>
            <button className="vc-btn vc-btn-crimson vc-btn-block" type="button">
              <span className="ms">verified_user</span>
              <span>Seal Record</span>
            </button>
            <div className="vc-rail-links">
              <a href="#chamber" onClick={(event) => openSection(event, "#chamber", setHash)}>
                <span className="ms vc-icon-sm">menu_book</span>
                <span>Statutory Decrees</span>
              </a>
              <a href="#audit-feed" onClick={(event) => openSection(event, "#audit-feed", setHash)}>
                <span className="ms vc-icon-sm">shield</span>
                <span>Legal Codices</span>
              </a>
            </div>
            {isSuperAdmin ? (
              <NavLink className="vc-officer-link" to="/admin/dashboard">
                Officer workspace
              </NavLink>
            ) : null}
          </div>
        </aside>
        <Outlet />
      </div>

      <footer className="vc-footer">
        <div className="vc-footer-brand">
          <div className="vc-footer-mark" aria-hidden="true">
            §
          </div>
          <div>
            <span className="vc-footer-name">University of Sindh Jamshoro</span>
            <span className="vc-footer-note"> — The Official Gazette &amp; Record of Proceedings of Synodus Academica</span>
          </div>
        </div>
        <div className="vc-footer-meta">
          <span>STATUTORY YEAR: 2025–2026</span>
          <span>·</span>
          <span>GAZETTE REGISTRY: PK-SN-JAM-004</span>
          <span>·</span>
          <span className="is-crimson">RATIFIED SITTING LXXIV</span>
        </div>
      </footer>
    </div>
  );
}
