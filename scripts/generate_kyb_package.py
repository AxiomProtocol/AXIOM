"""
generate_kyb_package.py
Produces:
  1. Axiom_Nexus_Business_Plan_Product_Overview.pdf
  2. Axiom_Nexus_Business_Plan_Product_Overview.txt
  3. bridge_product_screenshots/ — 7 wireframe PNGs
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

# ── Brand colours ─────────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#0D1B3E")
GREEN  = colors.HexColor("#1B5E3B")
GOLD   = colors.HexColor("#B8960C")
LIGHT  = colors.HexColor("#F5F6F8")
MID    = colors.HexColor("#E8EAF0")
BODY   = colors.HexColor("#1A1A2E")
SUBTLE = colors.HexColor("#6B7280")

W, H = letter  # 612 × 792 pt

OUT_DIR  = "/home/runner/workspace"
WIRE_DIR = "/home/runner/workspace/bridge_product_screenshots"

# ── Paragraph styles ──────────────────────────────────────────────────────────
def make_styles():
    return {
        "cover_title": ParagraphStyle(
            "cover_title",
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=32,
            textColor=colors.white,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            fontName="Helvetica",
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#D4D8E8"),
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "cover_label": ParagraphStyle(
            "cover_label",
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#A0A8C0"),
            alignment=TA_CENTER,
        ),
        "section_heading": ParagraphStyle(
            "section_heading",
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=NAVY,
            spaceBefore=18,
            spaceAfter=6,
        ),
        "subsection": ParagraphStyle(
            "subsection",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            textColor=GREEN,
            spaceBefore=10,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=BODY,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=BODY,
            leftIndent=18,
            spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "caption",
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=13,
            textColor=SUBTLE,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "footer_text": ParagraphStyle(
            "footer_text",
            fontName="Helvetica",
            fontSize=8,
            textColor=SUBTLE,
            alignment=TA_CENTER,
        ),
        "disclaimer": ParagraphStyle(
            "disclaimer",
            fontName="Helvetica-Oblique",
            fontSize=8.5,
            leading=13,
            textColor=SUBTLE,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
    }


# ── Page template (header bar + footer) ───────────────────────────────────────
def make_page_template(c: rl_canvas.Canvas, doc, styles):
    c.saveState()
    # Top navy bar
    c.setFillColor(NAVY)
    c.rect(0, H - 36, W, 36, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.white)
    c.drawString(36, H - 23, "AXIOM NEXUS LLC")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#A0A8C0"))
    c.drawRightString(W - 36, H - 23, "Confidential — KYB Compliance Package")
    # Bottom footer
    c.setFillColor(MID)
    c.rect(0, 0, W, 28, fill=1, stroke=0)
    c.setFont("Helvetica", 8)
    c.setFillColor(SUBTLE)
    c.drawString(36, 10, "axiomprotocol.app  |  Axiom Nexus LLC  |  EIN: 41-5188895")
    c.drawRightString(W - 36, 10, f"Page {doc.page}")
    c.restoreState()


# ── Cover page ─────────────────────────────────────────────────────────────────
def build_cover(c: rl_canvas.Canvas, doc):
    c.saveState()
    # Full navy background
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # Gold accent bar at top
    c.setFillColor(GOLD)
    c.rect(0, H - 8, W, 8, fill=1, stroke=0)
    # Green accent bar at bottom
    c.setFillColor(GREEN)
    c.rect(0, 0, W, 8, fill=1, stroke=0)

    # Centred content block
    cx = W / 2
    # Logo placeholder ring
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.circle(cx, H - 130, 38, fill=0, stroke=1)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(cx, H - 137, "AN")

    # Title
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(cx, H - 205, "AXIOM NEXUS LLC")
    c.setFont("Helvetica-Bold", 17)
    c.setFillColor(GOLD)
    c.drawCentredString(cx, H - 228, "Business Plan, Product Overview")
    c.setFont("Helvetica-Bold", 17)
    c.setFillColor(colors.white)
    c.drawCentredString(cx, H - 250, "& KYB Compliance Package")

    # Divider
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.line(cx - 160, H - 268, cx + 160, H - 268)

    # Purpose line
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.HexColor("#D4D8E8"))
    c.drawCentredString(cx, H - 288, "Prepared for Submission to Bridge Compliance Team")

    # Info table block
    info = [
        ("Legal Name:",    "Axiom Nexus LLC"),
        ("Formation:",     "December 26, 2025  |  Mississippi"),
        ("Entity ID:",     "1522557"),
        ("EIN:",           "41-5188895"),
        ("Management:",    "Manager Managed"),
        ("Industry:",      "Computer Systems Design and Related Services"),
        ("NAICS:",         "541511, 541512"),
        ("Website:",       "https://axiomprotocol.app"),
    ]
    bx, by = cx - 200, H - 330
    row_h = 20
    for label, val in info:
        c.setFont("Helvetica-Bold", 9.5)
        c.setFillColor(GOLD)
        c.drawString(bx, by, label)
        c.setFont("Helvetica", 9.5)
        c.setFillColor(colors.white)
        c.drawString(bx + 100, by, val)
        by -= row_h

    # Date
    from datetime import date
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#808090"))
    c.drawCentredString(cx, 50, f"Document Date: {date.today().strftime('%B %d, %Y')}  |  CONFIDENTIAL")
    c.restoreState()


# ── Wireframe generator ────────────────────────────────────────────────────────
def draw_wireframe(filename, title, subtitle, sections):
    """Draw a simple browser-style wireframe and save as PNG."""
    from reportlab.pdfgen import canvas as C
    from reportlab.lib.pagesizes import A4
    import subprocess, tempfile

    pw, ph = 960, 640
    tmp_pdf = filename.replace(".png", "_tmp.pdf")

    c = C.Canvas(tmp_pdf, pagesize=(pw, ph))
    # Background
    c.setFillColor(colors.HexColor("#F7F8FA"))
    c.rect(0, 0, pw, ph, fill=1, stroke=0)

    # Browser chrome
    c.setFillColor(colors.HexColor("#E0E3EA"))
    c.rect(0, ph - 40, pw, 40, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#C8CBD4"))
    c.roundRect(60, ph - 32, pw - 180, 22, 6, fill=1, stroke=0)
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#555"))
    c.drawString(72, ph - 24, "https://axiomprotocol.app")
    # Traffic lights
    for i, col in enumerate(["#FF5F57","#FFBD2E","#28C840"]):
        c.setFillColor(colors.HexColor(col))
        c.circle(12 + i*18, ph - 20, 6, fill=1, stroke=0)

    # Nav bar
    c.setFillColor(NAVY)
    c.rect(0, ph - 80, pw, 40, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.white)
    c.drawString(20, ph - 60, "AXIOM PROTOCOL")
    nav_items = ["About", "Assets", "Capital", "Intelligence", "Operations"]
    nx = 200
    for item in nav_items:
        c.setFont("Helvetica", 9)
        c.drawString(nx, ph - 60, item)
        nx += 80

    # Page title band
    c.setFillColor(colors.HexColor("#EEF0F5"))
    c.rect(0, ph - 130, pw, 50, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(NAVY)
    c.drawString(24, ph - 105, title)
    c.setFont("Helvetica", 10)
    c.setFillColor(SUBTLE)
    c.drawString(24, ph - 120, subtitle)

    # Sections
    sy = ph - 160
    col_w = (pw - 48) // max(len(sections), 1)
    for i, (sec_title, sec_lines) in enumerate(sections):
        sx = 24 + i * col_w
        # Card bg
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor("#D8DCE8"))
        c.setLineWidth(0.8)
        c.roundRect(sx, sy - 200, col_w - 12, 200, 4, fill=1, stroke=1)
        # Card header strip
        c.setFillColor(NAVY)
        c.roundRect(sx, sy - 28, col_w - 12, 28, 4, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.white)
        c.drawString(sx + 10, sy - 18, sec_title)
        # Lines
        ly = sy - 48
        for line in sec_lines:
            # Simulate data row
            c.setFillColor(colors.HexColor("#E8EAF0"))
            c.rect(sx + 10, ly - 8, col_w - 32, 12, fill=1, stroke=0)
            c.setFont("Helvetica", 8)
            c.setFillColor(BODY)
            c.drawString(sx + 14, ly - 4, line[:38])
            ly -= 22

    # Watermark label
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#B0B4C0"))
    c.drawCentredString(pw / 2, 14, "PRODUCT WIREFRAME / DEVELOPMENT PREVIEW — Axiom Nexus LLC")

    c.save()

    # Convert PDF → PNG using pdftoppm (poppler)
    try:
        subprocess.run(
            ["pdftoppm", "-r", "120", "-png", "-l", "1", tmp_pdf, filename.replace(".png", "")],
            check=True, capture_output=True
        )
        # pdftoppm appends -1 to the filename
        import shutil
        candidate = filename.replace(".png", "") + "-1.png"
        if os.path.exists(candidate):
            shutil.move(candidate, filename)
        os.remove(tmp_pdf)
    except Exception:
        # Fallback: keep the PDF but rename to .pdf (won't be PNG but still usable)
        os.rename(tmp_pdf, filename.replace(".png", ".pdf"))


# ── Plain-text generator ───────────────────────────────────────────────────────
TXT_BODY = """\
AXIOM NEXUS LLC
BUSINESS PLAN, PRODUCT OVERVIEW & KYB COMPLIANCE PACKAGE
Prepared for Submission to Bridge Compliance Team
================================================================

