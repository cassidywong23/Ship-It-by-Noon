# What I asked the AI

Keep a short log. One entry per prompt is enough.

| What I asked (paste or summarize) | What happened | What I had to fix or check |
| --- | --- | --- |
| 4a prompt: asked for `web/index.html` with an input and 3 made-up rows, plus an Express server in `server/server.js` | Built a page and server with fake data | Ran `npm start`, opened localhost:3000, and asked for changes to the look |
| Clarified the domain and user story: student spending tracker with amount, category, date, and optional note | Updated `IDEA.md` and aligned the page fields with the story | Checked that all four story inputs were present |
| Asked to use Bills, Groceries, Shopping, Eating Out, Entertainment, and Other, and add a category bar chart while keeping the existing design | Updated the category choices and added the chart | Tested that adding an expense updates the totals and chart; adjusted the category/date layout |
| 4b prompt: asked for `schema.sql`, `load.js`, `queries.sql`, an `/api` route, and the page showing real rows | Created the tables, loaded about 20 rows, and connected the page to the database | Ran `node db/load.js`, restarted the server, and fixed errors by pasting them to the agent |
| Asked to change the app so I can pick a month and see budget, spending, and remaining | Added a month picker and filtered the dashboard by month | Ran the query in VS Code, tested the injection URL, and checked `.env` is not in Source Control |
