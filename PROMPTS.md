# What I asked the AI

Keep a short log. One entry per prompt is enough.

| What I asked (paste or summarize) | What happened | What I had to fix or check |
| --- | --- | --- |
| Update the tracker so I can pick a month and see its budget, spending, and remaining amount; filter all dashboard results to that month, keep the query parameterized, and check the SQL-input safety and `.env` exclusion. | Updated the story, added a month picker, and filtered the summary, category chart, and expense list by the selected month. | Re-commented the temporary `@monthStart` declaration before starting the app; verified matching October/November totals, a clean 400 response for an injected month, and that `.env` is ignored and untracked. |
| | | |
| | | |
