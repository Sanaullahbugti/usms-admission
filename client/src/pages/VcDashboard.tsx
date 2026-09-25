const programs = [
  {
    name: "BS Computer Science",
    code: "FACULTY OF ENG. & TECH · CODE: DCS-01",
    sanctioned: "120",
    demand: "640",
    pressure: "5.3x",
    pressureTone: "crimson" as const,
    cutoff: "81.20%",
    status: "FULL CAPACITY" as const,
    ratified: "120 / 120",
  },
  {
    name: "BS Software Engineering",
    code: "FACULTY OF ENG. & TECH · CODE: DSE-02",
    sanctioned: "100",
    demand: "480",
    pressure: "4.8x",
    pressureTone: "crimson" as const,
    cutoff: "79.50%",
    status: "FULL CAPACITY" as const,
    ratified: "100 / 100",
  },
  {
    name: "BS Artificial Intelligence",
    code: "INSTITUTE OF INFO TECH · CODE: DAI-03",
    sanctioned: "60",
    demand: "310",
    pressure: "5.1x",
    pressureTone: "crimson" as const,
    cutoff: "78.90%",
    status: "FULL CAPACITY" as const,
    ratified: "60 / 60",
  },
  {
    name: "Bachelor of Business Admin (BBA)",
    code: "IBA JAMSHORO · CODE: IBA-01",
    sanctioned: "150",
    demand: "412",
    pressure: "2.7x",
    pressureTone: "ink" as const,
    cutoff: "69.80%",
    status: "SATURATED" as const,
    ratified: "150 / 150",
  },
  {
    name: "BS Information Technology",
    code: "INSTITUTE OF INFO TECH · CODE: DIT-04",
    sanctioned: "100",
    demand: "390",
    pressure: "3.9x",
    pressureTone: "crimson" as const,
    cutoff: "75.00%",
    status: "FULL CAPACITY" as const,
    ratified: "100 / 100",
  },
];

