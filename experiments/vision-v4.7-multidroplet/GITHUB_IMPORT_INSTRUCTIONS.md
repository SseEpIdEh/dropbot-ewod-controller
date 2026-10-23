# Import this experiment folder into your existing GitHub repository

These files are prepared locally; they have **not** been pushed directly to your GitHub account.

## On your Mac

1. Save/download the ZIP from ChatGPT to `~/Downloads/`.
2. In Terminal, go to your repository:

   ```bash
   cd ~/ewod-ui
   git status
   git remote -v
   ```

   Confirm that `origin` points to your intended `dropbot-ewod-controller` GitHub repository.

3. Make a separate milestone branch if you do not already have one:

   ```bash
   git switch -c vision-v47-no-ITO-demo
   ```

   If Git says the branch already exists, use `git switch vision-v47-no-ITO-demo` instead.

4. Unpack the ZIP directly into `~/ewod-ui`:

   ```bash
   unzip -o ~/Downloads/ewod_v4.7_experiment_github_folder.zip -d ~/ewod-ui
   ```

5. Stage **only** this experimental record:

   ```bash
   git add experiments/vision-v4.7-multidroplet
   git status
   git diff --cached --stat
   ```

   Review the staged list. Check for private or secret data before pushing.

6. Commit and push:

   ```bash
   git commit -m "Document V4.7 multi-droplet detection without ITO glass"
   git push -u origin vision-v47-no-ITO-demo
   ```

   If you also want to preserve uncommitted code changes in this milestone, inspect `git status` first, then stage only the appropriate source files in a **separate, clearly described commit**.

7. On GitHub, choose branch `vision-v47-no-ITO-demo` and open
   `experiments/vision-v4.7-multidroplet/README.md`.

## Video playback

The `.webm` is stored as an ordinary Git file and is about 26.4 MiB (below GitHub's 100 MiB hard limit for a single ordinary Git file). GitHub might not play it in the repository preview. Select **View raw** or **Download raw file** to watch the unchanged recording on your computer.

## Optional: Add a shortcut to the repository root README

```markdown
### Experiments
- [Vision V4.7: multi-droplet detection, without ITO glass](experiments/vision-v4.7-multidroplet/README.md)
```

No repo files outside this folder are modified by the ZIP.
