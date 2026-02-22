import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const maxDuration = 60;

const INTERNAL_BASE_URL = process.env.INTERNAL_BASE_URL ?? "http://localhost:3000";

const FOOTER_TEMPLATE = `
  <div style="width:100%;font-family:Inter,system-ui,sans-serif;font-size:7.5px;padding:0 15mm;display:flex;justify-content:space-between;align-items:flex-end;color:#6b7280;">
    <div style="line-height:1.4;">
      Искусственный интеллект.<br/>
      Настоящие результаты.
    </div>
    <div style="text-align:center;color:#9ca3af;">
      -- <span class="pageNumber"></span> of <span class="totalPages"></span> --
    </div>
    <div style="line-height:1.4;text-align:right;">
      AIMintegrations.ru | AIMmethod.ru<br/>
      boost@aimintegrations.ru
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

    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });

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
      margin: { top: "15mm", bottom: "25mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
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
