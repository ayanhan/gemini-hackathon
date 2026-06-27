import re

with open('2026-05-20_recommendation_systems_in_ecommerce_why_you_buy_or_bounce.html', 'r') as f:
    html = f.read()

# 1. Non-personalized
html = re.sub(
    r'<div class="panel" style="display:grid; grid-template-columns:repeat\(3,1fr\); gap:12px;">.*?<div class="place-card".*?</div>\s*</div>\s*</div>',
    '''<div class="panel" style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; padding:12px;">
                <img src="images/japanese_menu_1778828446529.png" style="width:100%; border-radius:14px; object-fit:cover; aspect-ratio:3/4;">
                <img src="images/newspaper_homepage_1778828521650.png" style="width:100%; border-radius:14px; object-fit:cover; aspect-ratio:3/4;">
                <img src="images/proximity_map_1778828795692.png" style="width:100%; border-radius:14px; object-fit:cover; aspect-ratio:3/4;">
              </div>''',
    html, flags=re.DOTALL
)

# 2. Personalized shop
html = re.sub(
    r'<div class="triple-grid">\s*<div class="user-card">.*?</div>\s*</div>\s*</div>',
    '''<img src="images/personalized_shop_1778828937611.png" style="width:100%; border-radius:20px;">''',
    html, flags=re.DOTALL
)

# 3. Logos
html = re.sub(
    r'<div class="logo-wall">.*?</div>\s*</div>',
    '''<div class="logo-wall">
                <div class="logo-pill" style="padding:10px; display:flex; align-items:center; justify-content:center;"><img src="images/logos/amazon.svg" style="max-height:40px;"></div>
                <div class="logo-pill" style="padding:10px; display:flex; align-items:center; justify-content:center;"><img src="images/logos/meta.svg" style="max-height:40px;"></div>
                <div class="logo-pill" style="padding:10px; display:flex; align-items:center; justify-content:center;"><img src="images/logos/youtube.svg" style="max-height:40px;"></div>
                <div class="logo-pill" style="padding:10px; display:flex; align-items:center; justify-content:center;"><img src="images/logos/tiktok.svg" style="max-height:40px;"></div>
                <div class="logo-pill" style="padding:10px; display:flex; align-items:center; justify-content:center;"><img src="images/logos/netflix.svg" style="max-height:40px;"></div>
                <div class="logo-pill" style="padding:10px; display:flex; align-items:center; justify-content:center;"><img src="images/logos/spotify.svg" style="max-height:40px;"></div>
              </div>''',
    html, flags=re.DOTALL
)

# 4. Rory Sutherland
html = re.sub(
    r'<div class="author-badge">RS</div>',
    '<img class="author-badge" src="images/rory_sutherland.jpg" style="object-fit:cover; padding:0;">',
    html
)

# 5. Marmalade jars
html = re.sub(
    r'<div class="jar-grid">.*?</div>',
    '<img src="images/marmalade_jars_1778828973335.png" style="width:100%; border-radius:20px;">',
    html, flags=re.DOTALL
)

# 6. Transformers behavior board
html = re.sub(
    r'<div class="behavior-board" style="min-height:290px; box-shadow:none;">.*?</div>\s*</div>',
    '<img src="images/how_recommendation_work_right.png" alt="Behavior signal" style="width:100%; border-radius:20px; display:block;">',
    html, flags=re.DOTALL
)

# 7. Airplane tickets
html = re.sub(
    r'<div class="price-choice">.*?</div>\s*</div>\s*</div>',
    '<img src="images/airplane_tickets_1778828996687.png" style="width:100%; border-radius:20px;">',
    html, flags=re.DOTALL
)

# 8. Journey UIs (Slide 10)
# We will just replace them sequentially
images = [
    'images/feature_1_final.png',
    'images/feature_2_final.png',
    'images/feature_3_final.png',
    'images/ecommerce_dashboard_hero.png'
]
for img in images:
    html = re.sub(
        r'<div class="journey-ui">.*?</div>\s*</div>',
        f'<div style="height:114px; border-radius:20px; overflow:hidden;"><img src="{img}" style="width:100%; height:100%; object-fit:cover;"></div>',
        html, count=1, flags=re.DOTALL
    )

# 9. Slide 11: Add example_recommended_for_you.png
# It says: <div class="image-panel" style="min-height:520px;">
#               <img src="images/feature_1_final.png" alt="Homepage recommendation example">
#             </div>
html = re.sub(
    r'<div class="image-panel" style="min-height:520px;">\s*<img src="images/feature_1_final\.png" alt="Homepage recommendation example">\s*</div>',
    '''<div class="image-panel" style="min-height:520px; display:flex; flex-direction:column; gap:10px;">
              <img src="images/feature_1_final.png" alt="Homepage recommendation example" style="height:50%;">
              <img src="images/example_recommended_for_you.png" alt="Coreco Homepage recommendation" style="height:50%;">
            </div>''',
    html
)

