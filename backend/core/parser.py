import os
import re
import json
from typing import Dict, Any, List, Optional, Tuple
from bs4 import BeautifulSoup
import fitz # PyMuPDF
import pdfplumber

# Canonical metric concepts in US-GAAP and common reporting
XBRL_CONCEPT_MAP = {
    # Revenue
    "us-gaap:Revenues": "revenue",
    "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax": "revenue",
    "us-gaap:SalesRevenueNet": "revenue",
    "us-gaap:TotalRevenuesAndOtherIncome": "revenue",
    # Gross Profit
    "us-gaap:GrossProfit": "gross_profit",
    # Operating Income
    "us-gaap:OperatingIncomeLoss": "operating_income",
    # Net Income
    "us-gaap:NetIncomeLoss": "net_income",
    "us-gaap:ProfitLoss": "net_income",
    # EPS
    "us-gaap:EarningsPerShareDiluted": "eps",
    "us-gaap:EarningsPerShareBasic": "eps_basic",
    # Balance Sheet Assets
    "us-gaap:Assets": "total_assets",
    "us-gaap:AssetsCurrent": "current_assets",
    "us-gaap:CashAndCashEquivalentsAtCarryingValue": "cash",
    "us-gaap:MarketableSecuritiesCurrent": "marketable_securities",
    # Balance Sheet Liabilities & Equity
    "us-gaap:Liabilities": "total_liabilities",
    "us-gaap:LiabilitiesCurrent": "current_liabilities",
    "us-gaap:StockholdersEquity": "equity",
    "us-gaap:LongTermDebt": "total_debt",
    "us-gaap:LongTermDebtNoncurrent": "long_term_debt",
    "us-gaap:ShortTermBorrowings": "short_term_debt",
    # Cash Flow
    "us-gaap:NetCashProvidedByUsedInOperatingActivities": "operating_cash_flow",
    "us-gaap:PaymentsToAcquirePropertyPlantAndEquipment": "capex",
    "us-gaap:PaymentsToAcquireProductiveAssets": "capex",
    # Shares and Headcount
    "us-gaap:CommonStockSharesOutstanding": "shares_outstanding",
    "dei:EntityCommonStockSharesOutstanding": "shares_outstanding",
    "dei:EntityNumberOfEmployees": "headcount"
}

# Fuzzy text label matcher for financial statements (when XBRL tags not present)
ROW_LABEL_PATTERNS = [
    (r"(?:total\s+)?(?:net\s+)?(?:revenues?|sales|turnover)", "revenue"),
    (r"gross\s+(?:profit|margin)", "gross_profit"),
    (r"(?:operating\s+income|income\s+from\s+operations|operating\s+profit)", "operating_income"),
    (r"(?:net\s+income|net\s+earnings|net\s+profit|profit\s+after\s+tax|pat)", "net_income"),
    (r"(?:diluted\s+earnings\s+per\s+share|diluted\s+eps)", "eps"),
    (r"total\s+current\s+assets", "current_assets"),
    (r"total\s+assets", "total_assets"),
    (r"total\s+current\s+liabilities", "current_liabilities"),
    (r"total\s+liabilities", "total_liabilities"),
    (r"(?:total\s+)?(?:stockholders['\s]*equity|shareholders['\s]*equity|total\s+equity)", "equity"),
    (r"(?:cash\s+and\s+cash\s+equivalents)", "cash"),
    (r"(?:total\s+debt|long[\s-]term\s+debt|borrowings)", "total_debt"),
    (r"(?:cash\s+provided\s+by|from)\s+operating\s+activities", "operating_cash_flow"),
    (r"(?:capital\s+expenditures?|payments\s+for\s+property|capex)", "capex"),
    (r"(?:number\s+of\s+employees|headcount)", "headcount")
]

