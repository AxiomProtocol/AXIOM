"""
generate_kyb_package.py  (v2 — full URL listing)
Produces:
  1. Axiom_Nexus_Business_Plan_Product_Overview.pdf
  2. Axiom_Nexus_Business_Plan_Product_Overview.txt
  3. bridge_product_screenshots/ — 7 wireframe PNGs (unchanged)
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

W, H = letter

OUT_DIR  = "/home/runner/workspace"
WIRE_DIR = "/home/runner/workspace/bridge_product_screenshots"
BASE_URL = "https://axiomprotocol.app"

# ── All platform pages grouped for Section 8 ─────────────────────────────────
# (label, path, one-line description)
PAGE_GROUPS = [
    ("Platform Identity", [
        ("/",               "Homepage",          "Public-facing overview of the Axiom Protocol ecosystem, product direction, and infrastructure mission."),
        ("/about-us",       "About",             "Company background, mission, and team description for Axiom Nexus LLC."),
    ]),
    ("Trust & Governance", [
        ("/trust",          "Trust Stack",       "Overview of the trust architecture: multi-party authorization, on-chain identity, and governance structure."),
        ("/trust/security", "Security & Live Controls", "Real-time security controls, circuit-breaker status, and active risk parameters."),
        ("/trust/audits",   "Audits & Verification",    "On-chain contract verification links, audit trail references, and third-party attestation records."),
        ("/trust/governance","Governance & Roles",       "Token-holder governance framework, role assignments, and on-chain proposal tooling."),
        ("/trust/team",     "Team & Entity",             "Entity details for Axiom Nexus LLC including formation state, management structure, and key personnel."),
        ("/trust/loss-coverage-reserve", "Loss Coverage Reserve", "Reserve buffer documentation for operational risk management."),
        ("/trust/no-bridges","No-Bridges Allow-List",    "Approved cross-chain bridge allow-list and governance policy for bridge access control."),
        ("/governance/bridge-allowlist","Bridge Allow-List Governance","On-chain governance module for maintaining and updating the approved bridge allow-list."),
    ]),
    ("Compliance & Disclosure", [
        ("/disclosure",     "Institutional Disclosure",    "Full institutional disclosure including regulatory vocabulary, GENIUS Act alignment language, and glossary of approved terms."),
        ("/disclosure/collateral-risk-policy", "Collateral Risk Policy", "Policy document governing collateral acceptance, risk parameters, and concentration limits."),
        ("/infrastructure", "Verify Infrastructure",       "Live on-chain contract addresses, verification links (Arbiscan), and deployment status for all smart contract layers."),
    ]),
    ("Asset Infrastructure — Stack", [
        ("/system-map",     "System Map",                  "Full technical architecture diagram showing all platform layers: identity, treasury, oracle, settlement, and asset registry."),
        ("/real-assets",    "Real Assets (Overview)",      "Framework overview for onboarding real-world assets including land, commodities, and physical property data."),
        ("/axau",           "AXAU — Gold Reserve",         "Axiom-issued gold reserve instrument backed by PAXG; shows live oracle pricing, reserve composition, and mint/redemption design."),
        ("/commodities/kag","Silver Reserve (KAG)",        "Silver reserve reference instrument backed by XAUT; shows Chainlink oracle pricing and reserve framework."),
        ("/assets",         "Supported Assets",            "Read-only registry of the 5 externally-supported assets: USDC, PAXG, XAUT, WBTC, cbETH."),
        ("/assets/dashboard","Asset Dashboard",            "Live oracle dashboard showing real-time spot prices, NAV observations, reserve attestations, and AXAU/AXUSD comparisons."),
        ("/axusd-3643",     "AXUSD Settlement Rail",       "ERC-3643 compliant stablecoin settlement rail documentation including KYC enforcement and on-chain identity requirements."),
        ("/commodity-framework","Tokenized Commodities",   "Framework for commodity-backed instrument issuance covering gold, silver, and planned commodity assets."),
        ("/axau-early-access","AXAU Early Access",         "Early access registration and information page for the AXAU gold reserve instrument."),
        ("/onramp",         "Card Onramp",                 "Coinbase-powered fiat-to-crypto onramp for acquiring AXUSD and AXAU via card payment."),
        ("/depin/denet",    "DePIN Network",               "Decentralized physical infrastructure network integration (DeNet node) for distributed storage and compute."),
    ]),
    ("Capital & Intelligence", [
        ("/capital/protocol-intelligence","Protocol Intelligence","Macro-level capital intelligence dashboard showing protocol-level metrics and treasury performance data."),
        ("/pilot",          "Capital Program",             "Capital program overview for early participants and institutional allocators."),
        ("/lending-fund",   "Lending Fund",                "SEC Reg D 506(c) compliant lending fund infrastructure integrated with Aave v3 yield layer."),
        ("/syndication",    "Syndication",                 "Syndication module for deal structuring and multi-party capital allocation."),
        ("/syndication/portal","Investor Portal",          "Secure portal for syndication participants to review deal terms and allocation status."),
        ("/secondary",      "Secondary Network",           "Axiom Secondary Network V1 for secondary liquidity and peer transfer tooling."),
        ("/mirdt",          "Regime Intelligence",         "MIRDT macro intelligence terminal for capital regime analysis and risk signal monitoring."),
        ("/sentinel",       "Sentinel",                    "Axiom Sentinel capital decision and risk authorization system with three-mode institutional solvency console."),
        ("/observer",       "Observer",                    "On-chain event observer for monitoring protocol activity and flagging anomalies."),
        ("/re",             "RE Intelligence",             "Real estate intelligence dashboard powered by RentCast and Walk Score data feeds."),
        ("/deal-intelligence","Deal Intelligence",         "AI-powered acquisition memo builder and deal analysis tool using Gemini AI."),
        ("/distressed-feed","Deal Flow",                   "Distressed property feed with automated scoring and acquisition pipeline management."),
        ("/property",       "Property Analysis",           "Property analysis tool for underwriting, IVCEE scoring, and DePIN-integrated field capture."),
    ]),
    ("Operations & Transparency", [
        ("/solvency",       "Solvency Console",            "Three-mode institutional solvency console showing reserve health badges, oracle confidence scores, and attestation status."),
        ("/proof-of-execution","Proof of Execution",       "On-chain proof-of-execution log for treasury operations, governance actions, and system events."),
        ("/transparency",   "Transparency",                "Public transparency dashboard with on-chain treasury data, reserve ratios, and protocol metrics."),
        ("/execution-framework","Execution Framework",     "Documented execution framework for treasury management, asset onboarding, and compliance procedures."),
    ]),
    ("Community", [
        ("/wealth-practice","Wealth Practice",             "Community group economics platform (formerly SUSU/ROSCA model) for cooperative savings and credit circles."),
        ("/land",           "Land Pipeline",               "Land acquisition pipeline dashboard tracking targeted property opportunities and physical-digital bridge activity."),
        ("/community-credit","Community Credit",           "Community credit framework for participant credit scoring and cooperative lending."),
        ("/nft",            "NFT Utility Collection",      "Axiom NFT utility collection including Founder Badges, Participation NFTs, and Land Receipt tokens on Arbitrum One."),
    ]),
    ("Products", [
        ("/savings",        "Savings",                     "Savings product interface built on the Wealth Practice cooperative model."),
        ("/products",       "All Products",                "Full product directory listing all active and planned platform modules."),
        ("/contact",        "Contact",                     "Contact information and inquiry form for Axiom Nexus LLC."),
    ]),
]


# ── Paragraph styles ──────────────────────────────────────────────────────────
def make_styles():
    return {
        "cover_title": ParagraphStyle("cover_title", fontName="Helvetica-Bold", fontSize=26,
            leading=32, textColor=colors.white, alignment=TA_CENTER, spaceAfter=10),
        "section_heading": ParagraphStyle("section_heading", fontName="Helvetica-Bold",
            fontSize=14, leading=18, textColor=NAVY, spaceBefore=18, spaceAfter=6),
        "group_heading": ParagraphStyle("group_heading", fontName="Helvetica-Bold",
            fontSize=11, leading=15, textColor=colors.white, spaceBefore=0, spaceAfter=0),
        "subsection": ParagraphStyle("subsection", fontName="Helvetica-Bold",
            fontSize=11, leading=15, textColor=GREEN, spaceBefore=10, spaceAfter=4),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=15,
            textColor=BODY, alignment=TA_JUSTIFY, spaceAfter=8),
        "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=10, leading=15,
            textColor=BODY, leftIndent=18, spaceAfter=4),
        "url_label": ParagraphStyle("url_label", fontName="Helvetica-Bold", fontSize=9.5,
            leading=13, textColor=NAVY, spaceAfter=1),
        "url_link": ParagraphStyle("url_link", fontName="Helvetica", fontSize=9,
            leading=12, textColor=colors.HexColor("#1B5E3B"), spaceAfter=1),
        "url_desc": ParagraphStyle("url_desc", fontName="Helvetica-Oblique", fontSize=8.5,
            leading=12, textColor=SUBTLE, spaceAfter=6),
        "caption": ParagraphStyle("caption", fontName="Helvetica-Oblique", fontSize=9,
            leading=13, textColor=SUBTLE, alignment=TA_CENTER, spaceAfter=8),
        "disclaimer": ParagraphStyle("disclaimer", fontName="Helvetica-Oblique", fontSize=8.5,
            leading=13, textColor=SUBTLE, alignment=TA_JUSTIFY, spaceAfter=6),
    }


# ── Page template ─────────────────────────────────────────────────────────────
def make_page_template(c, doc, styles):
    c.saveState()
    c.setFillColor(NAVY)
    c.rect(0, H - 36, W, 36, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.white)
    c.drawString(36, H - 23, "AXIOM NEXUS LLC")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#A0A8C0"))
    c.drawRightString(W - 36, H - 23, "Confidential — KYB Compliance Package")
    c.setFillColor(MID)
    c.rect(0, 0, W, 28, fill=1, stroke=0)
    c.setFont("Helvetica", 8)
    c.setFillColor(SUBTLE)
    c.drawString(36, 10, "axiomprotocol.app  |  Axiom Nexus LLC  |  EIN: 41-5188895")
    c.drawRightString(W - 36, 10, f"Page {doc.page}")
    c.restoreState()


# ── Cover page ────────────────────────────────────────────────────────────────
def build_cover(c, doc):
    c.saveState()
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 8, W, 8, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(0, 0, W, 8, fill=1, stroke=0)
    cx = W / 2
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.circle(cx, H - 130, 38, fill=0, stroke=1)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(cx, H - 137, "AN")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(cx, H - 205, "AXIOM NEXUS LLC")
    c.setFont("Helvetica-Bold", 17)
    c.setFillColor(GOLD)
    c.drawCentredString(cx, H - 228, "Business Plan, Product Overview")
    c.setFont("Helvetica-Bold", 17)
    c.setFillColor(colors.white)
    c.drawCentredString(cx, H - 250, "& KYB Compliance Package")
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.line(cx - 160, H - 268, cx + 160, H - 268)
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.HexColor("#D4D8E8"))
    c.drawCentredString(cx, H - 288, "Prepared for Submission to Bridge Compliance Team")
    info = [
        ("Legal Name:",   "Axiom Nexus LLC"),
        ("Formation:",    "December 26, 2025  |  Mississippi"),
        ("Entity ID:",    "1522557"),
        ("EIN:",          "41-5188895"),
        ("Management:",   "Manager Managed"),
        ("Industry:",     "Computer Systems Design and Related Services"),
        ("NAICS:",        "541511, 541512"),
        ("Website:",      "https://axiomprotocol.app"),
    ]
    bx, by = cx - 200, H - 330
    for label, val in info:
        c.setFont("Helvetica-Bold", 9.5)
        c.setFillColor(GOLD)
        c.drawString(bx, by, label)
        c.setFont("Helvetica", 9.5)
        c.setFillColor(colors.white)
        c.drawString(bx + 100, by, val)
        by -= 20
    from datetime import date
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#808090"))
    c.drawCentredString(cx, 50, f"Document Date: {date.today().strftime('%B %d, %Y')}  |  CONFIDENTIAL")
    c.restoreState()


# ── Wireframe generator (unchanged) ──────────────────────────────────────────
def draw_wireframe(filename, title, subtitle, sections):
    from reportlab.pdfgen import canvas as C
    import subprocess, shutil

    pw, ph = 960, 640
    tmp_pdf = filename.replace(".png", "_tmp.pdf")
    c = C.Canvas(tmp_pdf, pagesize=(pw, ph))
    c.setFillColor(colors.HexColor("#F7F8FA"))
    c.rect(0, 0, pw, ph, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#E0E3EA"))
    c.rect(0, ph - 40, pw, 40, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#C8CBD4"))
    c.roundRect(60, ph - 32, pw - 180, 22, 6, fill=1, stroke=0)
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#555"))
    c.drawString(72, ph - 24, "https://axiomprotocol.app")
    for i, col in enumerate(["#FF5F57", "#FFBD2E", "#28C840"]):
        c.setFillColor(colors.HexColor(col))
        c.circle(12 + i * 18, ph - 20, 6, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.rect(0, ph - 80, pw, 40, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.white)
    c.drawString(20, ph - 60, "AXIOM PROTOCOL")
    nx = 200
    for item in ["About", "Assets", "Capital", "Intelligence", "Operations"]:
        c.setFont("Helvetica", 9)
        c.drawString(nx, ph - 60, item)
        nx += 80
    c.setFillColor(colors.HexColor("#EEF0F5"))
    c.rect(0, ph - 130, pw, 50, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(NAVY)
    c.drawString(24, ph - 105, title)
    c.setFont("Helvetica", 10)
    c.setFillColor(SUBTLE)
    c.drawString(24, ph - 120, subtitle)
    sy = ph - 160
    col_w = (pw - 48) // max(len(sections), 1)
    for i, (sec_title, sec_lines) in enumerate(sections):
        sx = 24 + i * col_w
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor("#D8DCE8"))
        c.setLineWidth(0.8)
        c.roundRect(sx, sy - 200, col_w - 12, 200, 4, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.roundRect(sx, sy - 28, col_w - 12, 28, 4, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.white)
        c.drawString(sx + 10, sy - 18, sec_title)
        ly = sy - 48
        for line in sec_lines:
            c.setFillColor(colors.HexColor("#E8EAF0"))
            c.rect(sx + 10, ly - 8, col_w - 32, 12, fill=1, stroke=0)
            c.setFont("Helvetica", 8)
            c.setFillColor(BODY)
            c.drawString(sx + 14, ly - 4, line[:38])
            ly -= 22
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#B0B4C0"))
    c.drawCentredString(pw / 2, 14, "PRODUCT WIREFRAME / DEVELOPMENT PREVIEW — Axiom Nexus LLC")
    c.save()
    try:
        subprocess.run(
            ["pdftoppm", "-r", "120", "-png", "-l", "1", tmp_pdf, filename.replace(".png", "")],
            check=True, capture_output=True
        )
        candidate = filename.replace(".png", "") + "-1.png"
        if os.path.exists(candidate):
            shutil.move(candidate, filename)
        os.remove(tmp_pdf)
    except Exception:
        os.rename(tmp_pdf, filename.replace(".png", ".pdf"))


# ── Plain-text body ───────────────────────────────────────────────────────────
def build_txt_section8():
    lines = []
    lines.append("SECTION 8 — PRODUCT SCREENSHOTS AND PLATFORM PAGE DIRECTORY")
    lines.append("=" * 66)
    lines.append("")
    lines.append("All screenshots were taken from the live platform at:")
    lines.append("https://axiomprotocol.app")
    lines.append("")
    lines.append("The following pages were captured. Each URL is publicly accessible")
    lines.append("and demonstrates the operational depth of the platform.")
    lines.append("")
    for group_name, pages in PAGE_GROUPS:
        lines.append(f"--- {group_name} ---")
        for path, label, desc in pages:
            url = BASE_URL + path
            lines.append(f"  {label}")
            lines.append(f"  URL  : {url}")
            lines.append(f"  Note : {desc}")
            lines.append("")
    return "\n".join(lines)


TXT_SECTIONS_1_TO_7 = """\
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
    identity, governance, and asset-management tooling.

  - Compliance-Focused Digital Asset Infrastructure
    Software systems supporting KYC/KYB workflows, audit trails, and
    regulatory-aligned data structures for digital asset environments.

  - Smart Contract Tools
    ERC-20, ERC-3643, and ERC-7726 compatible automated control layer tooling
    for on-chain identity verification, token issuance, and oracle-driven pricing.

  - Treasury Management Dashboard
    Internal dashboard providing real-time visibility into on-chain treasury
    balances, reserve compositions, and multi-party authorization activity.

  - Reserve and Solvency Reporting Tools
    Oracle-driven reserve attestation dashboards producing readable solvency
    reports suitable for compliance review and internal governance.

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
    Identity registry and governance token infrastructure enabling permissioned
    access control and participant management within the platform.