# 10. Slide 14: Alex Hormozi quote
html = html.replace(
    '<h3>"It is easier to resell than to sell for the first time."</h3>',
    '<h3>"It is easier to resell than to sell for the first time." — Alex Hormozi</h3>'
)

# 11. Slide 15: AI Sales Agents
html = re.sub(
    r'<ul class="mini-list">\s*<li>Determines what and when to show\.</li>\s*<li>Changes how via conversational UI/UX\.</li>\s*</ul>\s*</div>\s*<div class="stack-card">\s*<h3>Where it helps</h3>\s*<ul class="mini-list">\s*<li>Complex catalogs\.</li>\s*<li>High-consideration purchases\.</li>\s*<li>Explaining tradeoffs in real time\.</li>\s*</ul>\s*</div>\s*<div class="stack-card">\s*<h3>Risk</h3>\s*<ul class="mini-list">\s*<li>Easy to prompt-inject or game\.</li>\s*<li>Slow chat UX can hurt fast shopping\.</li>\s*<li>Pricing and policy mistakes become public fast\.</li>\s*</ul>\s*</div>',
    '''<ul class="mini-list">
                <li>Determines WHAT and WHEN to show.</li>
                <li>Changes HOW: Conversational UI/UX.</li>
              </ul>
            </div>
            <div class="stack-card">
              <h3>Success & Failure</h3>
              <ul class="mini-list">
                <li>Success: Amazon Rufus (300M users, 60% higher conversion, $12B incremental sales).</li>
                <li>Fail: OpenAI (Shut down ChatGPT Plugins for product selling in early 2024).</li>
              </ul>
            </div>
            <div class="stack-card">
              <h3>Risk: High</h3>
              <ul class="mini-list">
                <li>Very easy to hack or hallucinate.</li>
                <li>E.g., Air Canada chatbot hallucinated a bereavement fare policy, airline was ordered to pay the difference.</li>
              </ul>
            </div>''',
    html, flags=re.DOTALL
)

# 12. Slide 16: AI Customers
html = re.sub(
    r'<li>AI buying agents are emerging now\.</li>\s*<li>Structured product context matters more\.</li>\s*<li>Classic recommendation tactics still help surface what should enter the window\.</li>',
    '''<li>AI buying agents are already here.</li>
                  <li>Example: Anthropic\'s "Project Vend" gave Claude control of a vending machine (pricing, inventory).</li>
                  <li>You need to put your products in their context window.</li>
                  <li>Classic recommendation tactics are still useful because they allow you to put what matters in the context window.</li>''',
    html, flags=re.DOTALL
)

# 13. Slide 17: Conclusion Marmalade
# At the very end of conclusion before <div class="metric-panel">
# Wait, metric-panel is already there:
html = re.sub(
    r'<div class="metric-panel">\s*<div class="metric">Show the 6 relevant ones\.</div>\s*<p>When you have 28 marmalades to sell, the winning move is not showing all 28\. It is showing the 6 each customer is most likely to buy\.</p>\s*</div>',
    '''<div class="metric-panel" style="flex-direction:row; gap:20px; align-items:center;">
              <div>
                <div class="metric">Show the 6 relevant ones.</div>
                <p>When you have 28 marmalades to sell, the winning move is not showing all 28. It is showing the 6 each customer is most likely to buy.</p>
              </div>
              <img src="images/marmalade_jars_1778828973335.png" style="width:40%; border-radius:20px;">
            </div>''',
    html
)

# Also adding the speaker notes using <aside class="notes">
# I'll just write a quick map for them.
speaker_notes = {
    'Slide 2': 'questions\n1. how may of you are techincal? marketing?\n2. how many of you work in an ecommerce? (if any) -> For you this presentation shows you how you can make more money. For all the others, knowledge is power: knowing how recommendation systems work will allow you to have better user experience, hopefully.',
    'Slide 4': '1. Raise your hand if you buy things online\n2. Keep your hands raised if you ended up not buying something because there were too many choices',
    'Slide 6': '1. Raise your hand if you or your company has a website, or a local physical store? \n2. Keep your hands raised if your website (or store) has 5 or more products, services, or blog posts\n\nNow the question is: How do you order these items (products, services, articles)?\n\n1. I did not know that ordering could be important, random works for me?\n2. Recency: works well for fashion (new collection), blog posts (a blog on the latest AI model hits more reads than a post about latest AI models 2 weeks ago; the same thing happened yesterday and 2 weeks ago, you are most likely to read the one that happened yesterday)\n3. Popularity: the highest number of people will like the most popular -> awesome for optimization/simplicity\n4. Use a personalized strategy = each user sees different products',
    'Slide 11': 'For the ones of you that works with clients, or have a boss. How may times you have to tell your customer/boss what they want? \nThis is the most expensive shelf space of your site',
    'Slide 12': 'Who bought a house? a good agent would show you 2 houses, one expensive similar to what you like, a second one cheaper exactly how you like it. You think, this is a deal, I save 100K USD, and I like even more\nhow many of you would buy Business in 1, then show 2  and ask the same quesion\n- Too many choices -> increases expectation and regret -> if I buy the disappointing product the cause is me, because I failed in choosing\n- Too few choices -> no comparison, can\'t make a decision',
    'Slide 14': 'When moving to a new house/apt how willing are you to spend money on renovation/furniture/house stuff immediately after moving? and after 1 year?'
}

