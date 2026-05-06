# SSH Key Page Description Section — AEO & SEO Enhancement

## Goal

Add a Description section to the SSH Key Generator page (`/sshkey`) to improve search engine visibility and AI-generated answer citations. The section follows the Password page pattern: step-by-step guide + FAQ Accordion.

## Scope

- Add `Description` component to `app/[locale]/sshkey/sshkey-page.tsx`
- Add i18n keys to all 10 locale files under `sshkey.json` → `descriptions.*`
- No changes to existing functionality or component behavior

## Component Architecture

Insert `Description` component at the bottom of `SshKeyPage`, after `<NeonTabs>` and before `</Layout>`.

```
SshKeyPage
├── <span> (existing localGenerated notice)
├── <NeonTabs> (existing Generate / Inspect tabs)
└── <Description />
    ├── Step Guide (How to Generate & Deploy SSH Keys)
    │   ├── <h2> title (font-semibold text-fg-primary text-base text-pretty)
    │   └── <ol> 4 steps, each: numbered badge + title + description
    └── FAQ (Frequently Asked Questions)
        ├── <div> flex header with <CircleHelp> icon + <h2> title
        └── <Accordion> 4 items, each: Q (button) + A (panel body)
```

### Styling (exact match with Password page)

- Outer container: `<section id="description" className="mt-8">`
- Steps title: `<h2 className="font-semibold text-fg-primary text-base text-pretty">`
- Step number badge: `w-6 h-6 rounded-full bg-accent-cyan text-bg-base text-xs font-bold flex items-center justify-center`
- Step title: `font-medium text-fg-primary text-sm`
- Step description: `text-fg-secondary text-sm leading-relaxed text-pretty`
- FAQ title wrapper: `<div className="flex items-center gap-2 mb-4">`
- FAQ icon: `<CircleHelp size={16} className="text-accent-cyan shrink-0" />`
- FAQ title: `<h2 className="font-semibold text-fg-primary text-base text-pretty">`
- FAQ answers: wrapped in `<p>` inside Accordion panel

## Step Guide Content

4 steps covering the "generate + deploy" workflow:

| Step | Title                | Description                                                                                          |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| 1    | Choose Your Key Type | Select Ed25519 (recommended — more secure, faster) or RSA (broader compatibility), set key size      |
| 2    | Generate Key Pair    | Click generate; keys are created in-browser via Web Crypto API, private key never leaves your device |
| 3    | Copy Public Key      | Copy the public key content, ready to add to target servers or platforms                             |
| 4    | Deploy to Server     | Use `ssh-copy-id` or manually append to `~/.ssh/authorized_keys`                                     |

**SEO keywords covered**: generate SSH key, SSH key pair, Ed25519 vs RSA, ssh-copy-id, authorized_keys, public key deployment

## FAQ Content

4 FAQ entries targeting high-frequency search queries:

| #   | Question                                        | Answer Summary                                                                                                                                                             |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ed25519 vs RSA: Which should I use?             | Ed25519 is more secure (128-bit security level), has shorter keys, generates faster. RSA 4096 for legacy system compatibility. Most modern services recommend Ed25519.     |
| 2   | Do I need a passphrase?                         | Not required but strongly recommended. A passphrase protects the private key if your device is compromised.                                                                |
| 3   | How do I add my SSH key to GitHub?              | Settings → SSH and GPG keys → New SSH key, paste public key content. Or use `gh ssh-key add` in CLI.                                                                       |
| 4   | Is it safe to generate SSH keys in the browser? | Safe. Uses Web Crypto API (same cryptographic standards as OpenSSL). Keys are generated in browser memory and never sent to any server. Data is lost when the page closes. |

**AEO coverage**: These FAQs directly map to Google "People Also Ask" questions about SSH keys. Accordion format is optimal for featured snippet extraction.

## i18n Keys

All keys live in `public/locales/{locale}/sshkey.json` under the `descriptions` namespace:

```
descriptions.stepsTitle
descriptions.step1Title / descriptions.step1Desc
descriptions.step2Title / descriptions.step2Desc
descriptions.step3Title / descriptions.step3Desc
descriptions.step4Title / descriptions.step4Desc
descriptions.faqTitle
descriptions.faq1Q / descriptions.faq1A
descriptions.faq2Q / descriptions.faq2A
descriptions.faq3Q / descriptions.faq3A
descriptions.faq4Q / descriptions.faq4A
```

Total: 16 new i18n keys × 10 locales = 160 translation entries.

## Files to Modify

| File                                                               | Change                                                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `app/[locale]/sshkey/sshkey-page.tsx`                              | Add `Description` component; import `Accordion` from `../../../components/ui/accordion`; import `CircleHelp` from `lucide-react` |
| `public/locales/en/sshkey.json`                                    | Add `descriptions.*` keys (source of truth)                                                                                      |
| `public/locales/{zh-CN,zh-TW,ja,ko,es,pt-BR,fr,de,ru}/sshkey.json` | Add translated `descriptions.*` keys                                                                                             |

## Out of Scope

- No changes to `<Layout>`, `<NeonTabs>`, `GeneratePanel`, or `InspectPanel`
- No new shared components or libraries
- No changes to `libs/sshkey/` logic
- No changes to `tools.json` titles or descriptions

## Component Code Reference

`Description` component follows Password page's exact pattern (see `app/[locale]/password/password-page.tsx:830-871`):

```tsx
function Description() {
  const t = useTranslations("sshkey");
  const steps = [1, 2, 3, 4].map((i) => ({
    title: t(`descriptions.step${i}Title`),
    desc: t(`descriptions.step${i}Desc`),
  }));
  const faqItems = [1, 2, 3, 4].map((i) => ({
    title: t(`descriptions.faq${i}Q`),
    content: <p>{t(`descriptions.faq${i}A`)}</p>,
  }));
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base text-pretty">
          {t("descriptions.stepsTitle")}
        </h2>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent-cyan text-bg-base text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <span className="font-medium text-fg-primary text-sm">{step.title}</span>
              <p className="text-fg-secondary text-sm leading-relaxed text-pretty">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <CircleHelp size={16} className="text-accent-cyan shrink-0" aria-hidden="true" />
          <h2 className="font-semibold text-fg-primary text-base text-pretty">
            {t("descriptions.faqTitle")}
          </h2>
        </div>
        <Accordion items={faqItems} />
      </div>
    </section>
  );
}
```