SECTION_PATTERNS = [
    (r"item\s+1\.\s+business", "Item 1. Business"),
    (r"item\s+1a\.\s+risk\s+factors", "Item 1A. Risk Factors"),
    (r"item\s+3\.\s+legal\s+proceedings", "Item 3. Legal Proceedings"),
    (r"item\s+7\.\s+management['’]?s\s+discussion", "Item 7. MD&A"),
    (r"item\s+8\.\s+financial\s+statements", "Item 8. Financial Statements"),
    (r"item\s+9a\.\s+controls\s+and\s+procedures", "Item 9A. Controls and Procedures"),
    (r"note\s+\d+[\.\:\s]+(?:going\s+concern|liquidity)", "Note: Going Concern"),
    (r"note\s+\d+[\.\:\s]+(?:related\s+party)", "Note: Related Party Transactions"),
    (r"note\s+\d+[\.\:\s]+(?:debt|borrowings)", "Note: Debt and Financing"),
    (r"note\s+\d+[\.\:\s]+(?:commitments|contingencies)", "Note: Commitments and Contingencies"),
    (r"note\s+\d+[\.\:\s]+(?:concentration)", "Note: Customer/Credit Concentration"),
    (r"note\s+\d+[\.\:\s]+(?:subsequent\s+events)", "Note: Subsequent Events")
]

def map_row_label_to_metric(label: str) -> Optional[str]:
    lbl = label.strip().lower()
    for pattern, metric in ROW_LABEL_PATTERNS:
        if re.search(pattern, lbl):
            return metric
    return None

