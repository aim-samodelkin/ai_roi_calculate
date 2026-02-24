import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const maxDuration = 60;

const INTERNAL_BASE_URL = process.env.INTERNAL_BASE_URL ?? "http://localhost:3000";

const FOOTER_TEMPLATE = `
  <div style="width:100%;font-family:Arial,Helvetica,sans-serif;padding:0 15mm;box-sizing:border-box;">
    <div style="border-top:1px solid #d1d5db;padding-top:5px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="font-size:7.5px;color:#6b7280;line-height:1.5;font-style:italic;">
          Искусственный интеллект.<br/>
          Настоящие результаты.
        </div>
        <div style="font-size:7.5px;color:#6b7280;line-height:1.5;text-align:right;">
          AIMintegrations.ru | AIMmethod.ru<br/>
          boost@aimintegrations.ru
        </div>
      </div>
      <div style="text-align:center;font-size:7px;color:#9ca3af;margin-top:3px;letter-spacing:0.05em;">
        -- <span class="pageNumber"></span> of <span class="totalPages"></span> --
      </div>
    </div>
  </div>
`;

const HEADER_TEMPLATE = `
  <div style="width:100%;font-family:Arial,Helvetica,sans-serif;padding:0 15mm;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:5px;border-bottom:1px solid #d1d5db;">
      <div style="font-size:8px;color:#374151;">
        <span style="font-weight:700;letter-spacing:0.02em;">AIM</span><span style="font-weight:400;color:#6b7280;">integrations</span>
        <span style="color:#d1d5db;margin:0 4px;">|</span>
        <span style="font-weight:400;color:#9ca3af;">AIMmethod</span>
      </div>
      <div style="font-size:7.5px;color:#9ca3af;letter-spacing:0.02em;">
        Расчёт ROI · Анализ экономического эффекта от внедрения ИИ
      </div>
    </div>
  </div>
`;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const horizon = searchParams.get("horizon") ?? "24";

  const reportUrl = `${INTERNAL_BASE_URL}/${id}/report?horizon=${horizon}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--disable-extensions",
      ],
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 730, height: 900, deviceScaleFactor: 1 });

    await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 30000 });

    await page
      .waitForSelector("[data-pdf-ready='true']", { timeout: 12000 })
      .catch(() => {
        // If ready flag doesn't appear in time, proceed anyway
      });

    const calculationName = await page
      .evaluate(() => {
        const h1 = document.querySelector("h1");
        return h1?.textContent ?? "Расчёт ROI";
      })
      .catch(() => "Расчёт ROI");

    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "28mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: HEADER_TEMPLATE,
      footerTemplate: FOOTER_TEMPLATE,
    });

    const pdfBuffer = Buffer.from(pdfUint8);

    const safeFilename = calculationName
      .replace(/[^\w\sа-яёА-ЯЁ]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60);
    const filename = `ROI_${safeFilename || id}_${horizon}m.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[PDF export] Error:", error);
    return NextResponse.json(
      { error: "Ошибка генерации PDF" },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