================================================================
SECTION 4 — CURRENT DEVELOPMENT STAGE
================================================================

The company is in early-stage development and onboarding.
Axiom Nexus LLC is currently building software, technical infrastructure,
compliance workflows, dashboards, and platform interfaces.
No regulated financial products are currently offered to the public.

================================================================
SECTION 5 — ACCOUNT USAGE
================================================================

The Bridge account will be used only for internal business treasury activity,
owner-funded operating expenses, software development costs, infrastructure
expenses, vendor payments, compliance preparation, platform setup, and general
business operations.

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

Funds are not derived from customer deposits, customer custody, money
transmission activity, public investment offerings, or third-party client funds.

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
"""

TXT_SECTIONS_9_TO_10 = """
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

    # Cover page placeholder
    story.append(Spacer(1, 9.5 * inch))
    story.append(PageBreak())

    # ── Section 1 ──────────────────────────────────────────────────────────────
    story.append(Paragraph("Section 1 — Executive Summary", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "Axiom Nexus LLC is a financial technology and blockchain software infrastructure "
        "company. The company develops compliance-focused digital asset systems, smart contract "
        "tools, tokenized real-world asset infrastructure, treasury management technology, and "
        "payment rail integration tooling.",
        styles["body"]))
    story.append(Paragraph(
        "Axiom Nexus LLC is currently an early-stage software and technology company focused on "
        "product development, technical architecture, vendor onboarding, compliance preparation, "
        "and internal business operations. No regulated financial products are currently offered "
        "to the public.",
        styles["body"]))

    # ── Section 2 ──────────────────────────────────────────────────────────────
    story.append(Paragraph("Section 2 — Business Model", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "Axiom Nexus LLC's business model is based on developing software infrastructure, "
        "dashboards, smart contract systems, treasury management tools, compliance tooling, "
        "and platform technology for digital finance and tokenized real-world asset workflows.",
        styles["body"]))
    story.append(Paragraph(
        "The company does not currently operate as, and does not describe itself as, a bank, "
        "money transmitter, investment adviser, broker-dealer, custodian, crypto brokerage, "
        "OTC desk, or payment processor.",
        styles["body"]))

    # ── Section 3 ──────────────────────────────────────────────────────────────
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

    # ── Section 4 ──────────────────────────────────────────────────────────────
    story.append(Paragraph("Section 4 — Current Development Stage", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    for para in [
        "The company is in early-stage development and onboarding.",
        "Axiom Nexus LLC is currently building software, technical infrastructure, compliance "
        "workflows, dashboards, and platform interfaces.",
        "No regulated financial products are currently offered to the public.",
    ]:
        story.append(Paragraph(para, styles["body"]))

    # ── Section 5 ──────────────────────────────────────────────────────────────
    story.append(Paragraph("Section 5 — Account Usage", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "The Bridge account will be used <b>only</b> for internal business treasury activity, "
        "owner-funded operating expenses, software development costs, infrastructure expenses, "
        "vendor payments, compliance preparation, platform setup, and general business operations.",
        styles["body"]))
    story.append(Paragraph("The account will <b>not</b> be used to:", styles["body"]))
    for item in [
        "Transmit customer funds", "Custody customer assets", "Hold client escrow funds",
        "Process third-party payments", "Operate a virtual currency brokerage",
        "Operate an OTC trading desk", "Provide investment advisory services",
    ]:
        story.append(Paragraph(f"\u2022  {item}", styles["bullet"]))

    # ── Section 6 ──────────────────────────────────────────────────────────────
    story.append(Paragraph("Section 6 — Source of Funds", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "The company is currently funded by owner's capital contributed by the founder/member "
        "for formation, software development, infrastructure, compliance preparation, and "
        "operating expenses.",
        styles["body"]))
    story.append(Paragraph(
        "Funds are not derived from customer deposits, customer custody, money transmission "
        "activity, public investment offerings, or third-party client funds.",
        styles["body"]))

    story.append(PageBreak())

    # ── Section 7 ──────────────────────────────────────────────────────────────
    story.append(Paragraph("Section 7 — Compliance Clarification", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    box_data = [[Paragraph(
        "<b>Axiom Nexus LLC does not currently</b> custody customer funds, transmit customer "
        "funds, operate as a bank, operate as a licensed money transmitter, provide investment "
        "advisory services, operate a virtual currency brokerage or OTC trading desk, hold "
        "client escrow funds, or provide regulated financial products to the public.<br/><br/>"
        "Any regulated activity, if launched in the future, will be conducted only after "
        "applicable legal review, required registrations or exemptions, approved compliance "
        "procedures, and/or the use of licensed third-party providers.",
        ParagraphStyle("box_text", fontName="Helvetica", fontSize=10,
                       leading=15, textColor=NAVY, alignment=TA_JUSTIFY)
    )]]
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

    # ── Section 8 — full URL directory ─────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Section 8 — Product Screenshots and Platform Page Directory",
                            styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "All screenshots submitted with this package were captured from the live platform at "
        "<b>https://axiomprotocol.app</b>. The table below lists every page included in the "
        "screenshot set, its full URL, and a brief description of the module or function it "
        "represents. Individual wireframe preview images are provided in the accompanying "
        "<i>bridge_product_screenshots/</i> folder.",
        styles["body"]))
    story.append(Spacer(1, 6))

    for group_name, pages in PAGE_GROUPS:
        # Group header row
        header_data = [[
            Paragraph(group_name, styles["group_heading"]),
            Paragraph("URL", styles["group_heading"]),
            Paragraph("Description", styles["group_heading"]),
        ]]
        header_table = Table(header_data, colWidths=[1.4*inch, 2.5*inch, 2.85*inch])
        header_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), NAVY),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(header_table)

        # Page rows
        row_data = []
        for path, label, desc in pages:
            url = BASE_URL + path
            row_data.append([
                Paragraph(label, ParagraphStyle("tbl_label", fontName="Helvetica-Bold",
                    fontSize=8.5, leading=12, textColor=NAVY)),
                Paragraph(url, ParagraphStyle("tbl_url", fontName="Helvetica",
                    fontSize=7.5, leading=11, textColor=GREEN)),
                Paragraph(desc, ParagraphStyle("tbl_desc", fontName="Helvetica",
                    fontSize=8, leading=11, textColor=BODY)),
            ])

        rows_table = Table(row_data, colWidths=[1.4*inch, 2.5*inch, 2.85*inch])
        row_style = TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.white),
            ("ROWBACKGROUNDS",(0, 0), (-1, -1), [colors.white, colors.HexColor("#F5F6FA")]),
            ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D4E0")),
            ("INNERGRID",     (0, 0), (-1, -1), 0.3, colors.HexColor("#E0E3EC")),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ])
        rows_table.setStyle(row_style)
        story.append(rows_table)
        story.append(Spacer(1, 10))

    story.append(PageBreak())

    # ── Section 9 ──────────────────────────────────────────────────────────────
    story.append(Paragraph("Section 9 — Website and Public Presence", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        "Website: <b><u>https://axiomprotocol.app</u></b>",
        ParagraphStyle("website", fontName="Helvetica-Bold", fontSize=11,
                       leading=16, textColor=NAVY, spaceAfter=8)))
    story.append(Paragraph(
        "The website provides public information about the Axiom Protocol ecosystem, product "
        "direction, and platform infrastructure. It does not offer financial products, investment "
        "opportunities, or regulated services to the public.",
        styles["body"]))

    # ── Section 10 ─────────────────────────────────────────────────────────────
    story.append(Paragraph("Section 10 — Final KYB Summary", styles["section_heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=8))
    summary_data = [[Paragraph(
        "Axiom Nexus LLC is a software and technology infrastructure company. The company is "
        "<b>not</b> currently using Bridge for customer funds, money transmission, custody, "
        "escrow, investment advisory activity, brokerage activity, OTC trading, or banking "
        "activity.<br/><br/>"
        "The requested Bridge account is intended for <b>internal business operations and "
        "treasury activity only.</b>",
        ParagraphStyle("sum_text", fontName="Helvetica", fontSize=10.5,
                       leading=16, textColor=colors.white, alignment=TA_JUSTIFY)
    )]]
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
    story.append(Paragraph(
        "This document has been prepared by Axiom Nexus LLC for submission to Bridge compliance "
        "personnel. It is confidential and intended solely for KYB review purposes. The statements "
        "contained herein are accurate to the best of the company's knowledge as of the document "
        "date. Nothing in this document constitutes legal advice, investment advice, or a "
        "solicitation of any kind.",
        styles["disclaimer"]))

    def on_first_page(canvas, doc):
        build_cover(canvas, doc)

    def on_later_pages(canvas, doc):
        make_page_template(canvas, doc, styles)

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(f"[OK] PDF written: {output_path}")


# ── Wireframe specs ───────────────────────────────────────────────────────────
WIREFRAME_SPECS = [
    ("01_homepage",           "Axiom Protocol — Homepage",            "axiomprotocol.app",                      [("Platform Overview",["Axiom Protocol Ecosystem","Governance Token (AXM)","Reserve Infrastructure","DePIN Integration"]),("Product Modules",["Treasury Dashboard","Reserve Solvency Tool","Asset Registry","Compliance Workflow"]),("Protocol Status",["Smart Contracts: Active","Oracle: Live","Arbitrum One: Connected","Audit: Pending"])]),
    ("02_treasury_dashboard", "Treasury Management Dashboard",        "axiomprotocol.app/assets/dashboard",     [("Treasury Balances",["USDC: $0.00","PAXG: — oz","WBTC: — BTC","cbETH: — ETH"]),("Reserve Summary",["Gross NAV: Pending","Attestation: Pending","Last Oracle: —","Confidence: —"]),("Recent Activity",["No transactions yet","Vendor payments: —","Infrastructure: —","Operations: —"])]),
    ("03_reserve_solvency",   "Reserve & Solvency Dashboard",         "axiomprotocol.app/solvency",             [("Solvency Metrics",["Reserve Ratio: Pending","Confidence Score: —","Freshness: —","Source: Chainlink"]),("Asset Attestation",["PAXG NAV: Pending","BitGo Status: Pending","Last Poll: —","Observation: —"]),("Compliance State",["KYB: In Progress","Audit Trail: Active","Alerts: 0","Policy: Active"])]),
    ("04_compliance_workflow","Compliance Workflow Dashboard",         "axiomprotocol.app/disclosure",           [("Participant Status",["Identity: Manager Managed","EIN Filed: Yes","State ID: 1522557","KYB: Submitted"]),("Document Pipeline",["Formation Docs: Filed","Business Plan: Prepared","Screenshots: Prepared","Bridge KYB: In Review"]),("Audit Log",["Entity Created: 2025-12-26","Vendor Onboard: In Progress","API Keys: Pending","Review: Active"])]),
    ("05_payment_rail",       "Payment Rail Integration",             "axiomprotocol.app/axusd-3643",           [("Rail Status",["Stellar SEP: Configured","Arbitrum One: Connected","Stripe: Configured","ACH: Deferred"]),("Transaction Types",["Internal Treasury Only","Owner-Funded Ops","Vendor Payments","Infrastructure Costs"]),("Not In Scope",["Customer Funds: NO","Third-Party: NO","Escrow: NO","Brokerage: NO"])]),
    ("06_smart_contract",     "Smart Contract Infrastructure",        "axiomprotocol.app/infrastructure",       [("Deployed Contracts",["AXM Token: Active","AXUSD Stablecoin: Active","Identity Registry: Active","Treasury: Active"]),("Contract Standards",["ERC-20 Governance Token","ERC-3643 Compliant","ERC-7726 Oracle","OpenZeppelin Base"]),("Developer Tools",["Hardhat Environment","Ethers.js / viem","Alchemy RPC","Drizzle ORM"])]),
    ("07_tokenized_assets",   "Tokenized Real-World Asset Infrastructure","axiomprotocol.app/real-assets",      [("Asset Registry",["PAXG Reference: Live","XAUT Reference: Live","Land Registry: Dev","Commodity Feed: Dev"]),("Instrument Types",["Gold Reserve (AXAU)","Stablecoin (AXUSD)","Land Receipt NFT","Participation NFT"]),("Pipeline Status",["Framework: Active","Onboarding: Planned","Audit: Planned","Public Launch: Planned"])]),
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
                pdf_out = out.replace(".png", ".pdf")
                if os.path.exists(pdf_out):
                    print(f"  [OK-PDF] {fname}.pdf")
        except Exception as e:
            print(f"  [ERR] {fname}: {e}")

    print("\nBuilding main PDF...")
    pdf_path = os.path.join(OUT_DIR, "Axiom_Nexus_Business_Plan_Product_Overview.pdf")
    build_pdf(pdf_path)

    print("\nWriting plain text version...")
    txt_path = os.path.join(OUT_DIR, "Axiom_Nexus_Business_Plan_Product_Overview.txt")
    with open(txt_path, "w") as f:
        f.write(TXT_SECTIONS_1_TO_7)
        f.write(build_txt_section8())
        f.write(TXT_SECTIONS_9_TO_10)
    print(f"[OK] TXT written: {txt_path}")

    print("\nDone.")