# The easiest way is to just find the existing HTML comments and replace them with <aside class="notes">
html = html.replace(
    '<!-- Speaker notes\nquestions\n1. how may of you are techincal? marketing?\n2. how many of you work in an ecommerce? (if any) -> For you this presentation shows you how you can make more money. For all the others, knowledge is power: knowing how recommendation systems work will allow you to have better user experience, hopefully.\n -->',
    '<aside class="notes">questions\n1. how may of you are techincal? marketing?\n2. how many of you work in an ecommerce? (if any) -> For you this presentation shows you how you can make more money. For all the others, knowledge is power: knowing how recommendation systems work will allow you to have better user experience, hopefully.</aside>'
)

html = html.replace(
    '<!-- \nSpeaker notes before slide 2:\n1. Raise your hand if you buy things online\n2. Keep your hands raised if you ended up not buying something because there were too many choices\n-->',
    '<aside class="notes">1. Raise your hand if you buy things online\n2. Keep your hands raised if you ended up not buying something because there were too many choices</aside>'
)

html = html.replace(
    '<!-- \nSpeaker notes: \n1. Raise your hand if you or your company has a website, or a local physical store? \n2. Keep your hands raised if your website (or store) has 5 or more products, services, or blog posts\n\nNow the question is: How do you order these items (products, services, articles)?\n\n1. I did not know that ordering could be important, random works for me?\n2. Recency: works well for fashion (new collection), blog posts (a blog on the latest AI model hits more reads than a post about latest AI models 2 weeks ago; the same thing happened yesterday and 2 weeks ago, you are most likely to read the one that happened yesterday)\n3. Popularity: the highest number of people will like the most popular -> awesome for optimization/simplicity\n4. Use a personalized strategy = each user sees different products -->',
    '<aside class="notes">1. Raise your hand if you or your company has a website, or a local physical store? \n2. Keep your hands raised if your website (or store) has 5 or more products, services, or blog posts\n\nNow the question is: How do you order these items (products, services, articles)?\n\n1. I did not know that ordering could be important, random works for me?\n2. Recency: works well for fashion (new collection), blog posts (a blog on the latest AI model hits more reads than a post about latest AI models 2 weeks ago; the same thing happened yesterday and 2 weeks ago, you are most likely to read the one that happened yesterday)\n3. Popularity: the highest number of people will like the most popular -> awesome for optimization/simplicity\n4. Use a personalized strategy = each user sees different products</aside>'
)

html = html.replace(
    '<!-- For the ones of you that works with clients, or have a boss. How may times you have to tell your customer/boss what they want? \nThis is the most expensive shelf space of your site -->',
    '<aside class="notes">For the ones of you that works with clients, or have a boss. How may times you have to tell your customer/boss what they want? \nThis is the most expensive shelf space of your site</aside>'
)

html = html.replace(
    '<!-- Who bought a house? a good agent would show you 2 houses, one expensive similar to what you like, a second one cheaper exactly how you like it. You think, this is a deal, I save 100K USD, and I like even more -->\n        <!-- Speaker notes: how many of you would buy Business in 1, then show 2  and ask the same quesion -->\n        <!-- Speaker notes:\n- Too many choices -> increases expectation and regret -> if I buy the disappointing product the cause is me, because I failed in choosing\n- Too few choices -> no comparison, can\'t make a decision -->',
    '<aside class="notes">Who bought a house? a good agent would show you 2 houses, one expensive similar to what you like, a second one cheaper exactly how you like it. You think, this is a deal, I save 100K USD, and I like even more\n\nSpeaker notes: how many of you would buy Business in 1, then show 2  and ask the same quesion\n\nSpeaker notes:\n- Too many choices -> increases expectation and regret -> if I buy the disappointing product the cause is me, because I failed in choosing\n- Too few choices -> no comparison, can\'t make a decision</aside>'
)

html = html.replace(
    '<!-- Speaker notes:\nWhen moving to a new house/apt how willing are you to spend money on renovation/furniture/house stuff immediately after moving? and after 1 year?\n-->',
    '<aside class="notes">When moving to a new house/apt how willing are you to spend money on renovation/furniture/house stuff immediately after moving? and after 1 year?</aside>'
)

with open('2026-05-20_recommendation_systems_in_ecommerce_why_you_buy_or_bounce.html', 'w') as f:
    f.write(html)

print("Done")