COMPANY INFORMATION
-------------------
Legal Name:       Axiom Nexus LLC
Formation State:  Mississippi
Formation Date:   December 26, 2025
State Entity ID:  1522557
EIN:              41-5188895
Management Type:  Manager Managed
Website:          https://axiomprotocol.app
Industry:         Professional, Scientific, and Technical Services
Sub-Industry:     Computer Systems Design and Related Services
NAICS Codes:      541511, 541512

================================================================
SECTION 1 — EXECUTIVE SUMMARY
================================================================

Axiom Nexus LLC is a financial technology and blockchain software infrastructure
company. The company develops compliance-focused digital asset systems, smart
contract tools, tokenized real-world asset infrastructure, treasury management
technology, and payment rail integration tooling.

Axiom Nexus LLC is currently an early-stage software and technology company
focused on product development, technical architecture, vendor onboarding,
compliance preparation, and internal business operations. No regulated financial
products are currently offered to the public.

================================================================
SECTION 2 — BUSINESS MODEL
================================================================

Axiom Nexus LLC's business model is based on developing software infrastructure,
dashboards, smart contract systems, treasury management tools, compliance tooling,
and platform technology for digital finance and tokenized real-world asset
workflows.

The company is not a bank, money transmitter, investment adviser, broker-dealer,
custodian, crypto brokerage, OTC desk, or payment processor.

