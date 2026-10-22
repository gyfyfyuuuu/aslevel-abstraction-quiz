# Algorithm Challenge — Chapter 9

A static, mobile-friendly practice quiz for Cambridge International AS & A Level Computer Science. It runs on GitHub Pages with no account, database, API key, build step, or backend.

## Play the quiz

Open the published page at:

<https://gyfyfyuuuu.github.io/aslevel-abstraction-quiz/chapter9/>

Choose Beginner, Intermediate, or Expert. Each has its own 10 questions, timer, score, and saved progress. All three levels are available immediately. Correct answers earn 10, 20, or 30 points according to difficulty; incorrect answers and timeouts earn zero. On completion, the page shows the run score and personal best for that level.

Progress is saved in the browser's `localStorage` on the current device. It does not sync across browsers or devices. Use **Clear progress** in the page header to erase local scores after confirmation. Clearing site data in the browser also erases progress.

## Run locally

From this folder, start a simple web server:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000/>. Serving over HTTP avoids browser restrictions on local files and uses the same relative asset paths as GitHub Pages.

## Project files

- `index.html` — page entry point and relative script/style links.
- `css/styles.css` — responsive visual theme and layouts.
- `js/app.js` — level selection, quiz interaction, timing, scoring, and local progress.
- `data/questions.js` — the exact 30 supplied questions and options.
- `data/answers.js` — answer key used to grade practice responses.

The answer key is delivered to the browser, so students can inspect it with developer tools. This is appropriate for self-study, not proctored or high-stakes exams. No student account information is collected, and there is no online leaderboard.

## Change questions

Edit question text and choices in `data/questions.js`. Keep IDs unique and update the corresponding letter in `data/answers.js`. Each question ID must have exactly one answer key. The original wording and answer choices supplied for this challenge are included; no explanations were provided.

## GitHub Pages

The repository's existing root quiz remains separate. This challenge is served from the `chapter9/` folder. In the repository, open **Settings → Pages**, select **Deploy from a branch**, choose the default branch and `/ (root)`, then save. GitHub Pages serves `chapter9/index.html` at `/aslevel-abstraction-quiz/chapter9/`. The site is ready once the deployment appears in Pages settings and the URL above loads successfully.

## Verify changes

1. Open the page and start each of the three levels.
2. Select an option and submit it. Confirm correct answers increase the run score by the level's points and incorrect answers earn zero.
3. Let a question time out and confirm it advances with zero points.
4. Refresh during a question and confirm the question and score remain; the timer restarts at the full level limit.
5. Complete a level, return to level selection, and confirm its best score is shown. Start it again and confirm the best is kept while a new run starts at zero.
6. Use **Clear progress**, confirm the prompt, and verify the level scores reset.
7. Open browser developer tools at a mobile viewport and check there is no horizontal scrolling.

No backend setup is required. Scores are stored only in the browser and can be edited by the browser user; this version is a practice tool rather than a secure competition system.

