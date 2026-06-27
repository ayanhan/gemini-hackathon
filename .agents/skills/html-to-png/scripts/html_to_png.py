import markdown
import os
import sys
import asyncio
from playwright.async_api import async_playwright

def md_to_html(md_path, html_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Convert markdown to HTML with standard extensions (tables, extra elements)
    html_content = markdown.markdown(
        md_content,
        extensions=['extra', 'tables', 'toc']
    )
    
    # Premium stylesheet matching BoringClicks design principles
    css = """
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    
    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        color: #111827;
        background-color: #ffffff;
        line-height: 1.6;
        padding: 20px;
        max-width: 900px;
        margin: 0 auto;
        font-size: 14px;
    }
    
    h1, h2, h3, h4 {
        color: #000000;
        font-weight: 700;
        margin-top: 28px;
        margin-bottom: 12px;
        page-break-after: avoid;
    }
    
    h1 {
        font-size: 26px;
        border-bottom: 2px solid #000000;
        padding-bottom: 8px;
        margin-top: 0;
    }
    
    h2 {
        font-size: 18px;
        border-bottom: 1px solid #E5E7EB;
        padding-bottom: 6px;
        margin-top: 24px;
    }
    
    h3 {
        font-size: 15px;
        margin-top: 18px;
    }
    
    p {
        margin-top: 0;
        margin-bottom: 14px;
        text-align: justify;
    }
    
    ul, ol {
        margin-top: 0;
        margin-bottom: 14px;
        padding-left: 20px;
    }
    
    li {
        margin-bottom: 4px;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
        margin-bottom: 16px;
        page-break-inside: avoid;
    }
    
    th, td {
        border: 1px solid #D1D5DB;
        padding: 8px 10px;
        text-align: left;
        font-size: 13px;
        vertical-align: top;
    }
    
    th {
        background-color: #F3F4F6;
        font-weight: 600;
        color: #374151;
    }
    
    img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
        border-radius: 4px;
    }
    
    hr {
        height: 1px;
        border: 0;
        background-color: #E5E7EB;
        margin: 20px 0;
    }
    
    blockquote {
        margin: 0 0 14px 0;
        padding: 8px 16px;
        color: #4B5563;
        background-color: #F9FAFB;
        border-left: 4px solid #D1D5DB;
        border-radius: 0 4px 4px 0;
    }
    
    /* Specific styling for the 3-column email preview table */
    table td {
        width: 33.33%;
    }
    
    table td img {
        width: 100%;
        max-width: 250px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        border: 1px solid #E5E7EB;
        border-radius: 8px;
    }
    """
    
    full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Proposal: Revenue Maximization via Personalized Newsletter</title>
    <style>
        {css}
    </style>
</head>
<body>
    {html_content}
</body>
</html>
"""
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(full_html)

async def html_to_pdf(html_path, pdf_path):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1200, 'height': 800})
        page = await context.new_page()
        
        abs_html_path = os.path.abspath(html_path)
        await page.goto(f"file://{abs_html_path}", wait_until="networkidle")
        await asyncio.sleep(1) # Extra wait time
        
        await page.pdf(
            path=pdf_path,
            format="A4",
            print_background=True,
            landscape=False, # Portrait!
            margin={'top': '15mm', 'right': '15mm', 'bottom': '15mm', 'left': '15mm'}
        )
        
        await browser.close()
        print(f"Successfully compiled to {pdf_path}")

if __name__ == '__main__':
    md_file = '../proposal.md'
    temp_html = 'temp_proposal.html'
    pdf_file = '../proposal.pdf'
    
    # Switch to script directory context
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    md_to_html(md_file, temp_html)
    asyncio.run(html_to_pdf(temp_html, pdf_file))
    if os.path.exists(temp_html):
        os.remove(temp_html)
