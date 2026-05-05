# Password Page AEO Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Description` component with Steps, Knowledge, and FAQ sections to the Password Generator page for AEO (Answer Engine Optimization).

**Architecture:** A single `Description` function component added to `password-page.tsx`, rendering after `SavedPasswords`. Content is fully i18n'd via `public/locales/{locale}/password.json` using the `descriptions.*` namespace. FAQ uses the existing `Accordion` component.

**Tech Stack:** React, next-intl, Tailwind CSS, existing `Accordion` component from `@headlessui/react`

**Spec:** `docs/superpowers/specs/2026-05-05-password-aeo-content-design.md`

---

## File Map

| Action | File                                      | Responsibility                                |
| ------ | ----------------------------------------- | --------------------------------------------- |
| Modify | `public/locales/en/password.json`         | English source of truth for all new i18n keys |
| Modify | `public/locales/zh-CN/password.json`      | Simplified Chinese translations               |
| Modify | `public/locales/zh-TW/password.json`      | Traditional Chinese translations              |
| Modify | `public/locales/ja/password.json`         | Japanese translations                         |
| Modify | `public/locales/ko/password.json`         | Korean translations                           |
| Modify | `public/locales/es/password.json`         | Spanish translations                          |
| Modify | `public/locales/pt-BR/password.json`      | Portuguese (BR) translations                  |
| Modify | `public/locales/fr/password.json`         | French translations                           |
| Modify | `public/locales/de/password.json`         | German translations                           |
| Modify | `public/locales/ru/password.json`         | Russian translations                          |
| Modify | `app/[locale]/password/password-page.tsx` | Add `Description` component + render it       |

---

### Task 1: English i18n keys

**Files:**

- Modify: `public/locales/en/password.json`

- [ ] **Step 1: Add all `descriptions.*` keys to the English locale file**

Open `public/locales/en/password.json` and add the following keys after the last existing key (before the closing `}`). Add a comma after the last existing key `"zxcvbnSuggestionPwned"` value line.

```json
  "descriptions.stepsTitle": "How to Create a Strong Password",
  "descriptions.step1Title": "Choose your password length",
  "descriptions.step1Desc": "Select at least 16 characters. Longer passwords are exponentially harder to crack.",
  "descriptions.step2Title": "Enable all character types",
  "descriptions.step2Desc": "Combine uppercase, lowercase, numbers, and symbols to maximize entropy.",
  "descriptions.step3Title": "Avoid ambiguous characters",
  "descriptions.step3Desc": "Enable \"Avoid Ambiguous\" to exclude easily confused characters like 0/O and 1/l/I.",
  "descriptions.step4Title": "Check password strength",
  "descriptions.step4Desc": "Use the Strength Checker tab to verify your password resists common attack patterns.",
  "descriptions.step5Title": "Use unique passwords",
  "descriptions.step5Desc": "Never reuse passwords across different services.",
  "descriptions.whatIsStrongTitle": "What Makes a Password Strong?",
  "descriptions.whatIsStrong": "Password strength comes from entropy — the total number of possible combinations. A password's entropy depends on two factors: character set size and length. A 16-character password using all 95 printable ASCII characters has 95¹⁶ (about 10³¹) possible combinations, making brute-force attacks infeasible.",
  "descriptions.randomVsMemTitle": "Random vs. Memorable Passwords",
  "descriptions.randomVsMem": "Random passwords maximize entropy per character but are hard to remember. Memorable passwords use multiple dictionary words (diceware style) — longer but readable. Both approaches can achieve high security when the total entropy is sufficient. For example, 4-5 random words can match a 12-character random password in strength.",
  "descriptions.strengthCalcTitle": "How Password Strength Is Calculated",
  "descriptions.strengthCalc": "This tool uses zxcvbn, a password strength estimator that goes beyond simple entropy calculation. It detects common patterns like dictionary words, keyboard sequences (qwerty), repeated characters (aaa), dates, and personal information. This gives a more realistic crack-time estimate than just counting character types.",
  "descriptions.avoidPersonalTitle": "Why Avoid Personal Information",
  "descriptions.avoidPersonal": "Passwords containing birthdays, names, pet names, or other personal details are far less secure. Attackers can easily find this information on social media and use it in targeted attacks. Always use randomly generated passwords instead.",
  "descriptions.faqTitle": "Frequently Asked Questions",
  "descriptions.faq1Q": "What is a good password length?",
  "descriptions.faq1A": "For strong security, use at least 16 characters. 12 characters is the minimum acceptable length. Passwords under 8 characters can be cracked in seconds regardless of character variety.",
  "descriptions.faq2Q": "Are online password generators safe?",
  "descriptions.faq2A": "This generator runs entirely in your browser using crypto.getRandomValues(), a cryptographically secure random number generator. No data is sent to any server. Your passwords are never transmitted over the internet.",
  "descriptions.faq3Q": "What characters should a strong password contain?",
  "descriptions.faq3A": "A strong password should include uppercase letters (A-Z), lowercase letters (a-z), numbers (0-9), and symbols (!@#$% etc.). Using all four types creates a character set of ~95 characters, maximizing entropy per character.",
  "descriptions.faq4Q": "How long does it take to crack a password?",
  "descriptions.faq4A": "It depends on length and complexity: an 8-character lowercase-only password can be cracked in seconds. A 12-character password with all character types takes years. A 16+ character password with all types is effectively uncrackable with current technology.",
  "descriptions.faq5Q": "What is the difference between random and memorable passwords?",
  "descriptions.faq5A": "Random passwords use a mix of all character types for maximum entropy per character. Memorable passwords combine dictionary words (like \"correct-horse-battery-staple\") for easier recall. Both are secure when long enough — the key is total entropy, not the format."
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/locales/en/password.json','utf8')); console.log('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add public/locales/en/password.json
git commit -m "feat(password): add English AEO description i18n keys"
```

---

### Task 2: CJK translations (zh-CN, zh-TW, ja, ko)

**Files:**

- Modify: `public/locales/zh-CN/password.json`
- Modify: `public/locales/zh-TW/password.json`
- Modify: `public/locales/ja/password.json`
- Modify: `public/locales/ko/password.json`

- [ ] **Step 1: Add translations to zh-CN**

Append the following keys to `public/locales/zh-CN/password.json` after the last existing key:

```json
  "descriptions.stepsTitle": "如何创建一个强密码",
  "descriptions.step1Title": "选择密码长度",
  "descriptions.step1Desc": "至少选择 16 个字符。密码越长，破解难度呈指数级增长。",
  "descriptions.step2Title": "启用所有字符类型",
  "descriptions.step2Desc": "组合大写字母、小写字母、数字和符号，以最大化信息熵。",
  "descriptions.step3Title": "避免易混淆字符",
  "descriptions.step3Desc": "启用「避免易混淆字符」选项，排除 0/O、1/l/I 等容易混淆的字符。",
  "descriptions.step4Title": "检查密码强度",
  "descriptions.step4Desc": "使用「强度检查器」标签页，验证你的密码能否抵御常见的攻击模式。",
  "descriptions.step5Title": "使用独立密码",
  "descriptions.step5Desc": "不要在不同的服务中重复使用相同的密码。",
  "descriptions.whatIsStrongTitle": "什么决定了密码强度？",
  "descriptions.whatIsStrong": "密码强度取决于信息熵——即所有可能的组合总数。信息熵由两个因素决定：字符集大小和密码长度。一个使用全部 95 个可打印 ASCII 字符的 16 位密码有 95¹⁶（约 10³¹）种可能组合，暴力破解在实际中不可行。",
  "descriptions.randomVsMemTitle": "随机密码与易记密码",
  "descriptions.randomVsMem": "随机密码能最大化每个字符的信息熵，但难以记忆。易记密码使用多个字典词汇（类似掷骰子法），虽然更长但更易读。只要总信息熵足够，两种方式都能实现高安全性。例如，4-5 个随机词汇的强度可以匹敌 12 位随机密码。",
  "descriptions.strengthCalcTitle": "密码强度是如何计算的",
  "descriptions.strengthCalc": "本工具使用 zxcvbn 密码强度评估器，它超越了简单的信息熵计算。它能检测字典词汇、键盘序列（qwerty）、重复字符（aaa）、日期和个人信息等常见模式，从而给出比单纯计算字符类型更真实的破解时间估算。",
  "descriptions.avoidPersonalTitle": "为什么要避免个人信息",
  "descriptions.avoidPersonal": "包含生日、姓名、宠物名或其他个人细节的密码远不够安全。攻击者可以轻松从社交媒体获取这些信息，并将其用于定向攻击。请始终使用随机生成的密码。",
  "descriptions.faqTitle": "常见问题",
  "descriptions.faq1Q": "密码多长才算安全？",
  "descriptions.faq1A": "为了高安全性，建议使用至少 16 个字符。12 个字符是最低可接受长度。8 个字符以下的密码无论字符种类如何，都可以在几秒内被破解。",
  "descriptions.faq2Q": "在线密码生成器安全吗？",
  "descriptions.faq2A": "本生成器完全在浏览器中运行，使用 crypto.getRandomValues() 加密安全随机数生成器。不向任何服务器发送数据，你的密码永远不会通过互联网传输。",
  "descriptions.faq3Q": "强密码应该包含哪些字符？",
  "descriptions.faq3A": "强密码应包含大写字母（A-Z）、小写字母（a-z）、数字（0-9）和符号（!@#$% 等）。使用全部四种类型可创建约 95 个字符的字符集，最大化每个字符的信息熵。",
  "descriptions.faq4Q": "破解一个密码需要多长时间？",
  "descriptions.faq4A": "取决于长度和复杂度：8 位纯小写密码可在几秒内破解。12 位全字符类型密码需要数年。16 位以上全字符类型密码在当前技术下实际上无法破解。",
  "descriptions.faq5Q": "随机密码和易记密码有什么区别？",
  "descriptions.faq5A": "随机密码混合使用所有字符类型，最大化每个字符的信息熵。易记密码组合字典词汇（如 \"correct-horse-battery-staple\"），便于记忆。只要长度足够，两者都很安全——关键在于总信息熵，而非格式。"
```

- [ ] **Step 2: Add translations to zh-TW**

Append the following keys to `public/locales/zh-TW/password.json`:

```json
  "descriptions.stepsTitle": "如何建立一個強密碼",
  "descriptions.step1Title": "選擇密碼長度",
  "descriptions.step1Desc": "至少選擇 16 個字元。密碼越長，破解難度呈指數級增長。",
  "descriptions.step2Title": "啟用所有字元類型",
  "descriptions.step2Desc": "組合大寫字母、小寫字母、數字和符號，以最大化資訊熵。",
  "descriptions.step3Title": "避免易混淆字元",
  "descriptions.step3Desc": "啟用「避免易混淆字元」選項，排除 0/O、1/l/I 等容易混淆的字元。",
  "descriptions.step4Title": "檢查密碼強度",
  "descriptions.step4Desc": "使用「強度檢查器」分頁，驗證你的密碼能否抵禦常見的攻擊模式。",
  "descriptions.step5Title": "使用獨立密碼",
  "descriptions.step5Desc": "不要在不同的服務中重複使用相同的密碼。",
  "descriptions.whatIsStrongTitle": "什麼決定了密碼強度？",
  "descriptions.whatIsStrong": "密碼強度取決於資訊熵——即所有可能的組合總數。資訊熵由兩個因素決定：字元集大小和密碼長度。一個使用全部 95 個可列印 ASCII 字元的 16 位密碼有 95¹⁶（約 10³¹）種可能組合，暴力破解在實際中不可行。",
  "descriptions.randomVsMemTitle": "隨機密碼與易記密碼",
  "descriptions.randomVsMem": "隨機密碼能最大化每個字元的資訊熵，但難以記憶。易記密碼使用多個字典詞彙（類似擲骰子法），雖然更長但更易讀。只要總資訊熵足夠，兩種方式都能實現高安全性。例如，4-5 個隨機詞彙的強度可以匹敵 12 位隨機密碼。",
  "descriptions.strengthCalcTitle": "密碼強度是如何計算的",
  "descriptions.strengthCalc": "本工具使用 zxcvbn 密碼強度評估器，它超越了簡單的資訊熵計算。它能偵測字典詞彙、鍵盤序列（qwerty）、重複字元（aaa）、日期和個人資訊等常見模式，從而給出比單純計算字元類型更真實的破解時間估算。",
  "descriptions.avoidPersonalTitle": "為什麼要避免個人資訊",
  "descriptions.avoidPersonal": "包含生日、姓名、寵物名或其他個人細節的密碼遠不夠安全。攻擊者可以輕鬆從社群媒體取得這些資訊，並將其用於定向攻擊。請始終使用隨機產生的密碼。",
  "descriptions.faqTitle": "常見問題",
  "descriptions.faq1Q": "密碼多長才算安全？",
  "descriptions.faq1A": "為了高安全性，建議使用至少 16 個字元。12 個字元是最低可接受長度。8 個字元以下的密碼無論字元種類如何，都可以在幾秒內被破解。",
  "descriptions.faq2Q": "線上密碼產生器安全嗎？",
  "descriptions.faq2A": "本產生器完全在瀏覽器中執行，使用 crypto.getRandomValues() 加密安全隨機數產生器。不向任何伺服器傳送資料，你的密碼永遠不會透過網際網路傳輸。",
  "descriptions.faq3Q": "強密碼應該包含哪些字元？",
  "descriptions.faq3A": "強密碼應包含大寫字母（A-Z）、小寫字母（a-z）、數字（0-9）和符號（!@#$% 等）。使用全部四種類型可建立約 95 個字元的字元集，最大化每個字元的資訊熵。",
  "descriptions.faq4Q": "破解一個密碼需要多長時間？",
  "descriptions.faq4A": "取決於長度和複雜度：8 位純小寫密碼可在幾秒內破解。12 位全字元類型密碼需要數年。16 位以上全字元類型密碼在目前技術下實際上無法破解。",
  "descriptions.faq5Q": "隨機密碼和易記密碼有什麼區別？",
  "descriptions.faq5A": "隨機密碼混合使用所有字元類型，最大化每個字元的資訊熵。易記密碼組合字典詞彙（如 \"correct-horse-battery-staple\"），便於記憶。只要長度足夠，兩者都很安全——關鍵在於總資訊熵，而非格式。"
```

