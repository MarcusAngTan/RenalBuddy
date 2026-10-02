# Stop Cursor from appearing as a GitHub contributor

GitHub lists **cursoragent** when commit messages include:

```text
Co-authored-by: Cursor <cursoragent@cursor.com>
```

Cursor adds that line automatically on commits made from the IDE.

## Fix on your machine (before the next push)

1. **Cursor Settings → Agents → Attribution** → turn off **Commit attribution**.
2. Or in `~/.cursor/cli-config.json`:

```json
{
  "attribution": {
    "attributeCommitsToAgent": false,
    "attributePRsToAgent": false
  }
}
```

3. Enable this repo’s hook (strips co-author if Cursor still adds it):

```bash
git config core.hooksPath .githooks
```

## If the repo sidebar still shows cursoragent

Commit history on `main` is already cleaned (author is only you). GitHub’s **Contributors** sidebar uses a **separate cache** and can lag after force-pushes.

- Hard-refresh the repo page or open it in a private window.
- Wait up to ~24 hours for GitHub to recompute.
- If it still shows after 24h, contact [GitHub Support](https://support.github.com/) and ask them to refresh contributor stats for `MarcusAngTan/RenalBuddy`.

The REST API `/contributors` endpoint may already show only **MarcusAngTan** while the sidebar catches up.
