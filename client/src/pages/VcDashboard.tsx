import { useQuery } from "@tanstack/react-query";
import { applicationService } from "../services/applicationService";

export function VcDashboard() {
  const dashboard = useQuery({
    queryKey: ["vc-dashboard"],
    queryFn: () => applicationService.getVcDashboard(),
  });

  if (dashboard.isPending) {
    return <p>Loading executive dashboard...</p>;
  }

  if (!dashboard.data) {
    return <p>Could not load the VC dashboard.</p>;
  }

  const data = dashboard.data;

  return (
    <>
      <div className="vc-intel">
        <p>
          <strong>Executive Summary:</strong> {data.cycleName} is in {data.phase}.
          Demand, fee clearance, and program fill are shown from the current cycle briefing.
        </p>
      </div>

      <section className="vc-kpis">
        <article className="card">
          <span>Demand yield</span>
          <strong>
            {data.demandYield.applications.toLocaleString()}
            <em> / {data.demandYield.seats.toLocaleString()} seats</em>
          </strong>
          <div className="progress">
            <i style={{ width: `${data.demandYield.capacityPercent}%` }} />
          </div>
          <small>{data.demandYield.capacityPercent}% capacity</small>
        </article>
        <article className="card">
          <span>Eligible pool</span>
          <strong>
            {data.eligiblePool.qualified.toLocaleString()} <em>qualified</em>
          </strong>
          <div className="progress">
            <i className="success" style={{ width: `${data.eligiblePool.ratePercent}%` }} />
          </div>
          <small>{data.eligiblePool.ratePercent}% statutory rate</small>
        </article>
        <article className="card">
          <span>Fee realization</span>
          <strong>{data.feeRealization.amountLabel}</strong>
          <div className="progress">
            <i style={{ width: `${data.feeRealization.clearedPercent}%` }} />
          </div>
          <small>{data.feeRealization.clearedPercent}% cleared</small>
        </article>
        <article className="card">
          <span>Top merit cutoff</span>
          <strong>
            {data.topMeritCutoff.percent} <em>{data.topMeritCutoff.program}</em>
          </strong>
          <div className="progress">
            <i className="navy" style={{ width: "78%" }} />
          </div>
          <small>Displayed from the cycle briefing</small>
        </article>
        <article className="card">
          <span>Diversity</span>
          <strong>
            {data.diversity.femaleShare} <em>female share</em>
          </strong>
          <div className="progress split">
            <i style={{ width: data.diversity.urban }} />
            <i className="success" style={{ width: data.diversity.rural }} />
          </div>
          <small>
            Urban {data.diversity.urban} · Rural {data.diversity.rural}
          </small>
        </article>
      </section>

      <section className="vc-desk">
        <div className="panel vc-desk-main">
          <p className="eyebrow">Statutory desk</p>
          <h2>Executive Authority & Statutory Sanction</h2>
          <p className="muted">
            The admissions office has prepared the first provisional merit list for VC review.
            Publication stays with the official workflow; this desk does not change applicant records.
          </p>
          <ul className="vc-checks">
            <li>Challan credentials reviewed by Finance</li>
            <li>Domicile documents marked in the review queue</li>
            <li>Program seat matrix ready for Syndicate briefing</li>
          </ul>
        </div>
        <aside className="panel vc-sanction">
          <p className="eyebrow">VC Executive Sanction</p>
          <h2>1st Provisional Merit List</h2>
          <p className="muted">
            Ratification will issue provisional admission orders. That action is not connected in this iteration.
          </p>
          <button type="button" disabled>
            Ratify & publish
          </button>
        </aside>
      </section>

      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Intake matrix</p>
            <h2>Academic Program Demand</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Degree program</th>
                <th>Sanctioned seats</th>
                <th>Candidates</th>
                <th>Demand</th>
                <th>Projected cutoff</th>
                <th>Capacity fill</th>
              </tr>
            </thead>
            <tbody>
              {data.programs.map((program) => (
                <tr key={program.code}>
                  <td>
                    <strong>{program.name}</strong>
                    <div className="muted">{program.faculty}</div>
                  </td>
                  <td>{program.sanctionedSeats}</td>
                  <td>{program.candidates}</td>
                  <td>
                    <span className="demand-pill">{program.demandRatio}</span>
                  </td>
                  <td>{program.projectedCutoff}</td>
                  <td>
                    <div className="fill-cell">
                      <span>{program.fillPercent}%</span>
                      <div className="progress">
                        <i className="success" style={{ width: `${program.fillPercent}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