- [ ] **Step 3: Add translations to ja**

Append the following keys to `public/locales/ja/password.json`:

```json
  "descriptions.stepsTitle": "強力なパスワードの作り方",
  "descriptions.step1Title": "パスワードの長さを選ぶ",
  "descriptions.step1Desc": "16文字以上を選択してください。パスワードが長いほど、破解難易度は指数関数的に上がります。",
  "descriptions.step2Title": "すべての文字種を有効にする",
  "descriptions.step2Desc": "大文字、小文字、数字、記号を組み合わせてエントロピーを最大化します。",
  "descriptions.step3Title": "紛らわしい文字を避ける",
  "descriptions.step3Desc": "「紛らわしい文字を避ける」を有効にして、0/O や 1/l/I などの混同しやすい文字を除外します。",
  "descriptions.step4Title": "パスワード強度を確認する",
  "descriptions.step4Desc": "「強度チェッカー」タブで、パスワードが一般的な攻撃パターンに耐性があるか確認します。",
  "descriptions.step5Title": "パスワードを使い回さない",
  "descriptions.step5Desc": "異なるサービスで同じパスワードを再利用しないでください。",
  "descriptions.whatIsStrongTitle": "パスワードの強度を決めるものは？",
  "descriptions.whatIsStrong": "パスワードの強度はエントロピー—可能な組み合わせの総数—によって決まります。エントロピーは文字セットのサイズと長さの2つの要素に依存します。95種類の印刷可能ASCII文字すべてを使った16文字のパスワードは 95¹⁶（約 10³¹）通りの組み合わせがあり、ブルートフォース攻撃は事実上不可能です。",
  "descriptions.randomVsMemTitle": "ランダムパスワードと覚えやすいパスワード",
  "descriptions.randomVsMem": "ランダムパスワードは文字あたりのエントロピーを最大化しますが、覚えるのが困難です。覚えやすいパスワードは複数の辞書語（ダイスウェア方式）を使用し、長いが読みやすいものです。総エントロピーが十分であれば、どちらのアプローチでも高いセキュリティを実現できます。例えば、4〜5つのランダムな単語は12文字のランダムパスワードと同等の強度を持てます。",
  "descriptions.strengthCalcTitle": "パスワード強度の計算方法",
  "descriptions.strengthCalc": "このツールは zxcvbn パスワード強度推定器を使用しています。単純なエントロピー計算を超えて、辞書語、キーボードシーケンス（qwerty）、繰り返し文字（aaa）、日付、個人情報などの一般的なパターンを検出します。これにより、文字種を数えるだけでは得られない、より現実的な破解時間の推定が可能です。",
  "descriptions.avoidPersonalTitle": "個人情報を避けるべき理由",
  "descriptions.avoidPersonal": "誕生日、名前、ペットの名前、その他の個人情報を含むパスワードは安全性が大幅に低下します。攻撃者はソーシャルメディアからこれらの情報を簡単に見つけ、標的型攻撃に利用できます。常にランダムに生成されたパスワードを使用してください。",
  "descriptions.faqTitle": "よくある質問",
  "descriptions.faq1Q": "パスワードの長さはどれくらいが適切ですか？",
  "descriptions.faq1A": "高いセキュリティのため、16文字以上を使用してください。12文字が最低限の許容長です。8文字未満のパスワードは、文字種を問わず数秒で破解されます。",
  "descriptions.faq2Q": "オンラインパスワードジェネレーターは安全ですか？",
  "descriptions.faq2A": "このジェネレーターはブラウザ上で完全に動作し、crypto.getRandomValues() という暗号論的に安全な乱数生成器を使用しています。サーバーにデータを送信しません。パスワードがインターネット経由で送信されることはありません。",
  "descriptions.faq3Q": "強力なパスワードにはどんな文字を含めるべきですか？",
  "descriptions.faq3A": "強力なパスワードには大文字（A-Z）、小文字（a-z）、数字（0-9）、記号（!@#$% など）を含めるべきです。4種類すべてを使用すると約95文字の文字セットが作成され、文字あたりのエントロピーが最大化されます。",
  "descriptions.faq4Q": "パスワードの破解にどれくらい時間がかかりますか？",
  "descriptions.faq4A": "長さと複雑さによります。8文字の小文字のみのパスワードは数秒で破解されます。すべての文字種を使った12文字のパスワードは数年かかります。16文字以上で全文字種を使用したパスワードは、現在の技術では事実上破解不可能です。",
  "descriptions.faq5Q": "ランダムパスワードと覚えやすいパスワードの違いは？",
  "descriptions.faq5A": "ランダムパスワードはすべての文字種を混ぜて文字あたりのエントロピーを最大化します。覚えやすいパスワードは辞書語を組み合わせて（\"correct-horse-battery-staple\" のように）記憶しやすくします。十分な長さがあればどちらも安全です。重要なのは総エントロピーであり、形式ではありません。"
```

- [ ] **Step 4: Add translations to ko**

Append the following keys to `public/locales/ko/password.json`:

```json
  "descriptions.stepsTitle": "강력한 비밀번호 만들기",
  "descriptions.step1Title": "비밀번호 길이 선택",
  "descriptions.step1Desc": "최소 16자 이상을 선택하세요. 비밀번호가 길수록 해독 난이도가 기하급수적으로 높아집니다.",
  "descriptions.step2Title": "모든 문자 유형 활성화",
  "descriptions.step2Desc": "대문자, 소문자, 숫자, 기호를 조합하여 엔트로피를 최대화합니다.",
  "descriptions.step3Title": "혼동하기 쉬운 문자 피하기",
  "descriptions.step3Desc": "\"혼동 문자 제외\"를 활성화하여 0/O, 1/l/I 등 혼동하기 쉬운 문자를 제외합니다.",
  "descriptions.step4Title": "비밀번호 강도 확인",
  "descriptions.step4Desc": "\"강도 확인\" 탭을 사용하여 비밀번호가 일반적인 공격 패턴에 저항할 수 있는지 확인합니다.",
  "descriptions.step5Title": "고유한 비밀번호 사용",
  "descriptions.step5Desc": "다른 서비스에서 동일한 비밀번호를 재사용하지 마세요.",
  "descriptions.whatIsStrongTitle": "비밀번호 강도를 결정하는 것은?",
  "descriptions.whatIsStrong": "비밀번호 강도는 엔트로피—가능한 조합의 총 수—에서 비롯됩니다. 엔트로피는 두 가지 요소에 의해 결정됩니다. 문자 집합의 크기와 길이입니다. 95개의 인쇄 가능한 ASCII 문자를 모두 사용하는 16자 비밀번호는 95¹⁶(약 10³¹) 가지 조합이 가능하여 무차별 대입 공격이 사실상 불가능합니다.",
  "descriptions.randomVsMemTitle": "무작위 비밀번호와 기억하기 쉬운 비밀번호",
  "descriptions.randomVsMem": "무작위 비밀번호는 문자당 엔트로피를 최대화하지만 기억하기 어렵습니다. 기억하기 쉬운 비밀번호는 여러 사전 단어(다이스웨어 방식)를 사용하여 더 길지만 읽기 쉽습니다. 총 엔트로피가 충분하면 두 접근 방식 모두 높은 보안을 달성할 수 있습니다. 예를 들어, 4-5개의 무작위 단어는 12자 무작위 비밀번호와 동등한 강도를 가질 수 있습니다.",
  "descriptions.strengthCalcTitle": "비밀번호 강도 계산 방법",
  "descriptions.strengthCalc": "이 도구는 단순한 엔트로피 계산을 넘어서는 zxcvbn 비밀번호 강도 추정기를 사용합니다. 사전 단어, 키보드 시퀀스(qwerty), 반복 문자(aaa), 날짜, 개인 정보 등 일반적인 패턴을 감지합니다. 이를 통해 문자 유형만 세는 것보다 더 현실적인 해독 시간 추정치를 제공합니다.",
  "descriptions.avoidPersonalTitle": "개인 정보를 피해야 하는 이유",
  "descriptions.avoidPersonal": "생일, 이름, 반려동물 이름 또는 기타 개인 세부 정보가 포함된 비밀번호는 훨씬 덜 안전합니다. 공격자는 소셜 미디어에서 이 정보를 쉽게 찾아 표적 공격에 사용할 수 있습니다. 항상 무작위로 생성된 비밀번호를 사용하세요.",
  "descriptions.faqTitle": "자주 묻는 질문",
  "descriptions.faq1Q": "비밀번호는 얼마나 길어야 안전한가요?",
  "descriptions.faq1A": "강력한 보안을 위해 최소 16자 이상을 사용하세요. 12자는 최소 허용 길이입니다. 8자 미만의 비밀번호는 문자 종류에 관계없이 몇 초 안에 해독될 수 있습니다.",
  "descriptions.faq2Q": "온라인 비밀번호 생성기는 안전한가요?",
  "descriptions.faq2A": "이 생성기는 브라우저에서 완전히 실행되며 crypto.getRandomValues() 암호학적으로 안전한 난수 생성기를 사용합니다. 어떤 서버에도 데이터를 전송하지 않습니다. 비밀번호는 인터넷을 통해 전송되지 않습니다.",
  "descriptions.faq3Q": "강력한 비밀번호에는 어떤 문자가 포함되어야 하나요?",
  "descriptions.faq3A": "강력한 비밀번호에는 대문자(A-Z), 소문자(a-z), 숫자(0-9), 기호(!@#$% 등)가 포함되어야 합니다. 네 가지 유형을 모두 사용하면 약 95개의 문자 집합이 생성되어 문자당 엔트로피가 최대화됩니다.",
  "descriptions.faq4Q": "비밀번호를 해독하는 데 얼마나 걸리나요?",
  "descriptions.faq4A": "길이와 복잡성에 따라 다릅니다. 소문자만으로 된 8자 비밀번호는 몇 초 안에 해독됩니다. 모든 문자 유형을 사용한 12자 비밀번호는 수년이 걸립니다. 모든 유형을 사용한 16자 이상의 비밀번호는 현재 기술로는 사실상 해독 불가능합니다.",
  "descriptions.faq5Q": "무작위 비밀번호와 기억하기 쉬운 비밀번호의 차이는 무엇인가요?",
  "descriptions.faq5A": "무작위 비밀번호는 모든 문자 유형을 혼합하여 문자당 엔트로피를 최대화합니다. 기억하기 쉬운 비밀번호는 사전 단어를 조합하여(\"correct-horse-battery-staple\"처럼) 기억하기 쉽게 만듭니다. 충분히 길면 둘 다 안전합니다. 핵심은 총 엔트로피이지 형식이 아닙니다."
```

- [ ] **Step 5: Verify all 4 JSON files are valid**

Run:

```bash
node -e "['zh-CN','zh-TW','ja','ko'].forEach(l=>{JSON.parse(require('fs').readFileSync('public/locales/'+l+'/password.json','utf8'));console.log(l+': OK')})"
```

Expected: all 4 locales print `OK`

- [ ] **Step 6: Commit**

```bash
git add public/locales/zh-CN/password.json public/locales/zh-TW/password.json public/locales/ja/password.json public/locales/ko/password.json
git commit -m "feat(password): add CJK translations for AEO description content"
```

---

### Task 3: Latin-script translations (es, pt-BR, fr, de, ru)

**Files:**

- Modify: `public/locales/es/password.json`
- Modify: `public/locales/pt-BR/password.json`
- Modify: `public/locales/fr/password.json`
- Modify: `public/locales/de/password.json`
- Modify: `public/locales/ru/password.json`

- [ ] **Step 1: Add translations to es**

Append the following keys to `public/locales/es/password.json`:

```json
  "descriptions.stepsTitle": "Cómo crear una contraseña segura",
  "descriptions.step1Title": "Elige la longitud de tu contraseña",
  "descriptions.step1Desc": "Selecciona al menos 16 caracteres. Las contraseñas más largas son exponencialmente más difíciles de descifrar.",
  "descriptions.step2Title": "Habilita todos los tipos de caracteres",
  "descriptions.step2Desc": "Combina mayúsculas, minúsculas, números y símbolos para maximizar la entropía.",
  "descriptions.step3Title": "Evita caracteres ambiguos",
  "descriptions.step3Desc": "Habilita «Evitar ambiguos» para excluir caracteres fáciles de confundir como 0/O y 1/l/I.",
  "descriptions.step4Title": "Verifica la fuerza de tu contraseña",
  "descriptions.step4Desc": "Usa la pestaña «Verificador de fuerza» para confirmar que tu contraseña resiste patrones de ataque comunes.",
  "descriptions.step5Title": "Usa contraseñas únicas",
  "descriptions.step5Desc": "Nunca reutilices contraseñas en diferentes servicios.",
  "descriptions.whatIsStrongTitle": "¿Qué hace que una contraseña sea segura?",
  "descriptions.whatIsStrong": "La fuerza de una contraseña proviene de la entropía: el número total de combinaciones posibles. La entropía depende de dos factores: el tamaño del conjunto de caracteres y la longitud. Una contraseña de 16 caracteres que usa los 95 caracteres ASCII imprimibles tiene 95¹⁶ (aproximadamente 10³¹) combinaciones posibles, haciendo los ataques de fuerza bruta inviables.",
  "descriptions.randomVsMemTitle": "Contraseñas aleatorias vs. memorables",
  "descriptions.randomVsMem": "Las contraseñas aleatorias maximizan la entropía por carácter pero son difíciles de recordar. Las memorables usan múltiples palabras del diccionario (estilo diceware): más largas pero legibles. Ambos enfoques pueden lograr alta seguridad cuando la entropía total es suficiente. Por ejemplo, 4-5 palabras aleatorias pueden igualar la fuerza de una contraseña aleatoria de 12 caracteres.",
  "descriptions.strengthCalcTitle": "Cómo se calcula la fuerza de una contraseña",
  "descriptions.strengthCalc": "Esta herramienta usa zxcvbn, un estimador de fuerza que va más allá del cálculo simple de entropía. Detecta patrones comunes como palabras del diccionario, secuencias de teclado (qwerty), caracteres repetidos (aaa), fechas e información personal. Esto proporciona una estimación más realista del tiempo de descifrado que simplemente contar tipos de caracteres.",
  "descriptions.avoidPersonalTitle": "Por qué evitar información personal",
  "descriptions.avoidPersonal": "Las contraseñas que contienen cumpleaños, nombres, nombres de mascotas u otros detalles personales son mucho menos seguras. Los atacantes pueden encontrar fácilmente esta información en redes sociales y usarla en ataques dirigidos. Usa siempre contraseñas generadas aleatoriamente.",
  "descriptions.faqTitle": "Preguntas frecuentes",
  "descriptions.faq1Q": "¿Cuál es una buena longitud para una contraseña?",
  "descriptions.faq1A": "Para una seguridad fuerte, usa al menos 16 caracteres. 12 caracteres es la longitud mínima aceptable. Las contraseñas de menos de 8 caracteres pueden descifrarse en segundos independientemente de la variedad de caracteres.",
  "descriptions.faq2Q": "¿Son seguros los generadores de contraseñas en línea?",
  "descriptions.faq2A": "Este generador se ejecuta completamente en tu navegador usando crypto.getRandomValues(), un generador de números aleatorios criptográficamente seguro. No se envían datos a ningún servidor. Tus contraseñas nunca se transmiten por Internet.",
  "descriptions.faq3Q": "¿Qué caracteres debe contener una contraseña segura?",
  "descriptions.faq3A": "Una contraseña segura debe incluir letras mayúsculas (A-Z), letras minúsculas (a-z), números (0-9) y símbolos (!@#$% etc.). Usar los cuatro tipos crea un conjunto de ~95 caracteres, maximizando la entropía por carácter.",
  "descriptions.faq4Q": "¿Cuánto tiempo toma descifrar una contraseña?",
  "descriptions.faq4A": "Depende de la longitud y complejidad: una contraseña de 8 caracteres solo en minúsculas puede descifrarse en segundos. Una de 12 caracteres con todos los tipos de caracteres toma años. Una de 16+ caracteres con todos los tipos es efectivamente indescifrable con la tecnología actual.",
  "descriptions.faq5Q": "¿Cuál es la diferencia entre contraseñas aleatorias y memorables?",
  "descriptions.faq5A": "Las contraseñas aleatorias usan una mezcla de todos los tipos de caracteres para maximizar la entropía por carácter. Las memorables combinan palabras del diccionario (como \"correct-horse-battery-staple\") para recordarlas más fácilmente. Ambas son seguras cuando son suficientemente largas; la clave es la entropía total, no el formato."
```

- [ ] **Step 2: Add translations to pt-BR**

Append the following keys to `public/locales/pt-BR/password.json`:

```json
  "descriptions.stepsTitle": "Como criar uma senha forte",
  "descriptions.step1Title": "Escolha o tamanho da sua senha",
  "descriptions.step1Desc": "Selecione pelo menos 16 caracteres. Senhas mais longas são exponencialmente mais difíceis de quebrar.",
  "descriptions.step2Title": "Ative todos os tipos de caracteres",
  "descriptions.step2Desc": "Combine maiúsculas, minúsculas, números e símbolos para maximizar a entropia.",
  "descriptions.step3Title": "Evite caracteres ambíguos",
  "descriptions.step3Desc": "Ative «Evitar Ambíguos» para excluir caracteres facilmente confundidos como 0/O e 1/l/I.",
  "descriptions.step4Title": "Verifique a força da senha",
  "descriptions.step4Desc": "Use a aba «Verificador de Força» para confirmar que sua senha resiste a padrões de ataque comuns.",
  "descriptions.step5Title": "Use senhas únicas",
  "descriptions.step5Desc": "Nunca reutilize senhas em serviços diferentes.",
  "descriptions.whatIsStrongTitle": "O que torna uma senha forte?",
  "descriptions.whatIsStrong": "A força de uma senha vem da entropia — o número total de combinações possíveis. A entropia depende de dois fatores: tamanho do conjunto de caracteres e comprimento. Uma senha de 16 caracteres usando todos os 95 caracteres ASCII imprimíveis tem 95¹⁶ (cerca de 10³¹) combinações possíveis, tornando ataques de força bruta inviáveis.",
  "descriptions.randomVsMemTitle": "Senhas aleatórias vs. memoráveis",
  "descriptions.randomVsMem": "Senhas aleatórias maximizam a entropia por caractere, mas são difíceis de lembrar. Senhas memoráveis usam múltiplas palavras do dicionário (estilo diceware) — mais longas, mas legíveis. Ambas as abordagens podem alcançar alta segurança quando a entropia total é suficiente. Por exemplo, 4-5 palavras aleatórias podem igualar a força de uma senha aleatória de 12 caracteres.",
  "descriptions.strengthCalcTitle": "Como a força da senha é calculada",
  "descriptions.strengthCalc": "Esta ferramenta usa zxcvbn, um estimador de força que vai além do cálculo simples de entropia. Ele detecta padrões comuns como palavras do dicionário, sequências de teclado (qwerty), caracteres repetidos (aaa), datas e informações pessoais. Isso fornece uma estimativa mais realista do tempo de quebra do que apenas contar tipos de caracteres.",
  "descriptions.avoidPersonalTitle": "Por que evitar informações pessoais",
  "descriptions.avoidPersonal": "Senhas contendo aniversários, nomes, nomes de pets ou outros detalhes pessoais são muito menos seguras. Atacantes podem facilmente encontrar essas informações em redes sociais e usá-las em ataques direcionados. Sempre use senhas geradas aleatoriamente.",
  "descriptions.faqTitle": "Perguntas frequentes",
  "descriptions.faq1Q": "Qual é um bom tamanho para uma senha?",
  "descriptions.faq1A": "Para segurança forte, use pelo menos 16 caracteres. 12 caracteres é o tamanho mínimo aceitável. Senhas com menos de 8 caracteres podem ser quebradas em segundos, independentemente da variedade de caracteres.",
  "descriptions.faq2Q": "Geradores de senhas online são seguros?",
  "descriptions.faq2A": "Este gerador roda inteiramente no seu navegador usando crypto.getRandomValues(), um gerador de números aleatórios criptograficamente seguro. Nenhum dado é enviado a nenhum servidor. Suas senhas nunca são transmitidas pela internet.",
  "descriptions.faq3Q": "Quais caracteres uma senha forte deve conter?",
  "descriptions.faq3A": "Uma senha forte deve incluir letras maiúsculas (A-Z), letras minúsculas (a-z), números (0-9) e símbolos (!@#$% etc.). Usar todos os quatro tipos cria um conjunto de ~95 caracteres, maximizando a entropia por caractere.",
  "descriptions.faq4Q": "Quanto tempo leva para quebrar uma senha?",
  "descriptions.faq4A": "Depende do comprimento e complexidade: uma senha de 8 caracteres apenas em minúsculas pode ser quebrada em segundos. Uma de 12 caracteres com todos os tipos de caracteres leva anos. Uma de 16+ caracteres com todos os tipos é efetivamente impossível de quebrar com a tecnologia atual.",
  "descriptions.faq5Q": "Qual é a diferença entre senhas aleatórias e memoráveis?",
  "descriptions.faq5A": "Senhas aleatórias usam uma mistura de todos os tipos de caracteres para maximizar a entropia por caractere. Senhas memoráveis combinam palavras do dicionário (como \"correct-horse-battery-staple\") para facilitar a lembrança. Ambas são seguras quando suficientemente longas — o importante é a entropia total, não o formato."
```

