# Password Page AEO Content Design

## Goal

Add structured educational content to the Password Generator page to improve AEO (Answer Engine Optimization) citation probability. The content targets AI search engines (ChatGPT, Perplexity, Gemini) by providing authoritative, quotable answers to common password-related questions.

## Scope

- Content focuses exclusively on password generation and strength checking — the tool's current capabilities
- Does NOT cover password managers, MFA, or breach checking
- Page placement: bottom of page, after the SavedPasswords component
- Existing `securityTip` and `strengthInfoDesc` banners remain unchanged

## Architecture

### New Component: `Description`

A single `Description` function component in `password-page.tsx`, wrapped in `<section id="description" className="mt-8">` for consistency with other tool pages. Contains three visual sections:

```
┌─────────────────────────────────────┐
│  Steps: How to Create a Strong      │
│  Password (ordered list)            │
├─────────────────────────────────────┤
│  Knowledge: h2 + p paragraphs       │
│  (4 topics)                         │
├─────────────────────────────────────┤
│  FAQ: Accordion (5 questions)       │
└─────────────────────────────────────┘
```

### Component Hierarchy

```
PasswordPage
├── securityTip banner (existing)
├── NeonTabs (Generator / Checker) (existing)
├── securityTip + strengthInfoDesc (existing)
├── SavedPasswords (existing)
└── Description (NEW)
    ├── StepsSection
    ├── KnowledgeSection
    └── FAQSection (Accordion)
```

### Imports

- `Accordion` from `../../../components/ui/accordion` (existing component)
- No new dependencies

## Content Design

### Section 1: Steps — "How to Create a Strong Password"

Ordered list with 5 steps. Each step has a title and one-line explanation.

Visual: `ol` with custom `accent-cyan` circle numbers, `text-fg-secondary text-sm`.

| Step | Title                       | Explanation                                                                          |
| ---- | --------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Choose your password length | Select at least 16 characters. Longer passwords are exponentially harder to crack.   |
| 2    | Enable all character types  | Combine uppercase, lowercase, numbers, and symbols to maximize entropy.              |
| 3    | Avoid ambiguous characters  | Enable "Avoid Ambiguous" to exclude easily confused characters like 0/O and 1/l/I.   |
| 4    | Check password strength     | Use the Strength Checker tab to verify your password resists common attack patterns. |
| 5    | Use unique passwords        | Never reuse passwords across different services.                                     |

### Section 2: Knowledge — Educational Paragraphs

4 topics, each as `h2` (font-semibold text-fg-primary text-base) + `p` (text-fg-secondary text-sm mt-1 leading-relaxed).

| #   | Title                               | Content                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | What Makes a Password Strong?       | Password strength comes from entropy — the total number of possible combinations. A password's entropy depends on two factors: character set size and length. A 16-character password using all 95 printable ASCII characters has 95^16 (about 10^31) possible combinations, making brute-force attacks infeasible.                     |
| 2   | Random vs. Memorable Passwords      | Random passwords maximize entropy per character but are hard to remember. Memorable passwords use multiple dictionary words (diceware style) — longer but readable. Both approaches can achieve high security when the total entropy is sufficient. For example, 4-5 random words can match a 12-character random password in strength. |
| 3   | How Password Strength Is Calculated | This tool uses zxcvbn, a password strength estimator that goes beyond simple entropy calculation. It detects common patterns like dictionary words, keyboard sequences (qwerty), repeated characters (aaa), dates, and personal information. This gives a more realistic crack-time estimate than just counting character types.        |
| 4   | Why Avoid Personal Information      | Passwords containing birthdays, names, pet names, or other personal details are far less secure. Attackers can easily find this information on social media and use it in targeted attacks. Always use randomly generated passwords instead.                                                                                            |

### Section 3: FAQ — Accordion

5 questions using the existing `Accordion` component. Each item has:

- `title`: the question text (rendered as Accordion header)
- `content`: the answer paragraph