================================================================
SECTION 3 — PRODUCTS AND PLATFORM MODULES
================================================================

  - Axiom Protocol Platform
    A modular blockchain software infrastructure platform providing on-chain
    identity, governance, and asset-management tooling for institutional and
    developer use.

  - Compliance-Focused Digital Asset Infrastructure
    Software systems designed to support KYC/KYB workflows, audit trails, and
    regulatory-aligned data structures for digital asset environments.

  - Smart Contract Tools
    ERC-20, ERC-3643, and ERC-7726 compatible automated control layer tooling
    for on-chain identity verification, token issuance, and oracle-driven pricing.

  - Treasury Management Dashboard
    An internal dashboard providing real-time visibility into on-chain treasury
    balances, reserve compositions, and multi-party authorization activity.

  - Reserve and Solvency Reporting Tools
    Oracle-driven reserve attestation dashboards that produce readable
    solvency reports suitable for compliance review and internal governance.

  - Payment Rail Integration Tooling
    Software adapters connecting internal treasury operations to Stellar SEP
    and EVM-compatible payment rails for business operational purposes.

  - Tokenized Real-World Asset Platform Infrastructure
    A framework for onboarding physical asset data onto blockchain-based
    registries, including land and commodity reference instruments.

  - Business Dashboards and Reporting Systems
    Operations dashboards providing capital performance intelligence, audit
    logging, and business reporting functions for internal use.

  - On-Chain Identity and Governance Tools
    Identity registry and governance token infrastructure enabling
    permissioned access control and participant management within the platform.

================================================================
SECTION 4 — CURRENT DEVELOPMENT STAGE
================================================================

The company is in early-stage development and onboarding. Axiom Nexus LLC is
currently building software, technical infrastructure, compliance workflows,
dashboards, and platform interfaces.

No regulated financial products are currently offered to the public.

================================================================
SECTION 5 — ACCOUNT USAGE
================================================================

