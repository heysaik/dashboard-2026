# Repository protections

The live GitHub rules are mirrored in [`.github/rulesets`](../.github/rulesets/). Editing these JSON files does not apply settings automatically; an administrator must review the changes and update the corresponding GitHub ruleset.

## Main branch

The **Protect main history** ruleset blocks deletion, non-fast-forward pushes, and merge commits. It has no bypass actors, including the owner. Conventional Commit subjects and PR titles are validated by the required **Contribution policy** check; the local commit-message hook also checks subjects before committing.

The **Review and checks for main** ruleset requires:

- A pull request with one approving code-owner review. [`CODEOWNERS`](../.github/CODEOWNERS) assigns review to `@heysaik`.
- Dismissal of stale approvals after code changes, approval of the latest push by another person, and resolution of review conversations.
- Verified commit signatures.
- Passing **Contribution policy**, **JavaScript tests**, and **macOS build, native tests, and secrets** checks from the GitHub Actions integration. The branch must be tested against current `main`.

Only `@heysaik` has an explicit, audited bypass for this second ruleset, preserving authorized owner maintenance and direct pushes. That bypass does not permit rewriting/deleting `main` or replacing/deleting published version tags. It does permit the owner to push without a PR, required checks, or GitHub-verified signatures; normal contributions remain gated. Repository administrators can change repository settings, so these rules do not prevent a deliberate administrative policy change.

## Merging and release tags

Squash merging is the only enabled PR merge method. The squash commit uses the PR title, which CI validates. Merged feature branches are deleted automatically. Auto-merge is disabled.

The **Protect published release tags** ruleset blocks updates and deletion of `v*` tags without a bypass. New versions can be created normally. Publish a new version to correct a release instead of moving its existing tag.

## Automation and secrets

Workflows have read-only default token permissions and cannot approve pull requests. External contributors' fork workflows require maintainer approval. Only GitHub-owned actions are allowed, and actions must be pinned to a full commit SHA. No live AI account or signing credential is provided to CI.

GitHub secret scanning and push protection are enabled, and Gitleaks scans history in CI. Local hooks add staged secret/whitespace checks, commit-message validation, tests before push, and protected-ref checks. Local hooks require `./scripts/setup-contributor.sh` in each clone and can be skipped with Git's local bypass options; the GitHub rules remain independent of those hooks.

The owner's local checkout also sets `dashboard.expectedEmail` to the personal commit email, which the pre-commit hook checks for both author and committer, and enables SSH commit signing with a dedicated personal key stored outside the repository. Contributors keep their own Git identities and signing keys; the setup script does not replace them.

## Changing the policy

Keep required check names synchronized between the workflow and ruleset. Use GitHub **Settings → Rules → Rulesets** to review the live rules and **Settings → Actions → General** for automation permissions. After changing settings, verify them through GitHub's API; a committed JSON file alone is not evidence of enforcement.
