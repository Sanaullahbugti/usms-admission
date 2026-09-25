import { existsSync } from "node:fs";
import { join } from "node:path";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function smtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function logoFile() {
  const candidates = [
    join(env.CLIENT_DIST_DIR, "usms-logo.png"),
    join(process.cwd(), "client/dist/usms-logo.png"),
    join(process.cwd(), "client/public/usms-logo.png"),
    join(import.meta.dirname, "../../../client/public/usms-logo.png"),
    join(import.meta.dirname, "../../../client/dist/usms-logo.png"),
  ];
  return candidates.find((path) => existsSync(path));
}

function credentialsHtml(input: {
  applicantName: string;
  applicationNo: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  logoSrc: string;
  dateLine: string;
}) {
  const name = escapeHtml(input.applicantName);
  const applicationNo = escapeHtml(input.applicationNo);
  const email = escapeHtml(input.email);
  const password = escapeHtml(input.temporaryPassword);
  const loginUrl = escapeHtml(input.loginUrl);
  const dateLine = escapeHtml(input.dateLine);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>USMS Admissions</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f2;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #d0d0d0;">
        <tr>
          <td align="center" style="padding:28px 28px 18px;border-bottom:3px solid #1a3a7a;">
            <img src="${input.logoSrc}" width="88" height="88" alt="University of Sufism and Modern Sciences" style="display:block;border:0;margin:0 auto 12px;width:88px;height:88px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:24px;font-weight:bold;color:#1a3a7a;text-transform:uppercase;letter-spacing:0.3px;">
              University of Sufism and Modern Sciences
            </div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#333333;margin-top:4px;">
              Bhitshah, Sindh, Pakistan
            </div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:bold;color:#8b1e1e;margin-top:10px;">
              Directorate of Admissions
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#333333;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#333333;">
                  Ref: USMS/Adm/${applicationNo}
                </td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#333333;">
                  ${dateLine}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#222222;">
            <p style="margin:0 0 16px;">Dear ${name},</p>
            <p style="margin:0 0 16px;">
              This is to inform you that your undergraduate admission application has been registered
              with the Directorate of Admissions. Your application number and portal sign-in details
              are given below.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border:1px solid #c8c8c8;">
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #c8c8c8;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555;width:190px;">
                  Application Number
                </td>
                <td style="padding:10px 12px;border-bottom:1px solid #c8c8c8;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1a3a7a;">
                  ${applicationNo}
                </td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #c8c8c8;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555;">
                  Email for Sign-in
                </td>
                <td style="padding:10px 12px;border-bottom:1px solid #c8c8c8;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222222;">
                  ${email}
                </td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555;">
                  Temporary Password
                </td>
                <td style="padding:10px 12px;font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:bold;color:#222222;">
                  ${password}
                </td>
              </tr>
            </table>
            <p style="margin:0 0 16px;">
              Please sign in at the admissions portal and complete the remaining steps of your application
              (personal details, programme choices, academic record, documents, and fee challan).
            </p>
            <p style="margin:0 0 20px;">
              Portal link:<br>
              <a href="${loginUrl}" style="color:#1a3a7a;text-decoration:underline;word-break:break-all;">${loginUrl}</a>
            </p>
            <p style="margin:0 0 22px;font-size:13px;line-height:20px;color:#555555;">
              Keep this message confidential. Do not share your temporary password with anyone.
              For assistance, write to admissions@usms.edu.pk.
            </p>
            <p style="margin:0 0 4px;">Yours faithfully,</p>
            <p style="margin:12px 0 0;font-weight:bold;color:#1a3a7a;">
              Directorate of Admissions<br>
              University of Sufism and Modern Sciences, Bhitshah
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 28px;border-top:1px solid #d0d0d0;background:#fafafa;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#777777;text-align:center;">
            This is an automated message from the USMS Admissions Portal. Please do not reply to this email.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function sendApplicantCredentials(input: {
  to: string;
  applicantName: string;
  applicationNo: string;
  temporaryPassword: string;
}): Promise<{ sent: boolean }> {
  if (!smtpConfigured()) {
    console.info("[mail] SMTP is not configured; applicant credentials were not emailed");
    return { sent: false };
  }

  const loginUrl = `${env.CLIENT_ORIGIN}/login`;
  const logoPath = logoFile();
  const dateLine = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  const text = [
    "University of Sufism and Modern Sciences",
    "Directorate of Admissions, Bhitshah",
    "",
    `Ref: USMS/Adm/${input.applicationNo}`,
    `Date: ${dateLine}`,
    "",
    `Dear ${input.applicantName},`,
    "",
    "This is to inform you that your undergraduate admission application has been registered with the Directorate of Admissions. Your application number and portal sign-in details are given below.",
    "",
    `Application Number: ${input.applicationNo}`,
    `Email for Sign-in: ${input.to}`,
    `Temporary Password: ${input.temporaryPassword}`,
    "",
    `Portal link: ${loginUrl}`,
    "",
    "Please sign in and complete the remaining steps of your application.",
    "Keep this message confidential. Do not share your temporary password with anyone.",
    "For assistance, write to admissions@usms.edu.pk.",
    "",
    "Yours faithfully,",
    "Directorate of Admissions",
    "University of Sufism and Modern Sciences, Bhitshah",
  ].join("\n");

  const from = env.MAIL_FROM.includes("<")
    ? env.MAIL_FROM
    : `"Directorate of Admissions, USMS" <${env.MAIL_FROM}>`;

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: `Application ${input.applicationNo} — USMS Admissions Portal`,
      text,
      html: credentialsHtml({
        applicantName: input.applicantName,
        applicationNo: input.applicationNo,
        email: input.to,
        temporaryPassword: input.temporaryPassword,
        loginUrl,
        logoSrc: logoPath ? "cid:usms-logo" : `${env.CLIENT_ORIGIN}/usms-logo.png`,
        dateLine,
      }),
      attachments: logoPath
        ? [
            {
              filename: "usms-logo.png",
              path: logoPath,
              cid: "usms-logo",
              contentDisposition: "inline",
              contentType: "image/png",
            },
          ]
        : [],
    });
    return { sent: true };
  } catch (error) {
    console.error("[mail] Failed to send applicant credentials", error);
    return { sent: false };
  }
}