The Bridge account will be used only for:
  - Internal business treasury activity
  - Owner-funded operating expenses
  - Software development costs
  - Infrastructure expenses
  - Vendor payments
  - Compliance preparation
  - Platform setup costs
  - General business operations

The account will NOT be used to:
  - Transmit customer funds
  - Custody customer assets
  - Hold client escrow funds
  - Process third-party payments
  - Operate a virtual currency brokerage
  - Operate an OTC trading desk
  - Provide investment advisory services

================================================================
SECTION 6 — SOURCE OF FUNDS
================================================================

The company is currently funded by owner's capital contributed by the
founder/member for formation, software development, infrastructure, compliance
preparation, and operating expenses.

Funds are not derived from:
  - Customer deposits
  - Customer custody
  - Money transmission activity
  - Public investment offerings
  - Third-party client funds

================================================================
SECTION 7 — COMPLIANCE CLARIFICATION
================================================================

Axiom Nexus LLC does not currently custody customer funds, transmit customer
funds, operate as a bank, operate as a licensed money transmitter, provide
investment advisory services, operate a virtual currency brokerage or OTC trading
desk, hold client escrow funds, or provide regulated financial products to the
public.

Any regulated activity, if launched in the future, will be conducted only after
applicable legal review, required registrations or exemptions, approved compliance
procedures, and/or the use of licensed third-party providers.

================================================================
SECTION 8 — PRODUCT SCREENSHOTS AND WIREFRAMES
================================================================

Product wireframes and development previews are provided in the accompanying
folder: bridge_product_screenshots/

Included wireframes:
  01_homepage.png                 — Axiom Protocol public homepage overview
  02_treasury_dashboard.png       — Treasury management dashboard
  03_reserve_solvency.png         — Reserve and solvency reporting dashboard
  04_compliance_workflow.png      — Compliance workflow dashboard
  05_payment_rail.png             — Payment rail integration overview
  06_smart_contract.png           — Smart contract infrastructure overview
  07_tokenized_assets.png         — Tokenized real-world asset infrastructure

================================================================
SECTION 9 — WEBSITE AND PUBLIC PRESENCE
================================================================

Website: https://axiomprotocol.app

The website provides public information about the Axiom Protocol ecosystem,
product direction, and platform infrastructure. It does not offer financial
products, investment opportunities, or regulated services to the public.

================================================================
SECTION 10 — FINAL KYB SUMMARY
================================================================

Axiom Nexus LLC is a software and technology infrastructure company. The company
is not currently using Bridge for customer funds, money transmission, custody,
escrow, investment advisory activity, brokerage activity, OTC trading, or banking
activity.

The requested Bridge account is intended for internal business operations and
treasury activity only.

================================================================
END OF DOCUMENT
================================================================