export function VcDashboard() {
  return (
    <main className="vc-canvas">
      <section className="vc-chamber" id="chamber">
        <div className="vc-ruling">
          <div className="vc-chamber-copy">
            <div className="vc-chamber-kicker">
              <span>[§] UNIVERSITAS SINDHENSIS</span>
              <span>·</span>
              <span>ACT XIV, SEC 3(1-A)</span>
              <span>·</span>
              <span>CHAMBER INSTRUMENT #9812</span>
            </div>
            <h2>Decree of Merit List Ratification</h2>
            <p>
              Be it known to all statutory colleges, faculties, and constituent institutes: The Vice Chancellor in Syndicate,
              having reviewed the authenticated rolls of Undergraduate Admissions for the Academic Year 2027, hereby
              places this provisional merit instrument before the high chamber for formal promulgation.
            </p>
          </div>
          <div className="vc-wax" aria-hidden="true">
            <span className="ms vc-icon-lg">shield</span>
            <span className="vc-wax-name">Synodus Sindh</span>
            <span className="vc-wax-ord">ORD·IV·LXXIV</span>
            <span className="vc-wax-act">1972·ACT</span>
          </div>
        </div>

        <div className="vc-checks">
          <article>
            <div className="vc-check-mark" aria-hidden="true">
              <span className="ms vc-icon-sm">check</span>
            </div>
            <div>
              <div className="vc-check-title">Bank Escrow Reconciled</div>
              <p>All 1,842 bank challans verified across NBP Jamshoro &amp; HBL University branches via dual cryptographic reconciliation.</p>
              <div className="vc-check-ref">TREASURY SEC. REG: #TR-88120</div>
            </div>
          </article>
          <article>
            <div className="vc-check-mark" aria-hidden="true">
              <span className="ms vc-icon-sm">check</span>
            </div>
            <div>
              <div className="vc-check-title">Biometric &amp; Domicile Match</div>
              <p>NADRA Form-B / CNIC identity verification and Assistant Commissioner domicile certificates cleared at 100.0%.</p>
              <div className="vc-check-ref">PRV-STAT: CLEARED (29 DISTS)</div>
            </div>
          </article>
          <article>
            <div className="vc-check-mark" aria-hidden="true">
              <span className="ms vc-icon-sm">check</span>
            </div>
            <div>
              <div className="vc-check-title">Rural Quota Statutory Quorum</div>
              <p>30.0% mandatory rural quota strictly preserved with 626 candidates allocated in adherence to Senate Ordinance VI.</p>
              <div className="vc-check-ref">QUOTA MARGIN: +4.0% SURPLUS</div>
            </div>
          </article>
        </div>

        <div className="vc-chamber-foot">
          <div className="vc-chamber-actions">
            <button className="vc-btn vc-btn-crimson vc-btn-lg" type="button">
              <span className="ms">gavel</span>
              <span>Ratify &amp; Promulgate 1st Provisional Merit List</span>
            </button>
            <button className="vc-btn vc-btn-outline" type="button">
              <span className="ms">send</span>
              <span>Transmit to Official University Gazette</span>
            </button>
            <button className="vc-btn vc-btn-quiet" type="button" onClick={() => window.print()}>
              <span className="ms">print</span>
              <span>Print Decree Rolls</span>
            </button>
          </div>
          <div className="vc-auth-block">
            <div>
              <div className="vc-kicker is-upper">Authenticated Digital Seal</div>
              <div className="vc-auth-name">Dr. Ghulam M. Pathan</div>
              <div className="vc-auth-role">Registrar &amp; Keeper of Records</div>
            </div>
            <div className="vc-auth-seal">SEAL</div>
          </div>
        </div>
        <div className="vc-chamber-note">
          <span>COUNCIL CODE: SINDH-SYN-LXXIV-ORD4</span>
          <span>RECORDED UNDER PARAGRAPH 14 OF UNIVERSITY OF SINDH STATUTES</span>
        </div>
      </section>

      <section className="vc-sheet" id="sensitivity">
        <header className="vc-sheet-head">
          <div>
            <div className="vc-sheet-kicker">[§] Sensitivity Simulation Instrument</div>
            <h3>Statutory Eligibility Threshold Modeling</h3>
            <p>Simulating cohort admissibility across Senate-approved minimum entry cutoffs without breaching statutory quota thresholds.</p>
          </div>
          <div className="vc-rule-chip">
            <span>Current Applied Rule:</span>
            <strong>50.0% HEC STANDARD</strong>
          </div>
        </header>
        <div className="vc-models">
          <article className="vc-model">
            <div className="vc-model-top">
              <span>Projection α · Senate Discretion</span>
              <em>Relaxed</em>
            </div>
            <div className="vc-model-rate">45.0%</div>
            <div className="vc-model-name">Relaxed Senate Quorum Threshold</div>
            <p>Permits regional affirmative intake from underrepresented districts. Generates auxiliary seat overflow.</p>
            <dl>
              <div>
                <dt>Admissible Pool:</dt>
                <dd>1,780 Candidates</dd>
              </div>
              <div>
                <dt>Projected Seat Fill:</dt>
                <dd>99.2% (2,083 Seats)</dd>
              </div>
              <div>
                <dt>HEC Compliance:</dt>
                <dd className="is-crimson">Requires Syndicate Waiver</dd>
              </div>
            </dl>
            <button className="vc-btn vc-btn-line" type="button">
              Simulate 45.0% Model
            </button>
          </article>

          <article className="vc-model is-canonical">
            <div className="vc-model-flag">Canonical Benchmark (Active)</div>
            <div className="vc-model-top">
              <span className="is-crimson">Projection β · Regulatory Benchmark</span>
              <em className="is-live">HEC § 12</em>
            </div>
            <div className="vc-model-rate">50.0%</div>
            <div className="vc-model-name is-ink">HEC Statutory Standard Cutoff</div>
            <p>Official federal benchmark. Optimally satisfies faculty faculty-to-student ratios while securing full budget allocation.</p>
            <dl>
              <div>
                <dt>Admissible Pool:</dt>
                <dd>1,489 Candidates</dd>
              </div>
              <div>
                <dt>Projected Seat Fill:</dt>
                <dd>94.8% (1,842 Seats)</dd>
              </div>
              <div>
                <dt>Treasury Impact:</dt>
                <dd>PKR 0 Attrition (Balanced)</dd>
              </div>
            </dl>
            <button className="vc-btn vc-btn-navy" type="button">
              Locked in Ratification Roll
            </button>
          </article>

          <article className="vc-model">
            <div className="vc-model-top">
              <span>Projection γ · Merit Rigor</span>
              <em>Selective</em>
            </div>
            <div className="vc-model-rate">55.0%</div>
            <div className="vc-model-name">Selective Academic Rigor Model</div>
            <p>Elevates percentile quality in STEM programs but risks vacant seats in basic social sciences disciplines.</p>
            <dl>
              <div>
                <dt>Admissible Pool:</dt>
                <dd>1,114 Candidates</dd>
              </div>
              <div>
                <dt>Projected Seat Fill:</dt>
                <dd className="is-crimson">71.4% (1,500 Seats)</dd>
              </div>
              <div>
                <dt>Treasury Impact:</dt>
                <dd className="is-crimson">-PKR 1.2M Attrition</dd>
              </div>
            </dl>
            <button className="vc-btn vc-btn-line" type="button">
              Simulate 55.0% Model
            </button>
          </article>
        </div>
      </section>

      <section className="vc-sheet" id="seat-demand">
        <header className="vc-sheet-head">
          <div>
            <div className="vc-sheet-kicker">[§] Admissions Quota Register · Vol. IV</div>
            <h3>Departmental Sanction &amp; Quota Demand Ledger</h3>
            <p>Statutory verification of department cutoffs, application pressure multipliers, and final seat saturation.</p>
          </div>
          <div className="vc-sheet-actions">
            <button className="vc-btn vc-btn-soft" type="button">
              <span className="ms vc-icon-sm">filter_list</span>
              <span>Filter Faculties</span>
            </button>
            <button className="vc-btn vc-btn-line is-crimson" type="button">
              <span className="ms vc-icon-sm">file_download</span>
              <span>Export CSV Roll</span>
            </button>
          </div>
        </header>
        <div className="vc-ledger">
          <table>
            <thead>
              <tr>
                <th>Discipline &amp; Statutory Code</th>
                <th>Sanctioned</th>
                <th>Demand Pool</th>
                <th>Pressure Factor</th>
                <th>Closing Cutoff</th>
                <th>Status / Capacity</th>
                <th>Ratified Seats</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program.code}>
                  <td>
                    <div className="vc-discipline">{program.name}</div>
                    <div className="vc-discipline-code">{program.code}</div>
                  </td>
                  <td className="num">{program.sanctioned}</td>
                  <td className="num is-demand">{program.demand}</td>
                  <td className={`num is-pressure is-${program.pressureTone}`}>{program.pressure}</td>
                  <td className="num is-bold">{program.cutoff}</td>
                  <td className="vc-status-cell">
                    <span className={program.status === "FULL CAPACITY" ? "vc-pill is-full" : "vc-pill"}>{program.status}</span>
                  </td>
                  <td className="num is-bold">{program.ratified}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Discipline Subtotal (Priority Programs)</td>
                <td className="num">530</td>
                <td className="num">2,232</td>
                <td className="num is-crimson">4.2x Avg</td>
                <td className="num">76.88% Avg</td>
                <td className="vc-status-cell">
                  <span className="vc-subtotal-flag">100% RATIFIED</span>
                </td>
                <td className="num">530 / 530</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="vc-split">
        <section className="vc-sheet" id="quotas">
          <div>
            <header className="vc-sheet-head">
              <div>
                <div className="vc-sheet-kicker">[§] Statutory Compliance Audit</div>
                <h3>Provincial Equity &amp; Quota Distribution</h3>
              </div>
              <span className="vc-article-chip">Article 25-A Compliant</span>
            </header>
            <p className="vc-sheet-lead">
              Detailed apportionment of seats certified by the Directorate of Legal Affairs pursuant to Sindh Universities and Institutes Laws (Amendment) Act.
            </p>
            <div className="vc-quotas">
              <article>
                <div className="vc-quota-top">
                  <div>
                    <i className="is-navy" />
                    <span>Sindh Urban (Karachi, Hyderabad, Sukkur)</span>
                  </div>
                  <strong>
                    61.0% <span>/ 1,124 Seats</span>
                  </strong>
                </div>
                <div className="vc-bar">
                  <i className="is-navy" style={{ width: "61%" }} />
                </div>
                <div className="vc-quota-note">
                  <span>Target Mandate: 60.0% (±1.5%)</span>
                  <span className="is-ink">Variance: +1.0% (Within Tolerance)</span>
                </div>
              </article>
              <article>
                <div className="vc-quota-top">
                  <div>
                    <i className="is-crimson" />
                    <span>Sindh Rural (24 Districts Domiciled)</span>
                  </div>
                  <strong className="is-crimson">
                    34.0% <span>/ 626 Seats</span>
                  </strong>
                </div>
                <div className="vc-bar">
                  <i className="is-crimson" style={{ width: "34%" }} />
                </div>
                <div className="vc-quota-note">
                  <span>Target Mandate: 30.0% Minimum</span>
                  <span className="is-crimson">Surplus: +4.0% Affirmative Equity</span>
                </div>
              </article>
              <article>
                <div className="vc-quota-top">
                  <div>
                    <i className="is-bronze" />
                    <span>Inter-Provincial, Gilgit-Baltistan &amp; AJK Quota</span>
                  </div>
                  <strong>
                    5.0% <span>/ 92 Seats</span>
                  </strong>
                </div>
                <div className="vc-bar">
                  <i className="is-bronze" style={{ width: "5%" }} />
                </div>
                <div className="vc-quota-note">
                  <span>Statutory Allocation: 5.0% Flat</span>
                  <span className="is-ink">Allotted in Toto</span>
                </div>
              </article>
            </div>
          </div>
          <div className="vc-clearance">
            <div className="vc-clearance-copy">
              <span className="ms vc-icon-xl">verified</span>
              <div>
                <div className="vc-check-title">Directorate of Legal Affairs Clearance</div>
                <div className="vc-kicker">Ref: DLA/STAT/2025/OCT-094 · Advocate Supreme Court Signatory</div>
              </div>
            </div>
            <div className="vc-audit-approved">AUDIT APPROVED</div>
          </div>
        </section>

        <section className="vc-sheet" id="audit-feed">
          <div>
            <header className="vc-sheet-head">
              <div>
                <div className="vc-sheet-kicker">[§] Chronicle of Actions</div>
                <h3>Cryptographic Syndicate Audit Feed</h3>
              </div>
              <span className="vc-live-flag">
                <i />
                <span>REAL-TIME</span>
              </span>
            </header>
            <div className="vc-feed">
              <article className="is-crimson">
                <div className="vc-feed-meta">
                  <span>11:14:02 PKT · RECORD #8994</span>
                  <small>SHA256: 7d4a...e12b</small>
                </div>
                <div className="vc-check-title">HEC Statutory Quorum Clearance Signed</div>
                <p>Higher Education Commission regulatory liaison ratified program recognition for Session 2025–26 under Act VII.</p>
                <div className="vc-kicker">Officer: Registrar (Academic)</div>
              </article>
              <article className="is-navy">
                <div className="vc-feed-meta">
                  <span>10:48:33 PKT · RECORD #8993</span>
                  <small>SHA256: 4b92...f881</small>
                </div>
                <div className="vc-check-title">Deans&apos; Committee Cutoff Consensus Ratified</div>
                <p>Council of Faculty Deans passed unanimously the 50.0% baseline with affirmative weighting for disadvantaged districts.</p>
                <div className="vc-kicker">Officer: Dean Faculty of Arts &amp; Social Sciences</div>
              </article>
              <article>
                <div className="vc-feed-meta">
                  <span>09:12:19 PKT · RECORD #8992</span>
                  <small>SHA256: a19f...389c</small>
                </div>
                <div className="vc-check-title">Treasury Reconciliation Certified</div>
                <p>Director of Finance signed off PKR 6,447,000 admission fees ledger deposited in NBP Escrow A/C #00129-4.</p>
                <div className="vc-kicker">Officer: Director Finance</div>
              </article>
            </div>
          </div>
          <div className="vc-feed-foot">
            <button className="vc-btn vc-btn-navy vc-btn-block" type="button">
              <span className="ms">picture_as_pdf</span>
              <span>Download Certified Syndicate Roll (PDF)</span>
            </button>
            <div className="vc-feed-secure">DIGITALLY SECURED WITH 4096-BIT RSA SYNODUS CERTIFICATE</div>
          </div>
        </section>
      </div>
    </main>
  );
}