def parse_html_filing(html_text: str, doc_id: str, doc_title: str) -> Dict[str, Any]:
    """
    Parses HTML / iXBRL SEC filing into structured passages, table cells, and facts.
    """
    soup = BeautifulSoup(html_text, "lxml")
    passages = []
    facts = []
    table_cells = []

    current_section = "General / Overview"

    # 1. Parse iXBRL context references to resolve period dates/years and dimensions
    context_map = {}
    for ctx in soup.find_all(["xbrli:context", "context"]):
        ctx_id = ctx.get("id")
        if not ctx_id:
            continue
        has_segment = ctx.find(["xbrli:segment", "segment", "xbrli:scenario", "scenario"]) is not None
        instant = ctx.find(["xbrli:instant", "instant"])
        end_date = ctx.find(["xbrli:enddate", "enddate", "xbrli:endDate", "endDate"])
        target_date_elem = end_date if end_date is not None else instant
        if target_date_elem:
            d_str = target_date_elem.text.strip()
            y_match = re.search(r"20\d\d", d_str)
            period_label = f"FY{y_match.group()}" if y_match else d_str
            context_map[ctx_id] = {
                "period": period_label,
                "is_consolidated": not has_segment
            }

    # 2. Check for Inline XBRL elements (<ix:nonfraction>)
    ix_elements = soup.find_all(["ix:nonfraction", "ix:nonFraction"])
    has_ixbrl = len(ix_elements) > 0

    if has_ixbrl:
        for idx, tag in enumerate(ix_elements):
            concept = tag.get("name", "")
            canonical = XBRL_CONCEPT_MAP.get(concept)
            raw_text = tag.text.strip().replace(",", "")
            if not raw_text:
                continue

            try:
                sign = -1.0 if tag.get("sign") == "-" else 1.0
                scale = int(tag.get("scale", 0))
                num_matches = re.findall(r"[-+]?\d*\.?\d+", raw_text)
                if not num_matches:
                    continue
                val = float(num_matches[0]) * sign
                multiplier = 10 ** scale
                full_val = val * multiplier

                ctx_ref = tag.get("contextref", "")
                ctx_info = context_map.get(ctx_ref, {"period": ctx_ref or "Current", "is_consolidated": True})
                period = ctx_info["period"]
                is_consolidated = ctx_info["is_consolidated"]

                # For EPS and headcount, keep actual value; for financial totals in dollars, normalize to USD millions
                if canonical in ["eps", "eps_basic"]:
                    val_millions = round(val, 2)
                    unit_str = "USD/share"
                elif canonical == "headcount":
                    val_millions = round(full_val, 0)
                    unit_str = "employees"
                else:
                    val_millions = round(full_val / 1e6, 2)
                    unit_str = "USD million"

                elem_id = tag.get("id", f"ix_{idx}")

                facts.append({
                    "id": f"fact_ix_{doc_id}_{idx}",
                    "metric": canonical or concept.split(":")[-1],
                    "canonical_metric": canonical,
                    "value": val_millions,
                    "unit": unit_str,
                    "period": period,
                    "doc_id": doc_id,
                    "doc_title": doc_title,
                    "cell_id": elem_id,
                    "passage_id": None,
                    "page": 1,
                    "section": current_section,
                    "as_of_date": period if "FY" in period else "",
                    "xbrl_tag": concept,
                    "extraction_method": "ixbrl",
                    "confidence": 1.0,
                    "is_authoritative": 1 if is_consolidated else 0
                })
            except Exception:
                continue

    # 2. Extract sections and passages from paragraphs and headings
    text_blocks = []
    p_tags = soup.find_all(["p", "div", "h1", "h2", "h3", "h4", "table"])
    
    passage_idx = 0
    char_offset = 0

    for el in p_tags:
        # Check if heading defines a new section
        text = el.get_text(" ", strip=True)
        if not text:
            continue

        lower_text = text.lower()
        if len(text) < 120:
            for pat, sec_name in SECTION_PATTERNS:
                if re.search(pat, lower_text):
                    current_section = sec_name
                    break

        if el.name == "table":
            # Process table
            rows = el.find_all("tr")
            if not rows:
                continue
            headers = []
            for r_idx, row in enumerate(rows):
                cols = row.find_all(["th", "td"])
                row_vals = [c.get_text(" ", strip=True) for c in cols]
                if r_idx == 0 and any(re.search(r"20\d\d", v) for v in row_vals):
                    headers = row_vals
                    continue

                if not row_vals or not row_vals[0]:
                    continue

                row_label = row_vals[0]
                canonical = map_row_label_to_metric(row_label)

                for c_idx, val_str in enumerate(row_vals[1:], 1):
                    col_header = headers[c_idx] if c_idx < len(headers) else f"Col {c_idx}"
                    num_match = re.search(r"\(?[-+]?\d[\d,]*\.?\d*\)?", val_str)
                    if num_match:
                        raw_num = num_match.group()
                        is_neg = "(" in raw_num or "-" in raw_num
                        clean_num = raw_num.replace("(", "").replace(")", "").replace(",", "").strip()
                        try:
                            num_val = float(clean_num)
                            if is_neg:
                                num_val = -num_val

                            cell_id = f"cell_{doc_id}_{len(table_cells)}"
                            table_cells.append({
                                "id": cell_id,
                                "doc_id": doc_id,
                                "page": 1,
                                "table_name": current_section,
                                "row_label": row_label,
                                "column_label": col_header,
                                "raw_value": val_str,
                                "parsed_value": num_val,
                                "unit": "USD million",
                                "period": col_header
                            })

                            if canonical:
                                facts.append({
                                    "id": f"fact_tbl_{doc_id}_{len(facts)}",
                                    "metric": canonical,
                                    "canonical_metric": canonical,
                                    "value": num_val,
                                    "unit": "USD million" if canonical != "eps" else "USD/share",
                                    "period": col_header,
                                    "doc_id": doc_id,
                                    "doc_title": doc_title,
                                    "cell_id": cell_id,
                                    "passage_id": None,
                                    "page": 1,
                                    "section": current_section,
                                    "as_of_date": "",
                                    "xbrl_tag": None,
                                    "extraction_method": "table",
                                    "confidence": 0.95
                                })
                        except Exception:
                            pass
        else:
            # Paragraph / passage
            if len(text) > 40:
                p_id = f"p_{doc_id}_{passage_idx}"
                passages.append({
                    "id": p_id,
                    "doc_id": doc_id,
                    "doc_title": doc_title,
                    "page": 1,
                    "section": current_section,
                    "text": text,
                    "char_start": char_offset,
                    "char_end": char_offset + len(text),
                    "date": ""
                })
                char_offset += len(text) + 1
                passage_idx += 1

    return {
        "passages": passages,
        "facts": facts,
        "table_cells": table_cells,
        "has_ixbrl": has_ixbrl
    }