Prepared by:    Axiom Nexus LLC (Manager Managed)
Website:        https://axiomprotocol.app
EIN:            41-5188895
State ID:       1522557 (Mississippi)
Classification: CONFIDENTIAL — KYB Compliance Submission
"""


# ── Main PDF build ─────────────────────────────────────────────────────────────
def build_pdf(output_path):
    styles = make_styles()

    # Use a canvas-level approach for cover; platypus for interior
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.55 * inch,
        title="Axiom Nexus LLC — Business Plan & KYB Compliance Package",
        author="Axiom Nexus LLC",
        subject="Bridge Compliance Submission",
    )

    story = []

    # ── COVER PAGE ─────────────────────────────────────────────────────────────
    # Rendered via onFirstPage callback; inject a blank full-page placeholder
    story.append(Spacer(1, 9.5 * inch))
    story.append(PageBreak())

    # ── SECTION 1: Executive Summary ───────────────────────────────────────────
    story.append(Paragraph("Section 1 — Executive Summary", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "Axiom Nexus LLC is a financial technology and blockchain software infrastructure "
        "company. The company develops compliance-focused digital asset systems, smart contract "
        "tools, tokenized real-world asset infrastructure, treasury management technology, and "
        "payment rail integration tooling.",
        styles["body"]
    ))
    story.append(Paragraph(
        "Axiom Nexus LLC is currently an early-stage software and technology company focused on "
        "product development, technical architecture, vendor onboarding, compliance preparation, "
        "and internal business operations. No regulated financial products are currently offered "
        "to the public.",
        styles["body"]
    ))

    # ── SECTION 2: Business Model ──────────────────────────────────────────────
    story.append(Paragraph("Section 2 — Business Model", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "Axiom Nexus LLC's business model is based on developing software infrastructure, "
        "dashboards, smart contract systems, treasury management tools, compliance tooling, "
        "and platform technology for digital finance and tokenized real-world asset workflows.",
        styles["body"]
    ))
    story.append(Paragraph(
        "The company does not describe itself as, and does not currently operate as, a bank, "
        "money transmitter, investment adviser, broker-dealer, custodian, crypto brokerage, "
        "OTC desk, or payment processor.",
        styles["body"]
    ))

    # ── SECTION 3: Products ────────────────────────────────────────────────────
    story.append(Paragraph("Section 3 — Products and Platform Modules", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))

    products = [
        ("Axiom Protocol Platform",
         "A modular blockchain software infrastructure platform providing on-chain identity, "
         "governance, and asset-management tooling for institutional and developer use."),
        ("Compliance-Focused Digital Asset Infrastructure",
         "Software systems designed to support KYC/KYB workflows, audit trails, and "
         "regulatory-aligned data structures for digital asset environments."),
        ("Smart Contract Tools",
         "ERC-20, ERC-3643, and ERC-7726 compatible automated control layer tooling for "
         "on-chain identity verification, token issuance, and oracle-driven pricing."),
        ("Treasury Management Dashboard",
         "An internal dashboard providing real-time visibility into on-chain treasury balances, "
         "reserve compositions, and multi-party authorization activity."),
        ("Reserve and Solvency Reporting Tools",
         "Oracle-driven reserve attestation dashboards producing readable solvency reports "
         "suitable for compliance review and internal governance."),
        ("Payment Rail Integration Tooling",
         "Software adapters connecting internal treasury operations to Stellar SEP and "
         "EVM-compatible payment rails for business operational purposes."),
        ("Tokenized Real-World Asset Platform Infrastructure",
         "A framework for onboarding physical asset data onto blockchain-based registries, "
         "including land and commodity reference instruments."),
        ("Business Dashboards and Reporting Systems",
         "Operations dashboards providing capital performance intelligence, audit logging, "
         "and business reporting functions for internal use."),
        ("On-Chain Identity and Governance Tools",
         "Identity registry and governance token infrastructure enabling permissioned access "
         "control and participant management within the platform."),
    ]

    for name, desc in products:
        story.append(KeepTogether([
            Paragraph(f"\u25B8  {name}", styles["subsection"]),
            Paragraph(desc, styles["body"]),
        ]))

    story.append(PageBreak())

    # ── SECTION 4: Development Stage ──────────────────────────────────────────
    story.append(Paragraph("Section 4 — Current Development Stage", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    for para in [
        "The company is in early-stage development and onboarding.",
        "Axiom Nexus LLC is currently building software, technical infrastructure, compliance "
        "workflows, dashboards, and platform interfaces.",
        "No regulated financial products are currently offered to the public.",
    ]:
        story.append(Paragraph(para, styles["body"]))

    # ── SECTION 5: Account Usage ───────────────────────────────────────────────
    story.append(Paragraph("Section 5 — Account Usage", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "The Bridge account will be used <b>only</b> for internal business treasury activity, "
        "owner-funded operating expenses, software development costs, infrastructure expenses, "
        "vendor payments, compliance preparation, platform setup, and general business operations.",
        styles["body"]
    ))
    story.append(Paragraph("The account will <b>not</b> be used to:", styles["body"]))
    for item in [
        "Transmit customer funds",
        "Custody customer assets",
        "Hold client escrow funds",
        "Process third-party payments",
        "Operate a virtual currency brokerage",
        "Operate an OTC trading desk",
        "Provide investment advisory services",
    ]:
        story.append(Paragraph(f"\u2022  {item}", styles["bullet"]))

    # ── SECTION 6: Source of Funds ─────────────────────────────────────────────
    story.append(Paragraph("Section 6 — Source of Funds", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "The company is currently funded by owner's capital contributed by the founder/member "
        "for formation, software development, infrastructure, compliance preparation, and "
        "operating expenses.",
        styles["body"]
    ))
    story.append(Paragraph(
        "Funds are not derived from customer deposits, customer custody, money transmission "
        "activity, public investment offerings, or third-party client funds.",
        styles["body"]
    ))

    story.append(PageBreak())

    # ── SECTION 7: Compliance Clarification ───────────────────────────────────
    story.append(Paragraph("Section 7 — Compliance Clarification", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))

    # Highlighted box
    box_data = [[
        Paragraph(
            "<b>Axiom Nexus LLC does not currently</b> custody customer funds, transmit customer "
            "funds, operate as a bank, operate as a licensed money transmitter, provide investment "
            "advisory services, operate a virtual currency brokerage or OTC trading desk, hold "
            "client escrow funds, or provide regulated financial products to the public.<br/><br/>"
            "Any regulated activity, if launched in the future, will be conducted only after "
            "applicable legal review, required registrations or exemptions, approved compliance "
            "procedures, and/or the use of licensed third-party providers.",
            ParagraphStyle("box_text", fontName="Helvetica", fontSize=10,
                           leading=15, textColor=NAVY, alignment=TA_JUSTIFY)
        )
    ]]
    box_table = Table(box_data, colWidths=[6.75 * inch])
    box_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#EEF5EC")),
        ("BOX",           (0, 0), (-1, -1), 1.2, GREEN),
        ("LEFTPADDING",   (0, 0), (-1, -1), 14),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 14),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(box_table)
    story.append(Spacer(1, 12))

    # ── SECTION 8: Screenshots ─────────────────────────────────────────────────
    story.append(Paragraph("Section 8 — Product Screenshots and Wireframes", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "The following pages contain product wireframes and development previews for the Axiom "
        "Protocol platform. These wireframes represent the current development-stage interface "
        "design. Individual PNG exports are provided in the accompanying <i>bridge_product_screenshots</i> folder.",
        styles["body"]
    ))

    wireframes = [
        ("01_homepage",     "Axiom Protocol — Public Homepage Overview",
         "The public-facing homepage presenting the Axiom Protocol ecosystem, product direction, "
         "and platform infrastructure. No financial products are offered through the public site."),
        ("02_treasury_dashboard", "Treasury Management Dashboard",
         "Internal dashboard providing real-time visibility into on-chain treasury balances, "
         "reserve compositions, and multi-party authorization activity for business operations."),
        ("03_reserve_solvency", "Reserve and Solvency Reporting Dashboard",
         "Oracle-driven attestation dashboard displaying reserve balances, solvency ratios, "
         "and confidence scores for internal compliance and governance review."),
        ("04_compliance_workflow", "Compliance Workflow Dashboard",
         "KYC/KYB workflow management interface providing audit trail visibility, document "
         "status tracking, and participant identity verification status."),
        ("05_payment_rail", "Payment Rail Integration Overview",
         "Software integration layer connecting internal treasury operations to Stellar SEP "
         "and EVM-compatible payment rails for business operational transactions."),
        ("06_smart_contract", "Smart Contract Infrastructure Overview",
         "Developer-facing dashboard displaying deployed automated control layer contracts, "
         "on-chain identity registries, and governance tooling on Arbitrum One."),
        ("07_tokenized_assets", "Tokenized Real-World Asset Infrastructure Overview",
         "Asset registry framework for onboarding real-world asset data onto blockchain "
         "registries, including commodity reference instruments and property data feeds."),
    ]

    for fname, title, caption in wireframes:
        png_path = os.path.join(WIRE_DIR, f"{fname}.png")
        pdf_path = os.path.join(WIRE_DIR, f"{fname}.pdf")

        story.append(KeepTogether([
            Paragraph(title, styles["subsection"]),
        ]))

        # Embed PNG if it exists, otherwise embed the PDF page as an image approximation
        if os.path.exists(png_path):
            from reportlab.platypus import Image
            img = Image(png_path, width=6.5 * inch, height=3.5 * inch)
            story.append(img)
        elif os.path.exists(pdf_path):
            # Can't inline a PDF directly; describe it
            story.append(Paragraph(
                f"[See accompanying file: bridge_product_screenshots/{fname}.pdf]",
                styles["caption"]
            ))
        else:
            # Placeholder box
            ph_data = [[Paragraph(
                f"PRODUCT WIREFRAME / DEVELOPMENT PREVIEW<br/>{title}",
                ParagraphStyle("ph", fontName="Helvetica-Bold", fontSize=11,
                               leading=16, textColor=SUBTLE, alignment=TA_CENTER)
            )]]
            ph_table = Table(ph_data, colWidths=[6.5 * inch], rowHeights=[2.5 * inch])
            ph_table.setStyle(TableStyle([
                ("BACKGROUND",   (0, 0), (-1, -1), MID),
                ("BOX",          (0, 0), (-1, -1), 0.8, colors.HexColor("#C0C4D0")),
                ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
            ]))
            story.append(ph_table)

        story.append(Paragraph(f"<i>Caption:</i> {caption}", styles["caption"]))
        story.append(Spacer(1, 8))

    story.append(PageBreak())

    # ── SECTION 9: Website ────────────────────────────────────────────────────
    story.append(Paragraph("Section 9 — Website and Public Presence", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "Website: <b><u>https://axiomprotocol.app</u></b>",
        ParagraphStyle("website", fontName="Helvetica-Bold", fontSize=11,
                       leading=16, textColor=NAVY, spaceAfter=8)
    ))
    story.append(Paragraph(
        "The website provides public information about the Axiom Protocol ecosystem, product "
        "direction, and platform infrastructure. It does not offer financial products, investment "
        "opportunities, or regulated services to the public.",
        styles["body"]
    ))

    # ── SECTION 10: KYB Summary ───────────────────────────────────────────────
    story.append(Paragraph("Section 10 — Final KYB Summary", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))

    summary_data = [[
        Paragraph(
            "Axiom Nexus LLC is a software and technology infrastructure company. The company is "
            "<b>not</b> currently using Bridge for customer funds, money transmission, custody, "
            "escrow, investment advisory activity, brokerage activity, OTC trading, or banking "
            "activity.<br/><br/>"
            "The requested Bridge account is intended for <b>internal business operations and "
            "treasury activity only.</b>",
            ParagraphStyle("sum_text", fontName="Helvetica", fontSize=10.5,
                           leading=16, textColor=colors.white, alignment=TA_JUSTIFY)
        )
    ]]
    sum_table = Table(summary_data, colWidths=[6.75 * inch])
    sum_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), NAVY),
        ("BOX",           (0, 0), (-1, -1), 1.2, GOLD),
        ("LEFTPADDING",   (0, 0), (-1, -1), 16),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 16),
        ("TOPPADDING",    (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))
    story.append(sum_table)
    story.append(Spacer(1, 20))

    # Closing disclosure
    story.append(Paragraph(
        "This document has been prepared by Axiom Nexus LLC for submission to Bridge compliance "
        "personnel. It is confidential and intended solely for KYB review purposes. The statements "
        "contained herein are accurate to the best of the company's knowledge as of the document "
        "date. Nothing in this document constitutes legal advice, investment advice, or a "
        "solicitation of any kind.",
        styles["disclaimer"]
    ))

    # ── Build with callbacks ──────────────────────────────────────────────────
    def on_first_page(canvas, doc):
        build_cover(canvas, doc)

    def on_later_pages(canvas, doc):
        make_page_template(canvas, doc, styles)

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(f"[OK] PDF written: {output_path}")


# ── Generate wireframes ────────────────────────────────────────────────────────
WIREFRAME_SPECS = [
    ("01_homepage", "Axiom Protocol — Homepage", "axiomprotocol.app  |  Public Platform Overview", [
        ("Platform Overview",    ["Axiom Protocol Ecosystem", "Governance Token (AXM)", "Reserve Infrastructure", "DePIN Integration"]),
        ("Product Modules",      ["Treasury Dashboard", "Reserve Solvency Tool", "Asset Registry", "Compliance Workflow"]),
        ("Protocol Status",      ["Smart Contracts: Active", "Oracle: Live", "Arbitrum One: Connected", "Audit: Pending"]),
    ]),
    ("02_treasury_dashboard", "Treasury Management Dashboard", "Internal Operations — Balance & Reserve View", [
        ("Treasury Balances",    ["USDC: $0.00", "PAXG: — oz", "WBTC: — BTC", "cbETH: — ETH"]),
        ("Reserve Summary",      ["Gross NAV: Pending", "Attestation: Pending", "Last Oracle: —", "Confidence: —"]),
        ("Recent Activity",      ["No transactions yet", "Vendor payments: —", "Infrastructure: —", "Operations: —"]),
    ]),
    ("03_reserve_solvency", "Reserve & Solvency Dashboard", "Oracle-Driven Attestation & Compliance View", [
        ("Solvency Metrics",     ["Reserve Ratio: Pending", "Confidence Score: —", "Freshness: —", "Source: Chainlink"]),
        ("Asset Attestation",    ["PAXG NAV: Pending", "BitGo Status: Pending", "Last Poll: —", "Observation: —"]),
        ("Compliance State",     ["KYB: In Progress", "Audit Trail: Active", "Alerts: 0", "Policy: Active"]),
    ]),
    ("04_compliance_workflow", "Compliance Workflow Dashboard", "KYC/KYB Status & Document Management", [
        ("Participant Status",   ["Identity: Manager Managed", "EIN Filed: Yes", "State ID: 1522557", "KYB: Submitted"]),
        ("Document Pipeline",   ["Formation Docs: Filed", "Business Plan: Prepared", "Screenshots: Prepared", "Bridge KYB: In Review"]),
        ("Audit Log",           ["Entity Created: 2025-12-26", "Vendor Onboard: In Progress", "API Keys: Pending", "Review: Active"]),
    ]),
    ("05_payment_rail", "Payment Rail Integration", "Stellar SEP & EVM-Compatible Rail Tooling", [
        ("Rail Status",          ["Stellar SEP: Configured", "Arbitrum One: Connected", "Stripe: Configured", "ACH: Deferred"]),
        ("Transaction Types",    ["Internal Treasury Only", "Owner-Funded Ops", "Vendor Payments", "Infrastructure Costs"]),
        ("Not In Scope",         ["Customer Funds: NO", "Third-Party: NO", "Escrow: NO", "Brokerage: NO"]),
    ]),
    ("06_smart_contract", "Smart Contract Infrastructure", "Automated Control Layer — Arbitrum One", [
        ("Deployed Contracts",   ["AXM Token: Active", "AXUSD Stablecoin: Active", "Identity Registry: Active", "Treasury: Active"]),
        ("Contract Standards",   ["ERC-20 Governance Token", "ERC-3643 Compliant", "ERC-7726 Oracle", "OpenZeppelin Base"]),
        ("Developer Tools",      ["Hardhat Environment", "Ethers.js / viem", "Alchemy RPC", "Drizzle ORM"]),
    ]),
    ("07_tokenized_assets", "Tokenized Real-World Asset Infrastructure", "Asset Registry & Commodity Reference Framework", [
        ("Asset Registry",       ["PAXG Reference: Live", "XAUT Reference: Live", "Land Registry: Dev", "Commodity Feed: Dev"]),
        ("Instrument Types",     ["Gold Reserve (AXAU)", "Stablecoin (AXUSD)", "Land Receipt NFT", "Participation NFT"]),
        ("Pipeline Status",      ["Framework: Active", "Onboarding: Planned", "Audit: Planned", "Public Launch: Planned"]),
    ]),
]


if __name__ == "__main__":
    print("Generating wireframes...")
    for spec in WIREFRAME_SPECS:
        fname = spec[0]
        out = os.path.join(WIRE_DIR, f"{fname}.png")
        try:
            draw_wireframe(out, spec[1], spec[2], spec[3])
            if os.path.exists(out):
                print(f"  [OK] {fname}.png")
            else:
                # Check for PDF fallback
                pdf_out = out.replace(".png", ".pdf")
                if os.path.exists(pdf_out):
                    print(f"  [OK-PDF] {fname}.pdf (PNG conversion unavailable)")
                else:
                    print(f"  [SKIP] {fname} — no output produced")
        except Exception as e:
            print(f"  [ERR] {fname}: {e}")

    print("\nBuilding main PDF...")
    pdf_path = os.path.join(OUT_DIR, "Axiom_Nexus_Business_Plan_Product_Overview.pdf")
    build_pdf(pdf_path)

    print("\nWriting plain text version...")
    txt_path = os.path.join(OUT_DIR, "Axiom_Nexus_Business_Plan_Product_Overview.txt")
    with open(txt_path, "w") as f:
        f.write(TXT_BODY)
    print(f"[OK] TXT written: {txt_path}")

    print("\nDone. Outputs:")
    print(f"  {pdf_path}")
    print(f"  {txt_path}")
    print(f"  {WIRE_DIR}/")
