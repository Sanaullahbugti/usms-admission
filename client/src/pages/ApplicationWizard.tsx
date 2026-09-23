import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { applicationService } from "../services/applicationService";

const steps = [
  "Personal Info",
  "Program Choices",
  "Education History",
  "Parents & Family",
  "Documents",
  "Bank Challan",
  "Review",
  "Declaration",
];

const documents = [
  "CNIC / B-Form",
  "SSC / Matric certificate",
  "HSC / Intermediate marksheet",
  "Domicile certificate",
  "Passport photograph",
];

export function ApplicationWizard() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    applicantName: "Muhammad Ali",
    fatherName: "Tariq Mahmood Ali",
    cnicBform: "42101-1234567-1",
    dateOfBirth: "2006-04-12",
    gender: "Male",
    mobile: "0300-1234567",
    email: "muhammad.ali@example.com",
    domicileDistrict: "Karachi",
    province: "Sindh",
    nationality: "Pakistani",
    postalAddress: "",
    firstChoice: "BSCS",
    secondChoice: "BSIT",
    thirdChoice: "BBA",
    board: "BISE Karachi",
    passingYear: "2024",
    obtainedMarks: "850",
    totalMarks: "1100",
    fatherOccupation: "",
    declarationName: "",
  });
  const programs = useQuery({
    queryKey: ["programs"],
    queryFn: () => applicationService.listPrograms(),
  });

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  const percent = Math.round((step / steps.length) * 100);

  return (
    <>
      <section className="stepper">
        <div className="stepper-top">
          <p className="eyebrow">Undergraduate workflow</p>
          <span className="muted">
            Step {step} of {steps.length} ({percent}% completed)
          </span>
        </div>
        <div className="progress">
          <i style={{ width: `${percent}%` }} />
        </div>
        <div className="step-grid" style={{ marginTop: 12 }}>
          {steps.map((label, index) => {
            const number = index + 1;
            const className = number === step ? "step-btn active" : number < step ? "step-btn done" : "step-btn";
            return (
              <button key={label} className={className} type="button" onClick={() => setStep(number)}>
                <small>Step {number}</small>
                <strong>{label}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <div className="wizard-layout">
        <section className="panel">
          <h1>
            Step {step}: {steps[step - 1]}
          </h1>

          {step === 1 ? (
            <div className="form-grid">
              <div className="field">
                <label>Full applicant name</label>
                <input value={form.applicantName} onChange={(event) => update("applicantName", event.target.value)} />
              </div>
              <div className="field">
                <label>Father / guardian name</label>
                <input value={form.fatherName} onChange={(event) => update("fatherName", event.target.value)} />
              </div>
              <div className="field">
                <label>CNIC / B-Form</label>
                <input value={form.cnicBform} onChange={(event) => update("cnicBform", event.target.value)} />
              </div>
              <div className="field">
                <label>Date of birth</label>
                <input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} />
              </div>
              <div className="field">
                <label>Gender</label>
                <select value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="field">
                <label>Mobile</label>
                <input value={form.mobile} onChange={(event) => update("mobile", event.target.value)} />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={form.email} onChange={(event) => update("email", event.target.value)} />
              </div>
              <div className="field">
                <label>Domicile district</label>
                <input value={form.domicileDistrict} onChange={(event) => update("domicileDistrict", event.target.value)} />
              </div>
              <div className="field">
                <label>Province</label>
                <input value={form.province} onChange={(event) => update("province", event.target.value)} />
              </div>
              <div className="field full">
                <label>Postal address</label>
                <textarea rows={3} value={form.postalAddress} onChange={(event) => update("postalAddress", event.target.value)} />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="form-grid">
              {(["firstChoice", "secondChoice", "thirdChoice"] as const).map((key, index) => (
                <div className="field full" key={key}>
                  <label>{index + 1}. Preference</label>
                  <select value={form[key]} onChange={(event) => update(key, event.target.value)}>
                    {(programs.data ?? []).map((program) => (
                      <option key={program.code} value={program.code}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="form-grid">
              <div className="field">
                <label>Board</label>
                <input value={form.board} onChange={(event) => update("board", event.target.value)} />
              </div>
              <div className="field">
                <label>Passing year</label>
                <input value={form.passingYear} onChange={(event) => update("passingYear", event.target.value)} />
              </div>
              <div className="field">
                <label>Marks obtained</label>
                <input value={form.obtainedMarks} onChange={(event) => update("obtainedMarks", event.target.value)} />
              </div>
              <div className="field">
                <label>Total marks</label>
                <input value={form.totalMarks} onChange={(event) => update("totalMarks", event.target.value)} />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="form-grid">
              <div className="field">
                <label>Father / guardian occupation</label>
                <input value={form.fatherOccupation} onChange={(event) => update("fatherOccupation", event.target.value)} />
              </div>
              <div className="field">
                <label>Nationality</label>
                <input value={form.nationality} onChange={(event) => update("nationality", event.target.value)} />
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div>
              {documents.map((item) => (
                <div className="doc-row" key={item}>
                  <span>{item}</span>
                  <span className="muted">Upload comes in a later iteration</span>
                </div>
              ))}
            </div>
          ) : null}

          {step === 6 ? (
            <div>
              <p className="muted">Application fee is shown from the program offering. Receipt upload is not connected yet.</p>
              <div className="card" style={{ marginTop: 16 }}>
                <span>Application fee</span>
                <strong>PKR 3,000</strong>
              </div>
            </div>
          ) : null}

          {step === 7 ? (
            <dl className="details">
              <div>
                <dt>Name</dt>
                <dd>{form.applicantName}</dd>
              </div>
              <div>
                <dt>CNIC</dt>
                <dd>{form.cnicBform}</dd>
              </div>
              <div>
                <dt>First choice</dt>
                <dd>{form.firstChoice}</dd>
              </div>
              <div>
                <dt>HSC marks</dt>
                <dd>
                  {form.obtainedMarks} / {form.totalMarks}
                </dd>
              </div>
            </dl>
          ) : null}

          {step === 8 ? (
            <div className="form-grid">
              <div className="field full">
                <label>Type your full legal name to declare the information is true</label>
                <input value={form.declarationName} onChange={(event) => update("declarationName", event.target.value)} />
              </div>
              {submitted ? <p className="notice">Draft saved locally. Official submit is not connected to the API yet.</p> : null}
            </div>
          ) : null}

          <div className="actions">
            <button className="secondary" type="button" disabled={step === 1} onClick={() => setStep(step - 1)}>
              Previous
            </button>
            {step < 8 ? (
              <button type="button" onClick={() => setStep(step + 1)}>
                Next
              </button>
            ) : (
              <button type="button" onClick={() => setSubmitted(true)}>
                Save draft
              </button>
            )}
          </div>
        </section>

        <aside className="panel">
          <h2>Program choices</h2>
          <div className="choice">
            <span>1st</span>
            <strong>{form.firstChoice}</strong>
          </div>
          <div className="choice">
            <span>2nd</span>
            <strong>{form.secondChoice}</strong>
          </div>
          <div className="choice">
            <span>3rd</span>
            <strong>{form.thirdChoice}</strong>
          </div>
          <p className="notice">Official PDFs and document storage are backend work for a later iteration.</p>
        </aside>
      </div>
    </>
  );
}