def parse_pdf_document(pdf_path: str, doc_id: str, doc_title: str) -> Dict[str, Any]:
    """
    Parses PDF filing using PyMuPDF (fitz) for text + bounding boxes, and pdfplumber for tables.
    Includes scanned PDF detection.
    """
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    total_text_length = 0

    passages = []
    facts = []
    table_cells = []
    current_section = "General / Overview"

    # Scanned document detection check
    for p_no in range(min(5, total_pages)):
        page = doc[p_no]
        total_text_length += len(page.get_text().strip())

    avg_chars_per_page = total_text_length / max(1, min(5, total_pages))
    if avg_chars_per_page < 50:
        doc.close()
        return {
            "is_scanned": True,
            "error": "scanned document, not supported",
            "passages": [],
            "facts": [],
            "table_cells": []
        }

    passage_idx = 0
    for page_idx in range(total_pages):
        page = doc[page_idx]
        page_num = page_idx + 1

        # Extract text blocks with bounding boxes
        blocks = page.get_text("blocks") # (x0, y0, x1, y1, text, block_no, block_type)
        for b in blocks:
            x0, y0, x1, y1, text = b[0], b[1], b[2], b[3], b[4].strip()
            if not text:
                continue

            lower_text = text.lower()
            if len(text) < 120:
                for pat, sec_name in SECTION_PATTERNS:
                    if re.search(pat, lower_text):
                        current_section = sec_name
                        break

            if len(text) > 30:
                passages.append({
                    "id": f"p_{doc_id}_{passage_idx}",
                    "doc_id": doc_id,
                    "doc_title": doc_title,
                    "page": page_num,
                    "section": current_section,
                    "text": text,
                    "char_start": 0,
                    "char_end": len(text),
                    "date": "",
                    "bbox": [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)]
                })
                passage_idx += 1

    doc.close()

    # Extract tables using pdfplumber
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    headers = [h.strip() if h else f"Col {i}" for i, h in enumerate(table[0])]
                    for row in table[1:]:
                        if not row or not row[0]:
                            continue
                        row_label = str(row[0]).strip()
                        canonical = map_row_label_to_metric(row_label)

                        for c_idx, val_str in enumerate(row[1:], 1):
                            if not val_str:
                                continue
                            val_str = str(val_str).strip()
                            col_header = headers[c_idx] if c_idx < len(headers) else f"Col {c_idx}"
                            num_match = re.search(r"\(?[-+]?\d[\d,]*\.?\d*\)?", val_str)
                            if num_match:
                                raw_num = num_match.group()
                                is_neg = "(" in raw_num or "-" in raw_num
                                clean_num = raw_num.replace("(", "").replace(")", "").replace(",", "").strip()
                                try:
                                    num_val = float(clean_num)
                                    if is_neg:
                                        num_val = -num_val

                                    cell_id = f"cell_{doc_id}_{len(table_cells)}"
                                    table_cells.append({
                                        "id": cell_id,
                                        "doc_id": doc_id,
                                        "page": page_idx + 1,
                                        "table_name": current_section,
                                        "row_label": row_label,
                                        "column_label": col_header,
                                        "raw_value": val_str,
                                        "parsed_value": num_val,
                                        "unit": "USD million",
                                        "period": col_header
                                    })

                                    if canonical:
                                        facts.append({
                                            "id": f"fact_{doc_id}_{len(facts)}",
                                            "metric": canonical,
                                            "canonical_metric": canonical,
                                            "value": num_val,
                                            "unit": "USD million" if canonical != "eps" else "USD/share",
                                            "period": col_header,
                                            "doc_id": doc_id,
                                            "doc_title": doc_title,
                                            "cell_id": cell_id,
                                            "passage_id": None,
                                            "page": page_idx + 1,
                                            "section": current_section,
                                            "as_of_date": "",
                                            "xbrl_tag": None,
                                            "extraction_method": "pdf_table",
                                            "confidence": 0.90
                                        })
                                except Exception:
                                    pass
    except Exception:
        pass

    return {
        "is_scanned": False,
        "passages": passages,
        "facts": facts,
        "table_cells": table_cells
    }

def find_text_bounding_box(pdf_path: str, search_text: str, page_num: int = 1) -> Optional[List[float]]:
    """
    Locates the exact bounding box [x0, y0, x1, y1] for a quote or phrase on a PDF page.
    """
    try:
        doc = fitz.open(pdf_path)
        if page_num < 1 or page_num > len(doc):
            return None
        page = doc[page_num - 1]
        # Search for exact or snippet
        rects = page.search_for(search_text[:60])
        if rects:
            r = rects[0]
            doc.close()
            return [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)]
        doc.close()
    except Exception:
        pass
    return None