- [ ] **Step 3: Add translations to fr**

Append the following keys to `public/locales/fr/password.json`:

```json
  "descriptions.stepsTitle": "Comment créer un mot de passe fort",
  "descriptions.step1Title": "Choisissez la longueur de votre mot de passe",
  "descriptions.step1Desc": "Sélectionnez au moins 16 caractères. Plus le mot de passe est long, plus il est exponentiellement difficile à casser.",
  "descriptions.step2Title": "Activez tous les types de caractères",
  "descriptions.step2Desc": "Combinez majuscules, minuscules, chiffres et symboles pour maximiser l'entropie.",
  "descriptions.step3Title": "Évitez les caractères ambigus",
  "descriptions.step3Desc": "Activez « Éviter les ambigus » pour exclure les caractères facilement confondus comme 0/O et 1/l/I.",
  "descriptions.step4Title": "Vérifiez la force du mot de passe",
  "descriptions.step4Desc": "Utilisez l'onglet « Vérificateur de force » pour confirmer que votre mot de passe résiste aux modèles d'attaque courants.",
  "descriptions.step5Title": "Utilisez des mots de passe uniques",
  "descriptions.step5Desc": "Ne réutilisez jamais le même mot de passe sur différents services.",
  "descriptions.whatIsStrongTitle": "Qu'est-ce qui rend un mot de passe fort ?",
  "descriptions.whatIsStrong": "La force d'un mot de passe provient de l'entropie — le nombre total de combinaisons possibles. L'entropie dépend de deux facteurs : la taille du jeu de caractères et la longueur. Un mot de passe de 16 caractères utilisant les 95 caractères ASCII imprimables possède 95¹⁶ (environ 10³¹) combinaisons possibles, rendant les attaques par force brute infaisables.",
  "descriptions.randomVsMemTitle": "Mots de passe aléatoires vs. mémorisables",
  "descriptions.randomVsMem": "Les mots de passe aléatoires maximisent l'entropie par caractère mais sont difficiles à mémoriser. Les mots de passe mémorisables utilisent plusieurs mots du dictionnaire (style diceware) — plus longs mais lisibles. Les deux approches peuvent atteindre une haute sécurité lorsque l'entropie totale est suffisante. Par exemple, 4-5 mots aléatoires peuvent égaler la force d'un mot de passe aléatoire de 12 caractères.",
  "descriptions.strengthCalcTitle": "Comment la force est calculée",
  "descriptions.strengthCalc": "Cet outil utilise zxcvbn, un estimateur de force qui va au-delà du simple calcul d'entropie. Il détecte les motifs courants comme les mots du dictionnaire, les séquences clavier (qwerty), les caractères répétés (aaa), les dates et les informations personnelles. Cela fournit une estimation plus réaliste du temps de cassage que le simple comptage des types de caractères.",
  "descriptions.avoidPersonalTitle": "Pourquoi éviter les informations personnelles",
  "descriptions.avoidPersonal": "Les mots de passe contenant des dates de naissance, des noms, des noms d'animaux ou d'autres détails personnels sont beaucoup moins sécurisés. Les attaquants peuvent facilement trouver ces informations sur les réseaux sociaux et les utiliser dans des attaques ciblées. Utilisez toujours des mots de passe générés aléatoirement.",
  "descriptions.faqTitle": "Questions fréquentes",
  "descriptions.faq1Q": "Quelle est une bonne longueur pour un mot de passe ?",
  "descriptions.faq1A": "Pour une sécurité forte, utilisez au moins 16 caractères. 12 caractères est la longueur minimale acceptable. Les mots de passe de moins de 8 caractères peuvent être cassés en quelques secondes, quelle que soit la variété de caractères.",
  "descriptions.faq2Q": "Les générateurs de mots de passe en ligne sont-ils sécurisés ?",
  "descriptions.faq2A": "Ce générateur fonctionne entièrement dans votre navigateur en utilisant crypto.getRandomValues(), un générateur de nombres aléatoires cryptographiquement sécurisé. Aucune donnée n'est envoyée à un serveur. Vos mots de passe ne sont jamais transmis sur Internet.",
  "descriptions.faq3Q": "Quels caractères un mot de passe fort doit-il contenir ?",
  "descriptions.faq3A": "Un mot de passe fort doit inclure des majuscules (A-Z), des minuscules (a-z), des chiffres (0-9) et des symboles (!@#$% etc.). Utiliser les quatre types crée un jeu d'environ 95 caractères, maximisant l'entropie par caractère.",
  "descriptions.faq4Q": "Combien de temps faut-il pour casser un mot de passe ?",
  "descriptions.faq4A": "Cela dépend de la longueur et de la complexité : un mot de passe de 8 caractères en minuscules uniquement peut être cassé en quelques secondes. Un de 12 caractères avec tous les types de caractères prend des années. Un de 16+ caractères avec tous les types est pratiquement incassable avec la technologie actuelle.",
  "descriptions.faq5Q": "Quelle est la différence entre mots de passe aléatoires et mémorisables ?",
  "descriptions.faq5A": "Les mots de passe aléatoires mélangent tous les types de caractères pour maximiser l'entropie par caractère. Les mémorisables combinent des mots du dictionnaire (comme « correct-horse-battery-staple ») pour faciliter la mémorisation. Les deux sont sécurisés s'ils sont suffisamment longs — l'essentiel est l'entropie totale, pas le format."
```

- [ ] **Step 4: Add translations to de**

Append the following keys to `public/locales/de/password.json`:

```json
  "descriptions.stepsTitle": "So erstellen Sie ein sicheres Passwort",
  "descriptions.step1Title": "Wählen Sie die Passwortlänge",
  "descriptions.step1Desc": "Wählen Sie mindestens 16 Zeichen. Längere Passwörter sind exponentiell schwerer zu knacken.",
  "descriptions.step2Title": "Alle Zeichentypen aktivieren",
  "descriptions.step2Desc": "Kombinieren Sie Großbuchstaben, Kleinbuchstaben, Zahlen und Symbole, um die Entropie zu maximieren.",
  "descriptions.step3Title": "Mehrdeutige Zeichen vermeiden",
  "descriptions.step3Desc": "Aktivieren Sie «Mehrdeutige vermeiden», um leicht verwechselbare Zeichen wie 0/O und 1/l/I auszuschließen.",
  "descriptions.step4Title": "Passwortstärke prüfen",
  "descriptions.step4Desc": "Nutzen Sie den Reiter «Stärke-Prüfer», um zu überprüfen, ob Ihr Passwort gängigen Angriffsmustern standhält.",
  "descriptions.step5Title": "Einzigartige Passwörter verwenden",
  "descriptions.step5Desc": "Verwenden Sie niemals dasselbe Passwort für verschiedene Dienste.",
  "descriptions.whatIsStrongTitle": "Was macht ein Passwort sicher?",
  "descriptions.whatIsStrong": "Passwortsicherheit beruht auf Entropie — der Gesamtzahl möglicher Kombinationen. Die Entropie hängt von zwei Faktoren ab: der Zeichensatzgröße und der Länge. Ein 16 Zeichen langes Passwort mit allen 95 druckbaren ASCII-Zeichen hat 95¹⁶ (ca. 10³¹) mögliche Kombinationen, was Brute-Force-Angriffe unrealistisch macht.",
  "descriptions.randomVsMemTitle": "Zufällige vs. merkbare Passwörter",
  "descriptions.randomVsMem": "Zufällige Passwörter maximieren die Entropie pro Zeichen, sind aber schwer zu merken. Merkbare Passwörter verwenden mehrere Wörter aus dem Wörterbuch (Diceware-Stil) — länger, aber besser lesbar. Beide Ansätze können hohe Sicherheit erreichen, wenn die Gesamtentropie ausreichend ist. Zum Beispiel können 4-5 zufällige Wörter einem 12-stelligen zufälligen Passwort an Stärke entsprechen.",
  "descriptions.strengthCalcTitle": "Wie die Passwortstärke berechnet wird",
  "descriptions.strengthCalc": "Dieses Tool verwendet zxcvbn, einen Passwortstärke-Schätzer, der über einfache Entropieberechnung hinausgeht. Es erkennt gängige Muster wie Wörterbucheinträge, Tastatursequenzen (qwerty), wiederholte Zeichen (aaa), Daten und persönliche Informationen. Dies liefert eine realistischere Knack-Zeit-Schätzung als das bloße Zählen von Zeichentypen.",
  "descriptions.avoidPersonalTitle": "Warum persönliche Informationen vermeiden",
  "descriptions.avoidPersonal": "Passwörter mit Geburtstagen, Namen, Tiernamen oder anderen persönlichen Daten sind deutlich weniger sicher. Angreifer können diese Informationen leicht in sozialen Netzwerken finden und für gezielte Angriffe nutzen. Verwenden Sie immer zufällig generierte Passwörter.",
  "descriptions.faqTitle": "Häufig gestellte Fragen",
  "descriptions.faq1Q": "Wie lang sollte ein Passwort sein?",
  "descriptions.faq1A": "Für hohe Sicherheit verwenden Sie mindestens 16 Zeichen. 12 Zeichen ist die minimal akzeptable Länge. Passwörter unter 8 Zeichen können unabhängig von der Zeichenvielfalt in Sekunden geknackt werden.",
  "descriptions.faq2Q": "Sind Online-Passwortgeneratoren sicher?",
  "descriptions.faq2A": "Dieser Generator läuft vollständig in Ihrem Browser und verwendet crypto.getRandomValues(), einen kryptografisch sicheren Zufallszahlengenerator. Es werden keine Daten an einen Server gesendet. Ihre Passwörter werden nie über das Internet übertragen.",
  "descriptions.faq3Q": "Welche Zeichen sollte ein sicheres Passwort enthalten?",
  "descriptions.faq3A": "Ein sicheres Passwort sollte Großbuchstaben (A-Z), Kleinbuchstaben (a-z), Zahlen (0-9) und Symbole (!@#$% usw.) enthalten. Die Verwendung aller vier Typen erzeugt einen Zeichensatz von ~95 Zeichen und maximiert die Entropie pro Zeichen.",
  "descriptions.faq4Q": "Wie lange dauert es, ein Passwort zu knacken?",
  "descriptions.faq4A": "Das hängt von Länge und Komplexität ab: Ein 8-stelliges Passwort nur mit Kleinbuchstaben kann in Sekunden geknackt werden. Ein 12-stelliges mit allen Zeichentypen dauert Jahre. Ein 16+ stelliges mit allen Typen ist mit aktueller Technologie praktisch unknackbar.",
  "descriptions.faq5Q": "Was ist der Unterschied zwischen zufälligen und merkbaren Passwörtern?",
  "descriptions.faq5A": "Zufällige Passwörter mischen alle Zeichentypen für maximale Entropie pro Zeichen. Merkbare Passwörter kombinieren Wörter aus dem Wörterbuch (wie \"correct-horse-battery-staple\") zur leichteren Erinnerung. Beide sind sicher, wenn sie lang genug sind — entscheidend ist die Gesamtentropie, nicht das Format."
```

- [ ] **Step 5: Add translations to ru**

Append the following keys to `public/locales/ru/password.json`:

```json
  "descriptions.stepsTitle": "Как создать надёжный пароль",
  "descriptions.step1Title": "Выберите длину пароля",
  "descriptions.step1Desc": "Выберите минимум 16 символов. Чем длиннее пароль, тем экспоненциально сложнее его взломать.",
  "descriptions.step2Title": "Включите все типы символов",
  "descriptions.step2Desc": "Комбинируйте прописные, строчные буквы, цифры и символы для максимальной энтропии.",
  "descriptions.step3Title": "Исключите неоднозначные символы",
  "descriptions.step3Desc": "Включите «Исключить неоднозначные», чтобы убрать легко путаемые символы вроде 0/O и 1/l/I.",
  "descriptions.step4Title": "Проверьте надёжность пароля",
  "descriptions.step4Desc": "Используйте вкладку «Проверка надёжности», чтобы убедиться, что пароль устойчив к распространённым атакам.",
  "descriptions.step5Title": "Используйте уникальные пароли",
  "descriptions.step5Desc": "Никогда не используйте один и тот же пароль для разных сервисов.",
  "descriptions.whatIsStrongTitle": "Что делает пароль надёжным?",
  "descriptions.whatIsStrong": "Надёжность пароля определяется энтропией — общим числом возможных комбинаций. Энтропия зависит от двух факторов: размера набора символов и длины. Пароль из 16 символов, использующий все 95 печатных символов ASCII, имеет 95¹⁶ (около 10³¹) возможных комбинаций, что делает атаку перебором неосуществимой.",
  "descriptions.randomVsMemTitle": "Случайные и запоминающиеся пароли",
  "descriptions.randomVsMem": "Случайные пароли максимизируют энтропию на символ, но их трудно запомнить. Запоминающиеся пароли используют несколько словарных слов (в стиле diceware) — они длиннее, но удобочитаемы. Оба подхода обеспечивают высокую безопасность при достаточной общей энтропии. Например, 4-5 случайных слов могут сравниться по стойкости с 12-символьным случайным паролем.",
  "descriptions.strengthCalcTitle": "Как рассчитывается надёжность пароля",
  "descriptions.strengthCalc": "Этот инструмент использует zxcvbn — оценщик стойкости паролей, выходящий за рамки простого подсчёта энтропии. Он обнаруживает распространённые паттерны: словарные слова, последовательности клавиатуры (qwerty), повторяющиеся символы (aaa), даты и личную информацию. Это даёт более реалистичную оценку времени взлома, чем простой подсчёт типов символов.",
  "descriptions.avoidPersonalTitle": "Почему не стоит использовать личную информацию",
  "descriptions.avoidPersonal": "Пароли, содержащие даты рождения, имена, клички питомцев и другие личные данные, значительно менее безопасны. Злоумышленники легко находят эту информацию в социальных сетях и используют для целенаправленных атак. Всегда используйте случайно сгенерированные пароли.",
  "descriptions.faqTitle": "Часто задаваемые вопросы",
  "descriptions.faq1Q": "Какой длины должен быть хороший пароль?",
  "descriptions.faq1A": "Для высокой надёжности используйте не менее 16 символов. 12 символов — минимально допустимая длина. Пароли короче 8 символов могут быть взломаны за секунды независимо от разнообразия символов.",
  "descriptions.faq2Q": "Безопасны ли онлайн-генераторы паролей?",
  "descriptions.faq2A": "Этот генератор работает полностью в вашем браузере, используя crypto.getRandomValues() — криптографически безопасный генератор случайных чисел. Данные не отправляются на сервер. Ваши пароли никогда не передаются через интернет.",
  "descriptions.faq3Q": "Какие символы должен содержать надёжный пароль?",
  "descriptions.faq3A": "Надёжный пароль должен включать прописные буквы (A-Z), строчные буквы (a-z), цифры (0-9) и символы (!@#$% и т.д.). Использование всех четырёх типов создаёт набор из ~95 символов, максимизируя энтропию на символ.",
  "descriptions.faq4Q": "Сколько времени нужно для взлома пароля?",
  "descriptions.faq4A": "Зависит от длины и сложности: пароль из 8 символов только в нижнем регистре взламывается за секунды. 12-символьный со всеми типами символов — за годы. 16+ символов со всеми типами практически невзламываем при текущих технологиях.",
  "descriptions.faq5Q": "В чём разница между случайными и запоминающимися паролями?",
  "descriptions.faq5A": "Случайные пароли смешивают все типы символов для максимальной энтропии на символ. Запоминающиеся комбинируют словарные слова (например, \"correct-horse-battery-staple\") для удобства запоминания. Оба типа безопасны при достаточной длине — ключевое значение имеет общая энтропия, а не формат."
```

- [ ] **Step 6: Verify all 5 JSON files are valid**

Run:

```bash
node -e "['es','pt-BR','fr','de','ru'].forEach(l=>{JSON.parse(require('fs').readFileSync('public/locales/'+l+'/password.json','utf8'));console.log(l+': OK')})"
```

Expected: all 5 locales print `OK`

- [ ] **Step 7: Commit**

```bash
git add public/locales/es/password.json public/locales/pt-BR/password.json public/locales/fr/password.json public/locales/de/password.json public/locales/ru/password.json
git commit -m "feat(password): add Latin-script translations for AEO description content"
```

---

### Task 4: Add `Description` component to password-page.tsx

**Files:**

- Modify: `app/[locale]/password/password-page.tsx`

- [ ] **Step 1: Add Accordion import**

In `password-page.tsx`, after line 32 (`import { NeonTabs } from ...`), add:

```tsx
import { Accordion } from "../../../components/ui/accordion";
```

- [ ] **Step 2: Add the `Description` component**

Add the following function component before the `export default function PasswordPage()` (before line 803):

```tsx
function Description() {
  const t = useTranslations("password");
  const steps = [1, 2, 3, 4, 5].map((i) => ({
    title: t(`descriptions.step${i}Title`),
    desc: t(`descriptions.step${i}Desc`),
  }));
  const knowledgeTopics = [
    { titleKey: "descriptions.whatIsStrongTitle", contentKey: "descriptions.whatIsStrong" },
    { titleKey: "descriptions.randomVsMemTitle", contentKey: "descriptions.randomVsMem" },
    { titleKey: "descriptions.strengthCalcTitle", contentKey: "descriptions.strengthCalc" },
    { titleKey: "descriptions.avoidPersonalTitle", contentKey: "descriptions.avoidPersonal" },
  ];
  const faqItems = [1, 2, 3, 4, 5].map((i) => ({
    title: t(`descriptions.faq${i}Q`),
    content: <p>{t(`descriptions.faq${i}A`)}</p>,
  }));
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.stepsTitle")}</h2>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent-cyan text-bg-base text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <span className="font-medium text-fg-primary text-sm">{step.title}</span>
              <p className="text-fg-secondary text-sm leading-relaxed">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 space-y-4">
        {knowledgeTopics.map((topic) => (
          <div key={topic.titleKey}>
            <h2 className="font-semibold text-fg-primary text-base">{t(topic.titleKey)}</h2>
            <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t(topic.contentKey)}</p>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <h2 className="font-semibold text-fg-primary text-base mb-4">
          {t("descriptions.faqTitle")}
        </h2>
        <Accordion items={faqItems} />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Render `Description` in `PasswordPage`**

In the `PasswordPage` component's return JSX, after the `</SavedPasswords>` closing tag (line 873), add:

```tsx
<Description />
```

This places `Description` after `SavedPasswords` and before the closing `</div>` and `</Layout>`.

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build 2>&1 | Select-Object -First 30`

Expected: Build succeeds without errors related to password page.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/password/password-page.tsx
git commit -m "feat(password): add Description component with Steps, Knowledge, and FAQ sections"
```

---

### Task 5: Verify visually and run lint

- [ ] **Step 1: Run ESLint on the modified file**

Run: `npx eslint "app/[locale]/password/password-page.tsx"`

Expected: No errors or warnings.

- [ ] **Step 2: Run the dev server and visually verify**

Run: `npm run dev`

Open the password page in a browser. Verify:

1. Three sections appear at the bottom: Steps, Knowledge, FAQ
2. Steps have cyan numbered circles
3. FAQ Accordion expands/collapses correctly
4. Switch locale (e.g., zh-CN) and verify translations render

- [ ] **Step 3: Final verification — all JSON files valid**

Run:

```bash
node -e "['en','zh-CN','zh-TW','ja','ko','es','pt-BR','fr','de','ru'].forEach(l=>{JSON.parse(require('fs').readFileSync('public/locales/'+l+'/password.json','utf8'));console.log(l+': OK')})"
```

Expected: all 10 locales print `OK`