| #   | Question                                                       | Answer                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | What is a good password length?                                | For strong security, use at least 16 characters. 12 characters is the minimum acceptable length. Passwords under 8 characters can be cracked in seconds regardless of character variety.                                                                                |
| 2   | Are online password generators safe?                           | This generator runs entirely in your browser using crypto.getRandomValues(), a cryptographically secure random number generator. No data is sent to any server. Your passwords are never transmitted over the internet.                                                 |
| 3   | What characters should a strong password contain?              | A strong password should include uppercase letters (A-Z), lowercase letters (a-z), numbers (0-9), and symbols (!@#$% etc.). Using all four types creates a character set of ~95 characters, maximizing entropy per character.                                           |
| 4   | How long does it take to crack a password?                     | It depends on length and complexity: an 8-character lowercase-only password can be cracked in seconds. A 12-character password with all character types takes years. A 16+ character password with all types is effectively uncrackable with current technology.        |
| 5   | What is the difference between random and memorable passwords? | Random passwords use a mix of all character types for maximum entropy per character. Memorable passwords combine dictionary words (like "correct-horse-battery-staple") for easier recall. Both are secure when long enough — the key is total entropy, not the format. |

## i18n Keys

All new content goes into `public/locales/{locale}/password.json` under these namespaces:

```
descriptions.stepsTitle          — Section heading: "How to Create a Strong Password"
descriptions.step1Title          — Step title
descriptions.step1Desc           — Step explanation
... (step2-step5)

descriptions.whatIsStrongTitle   — Knowledge heading
descriptions.whatIsStrong        — Knowledge paragraph
descriptions.randomVsMemTitle    — ...
descriptions.randomVsMem
descriptions.strengthCalcTitle
descriptions.strengthCalc
descriptions.avoidPersonalTitle
descriptions.avoidPersonal

descriptions.faqTitle            — Section heading: "Frequently Asked Questions"
descriptions.faq1Q               — FAQ question 1
descriptions.faq1A               — FAQ answer 1
descriptions.faq2Q / descriptions.faq2A
descriptions.faq3Q / descriptions.faq3A
descriptions.faq4Q / descriptions.faq4A
descriptions.faq5Q / descriptions.faq5A
```

### Translation Strategy

- English (`en`) is the source of truth, written first
- All 10 locales get full translations
- CJK locales use native technical terminology
- Latin-script locales use standard developer terminology for that language

## UI Styling

- Outer wrapper: `<section id="description" className="mt-8">`
- Section headings: `h2` with `font-semibold text-fg-primary text-base`
- Body text: `text-fg-secondary text-sm leading-relaxed`
- Steps: `ol` with custom numbered circles (accent-cyan background, white text)
- FAQ: existing `Accordion` component (border, disclosure, chevron)
- Sections separated by `mt-8`
- No new CSS classes needed — all via Tailwind utilities

### Accordion Data Construction

```tsx
const faqItems = [1, 2, 3, 4, 5].map((i) => ({
  title: t(`descriptions.faq${i}Q`),
  content: <p>{t(`descriptions.faq${i}A`)}</p>,
}));
```

## Files Modified

| File                                      | Change                                                     |
| ----------------------------------------- | ---------------------------------------------------------- |
| `app/[locale]/password/password-page.tsx` | Add `Description` component, render after `SavedPasswords` |
| `public/locales/en/password.json`         | Add all `descriptions.*` and `faq.*` keys                  |
| `public/locales/zh-CN/password.json`      | Chinese translations                                       |
| `public/locales/zh-TW/password.json`      | Traditional Chinese translations                           |
| `public/locales/ja/password.json`         | Japanese translations                                      |
| `public/locales/ko/password.json`         | Korean translations                                        |
| `public/locales/es/password.json`         | Spanish translations                                       |
| `public/locales/pt-BR/password.json`      | Portuguese (BR) translations                               |
| `public/locales/fr/password.json`         | French translations                                        |
| `public/locales/de/password.json`         | German translations                                        |
| `public/locales/ru/password.json`         | Russian translations                                       |

## Out of Scope

- Schema.org FAQ structured data (recommended follow-up — `FAQPage` schema directly improves AEO citation probability for FAQ content)
- Changes to password generation logic
- Changes to existing UI elements
- Password manager, MFA, or breach-check content
