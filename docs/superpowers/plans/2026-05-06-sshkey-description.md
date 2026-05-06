# SSH Key Description Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Description section (step guide + FAQ) to the SSH Key Generator page for SEO/AEO enhancement, following the exact Password page pattern.

**Architecture:** A single `Description` component is added to `sshkey-page.tsx`. It reads 16 i18n keys from `sshkey.json` → `descriptions.*` and renders a step-by-step guide plus an FAQ Accordion. No logic changes, no new shared components.

**Tech Stack:** React (Next.js App Router), next-intl, Accordion component (Headless UI), Lucide icons

**Design spec:** `docs/superpowers/specs/2026-05-06-sshkey-description-design.md`

---

## File Map

| File                                  | Action | Responsibility                                           |
| ------------------------------------- | ------ | -------------------------------------------------------- |
| `public/locales/en/sshkey.json`       | Modify | Source of truth — add `descriptions` object with 16 keys |
| `public/locales/zh-CN/sshkey.json`    | Modify | zh-CN translations                                       |
| `public/locales/zh-TW/sshkey.json`    | Modify | zh-TW translations                                       |
| `public/locales/ja/sshkey.json`       | Modify | ja translations                                          |
| `public/locales/ko/sshkey.json`       | Modify | ko translations                                          |
| `public/locales/es/sshkey.json`       | Modify | es translations                                          |
| `public/locales/pt-BR/sshkey.json`    | Modify | pt-BR translations                                       |
| `public/locales/fr/sshkey.json`       | Modify | fr translations                                          |
| `public/locales/de/sshkey.json`       | Modify | de translations                                          |
| `public/locales/ru/sshkey.json`       | Modify | ru translations                                          |
| `app/[locale]/sshkey/sshkey-page.tsx` | Modify | Add `Description` component + imports                    |

---

### Task 1: Add English i18n keys (source of truth)

**Files:**

- Modify: `public/locales/en/sshkey.json`

- [ ] **Step 1: Add `descriptions` object to English locale**

Open `public/locales/en/sshkey.json` and add a `"descriptions"` key before the closing `}`. The file currently ends at line 30 with `"localGenerated": "..."`. Add a comma after that line and append:

```json
  "descriptions": {
    "stepsTitle": "How to Generate & Deploy SSH Keys",
    "step1Title": "Choose your key type",
    "step1Desc": "Select Ed25519 (recommended — more secure, faster key generation) or RSA (broader compatibility with legacy systems), then set the key size if using RSA.",
    "step2Title": "Generate your key pair",
    "step2Desc": "Click Generate Key Pair. Keys are created entirely in your browser using the Web Crypto API — your private key never leaves your device.",
    "step3Title": "Copy your public key",
    "step3Desc": "Copy the public key content. It is ready to paste into target servers, Git platforms (GitHub, GitLab, Bitbucket), or cloud providers.",
    "step4Title": "Deploy to your server",
    "step4Desc": "Use ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host or manually append the public key to ~/.ssh/authorized_keys on the target machine.",
    "faqTitle": "Frequently Asked Questions",
    "faq1Q": "Ed25519 vs RSA: Which SSH key type should I use?",
    "faq1A": "Ed25519 is recommended for most use cases. It offers 128-bit security (comparable to RSA 3072), produces shorter keys, and generates signatures much faster. RSA 4096 is only needed for compatibility with older systems or services that do not yet support Ed25519. GitHub, GitLab, and all major cloud providers support Ed25519.",
    "faq2Q": "Do I need a passphrase for my SSH key?",
    "faq2A": "Not required, but strongly recommended. A passphrase encrypts your private key on disk. If your device is lost, stolen, or compromised, the private key cannot be used without the passphrase. Use a strong passphrase of 12+ characters for best protection.",
    "faq3Q": "How do I add my SSH key to GitHub?",
    "faq3A": "Go to Settings → SSH and GPG keys → New SSH key. Give it a descriptive title, paste your public key content (the entire line starting with ssh-ed25519 or ssh-rsa), and click Add SSH key. Alternatively, use the GitHub CLI: gh ssh-key add ~/.ssh/id_ed25519.pub.",
    "faq4Q": "Is it safe to generate SSH keys in the browser?",
    "faq4A": "Yes. This tool uses the Web Crypto API, which provides the same cryptographic primitives used by OpenSSL and OpenSSH. Key generation happens entirely in browser memory — no data is sent to any server. Generated keys are lost when you close or refresh the page, so download or copy them before leaving."
  }
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/locales/en/sshkey.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add public/locales/en/sshkey.json
git commit -m "feat(sshkey): add description i18n keys in English"
```

---

### Task 2: Add CJK locale translations (zh-CN, zh-TW, ja, ko)

**Files:**

- Modify: `public/locales/zh-CN/sshkey.json`
- Modify: `public/locales/zh-TW/sshkey.json`
- Modify: `public/locales/ja/sshkey.json`
- Modify: `public/locales/ko/sshkey.json`

- [ ] **Step 1: Add `descriptions` to zh-CN**

Append to `public/locales/zh-CN/sshkey.json` (add comma after `"localGenerated"` line, then):

```json
  "descriptions": {
    "stepsTitle": "如何生成和部署 SSH 密钥",
    "step1Title": "选择密钥类型",
    "step1Desc": "选择 Ed25519（推荐——更安全、生成更快）或 RSA（兼容性更广，适配旧系统）。使用 RSA 时可设置密钥长度。",
    "step2Title": "生成密钥对",
    "step2Desc": "点击"生成密钥对"按钮。密钥通过浏览器内置的 Web Crypto API 完全在本地生成，私钥永远不会离开你的设备。",
    "step3Title": "复制公钥",
    "step3Desc": "复制公钥内容，可直接粘贴到目标服务器、Git 平台（GitHub、GitLab、Bitbucket）或云服务商的配置中。",
    "step4Title": "部署到服务器",
    "step4Desc": "使用 ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host 命令，或手动将公钥追加到目标机器的 ~/.ssh/authorized_keys 文件中。",
    "faqTitle": "常见问题",
    "faq1Q": "Ed25519 和 RSA 应该选哪个？",
    "faq1A": "大多数场景推荐 Ed25519。它提供 128 位安全强度（相当于 RSA 3072），密钥更短，签名速度更快。只有在需要兼容不支持 Ed25519 的旧系统或服务时才需要 RSA 4096。GitHub、GitLab 和主流云服务商均已支持 Ed25519。",
    "faq2Q": "SSH 密钥需要设置密码短语吗？",
    "faq2A": "不是必须的，但强烈建议设置。密码短语会加密存储在磁盘上的私钥。如果设备丢失、被盗或被入侵，没有密码短语就无法使用私钥。建议使用 12 位以上的强密码短语。",
    "faq3Q": "如何将 SSH 公钥添加到 GitHub？",
    "faq3A": "进入 Settings → SSH and GPG keys → New SSH key。填写标题，粘贴公钥完整内容（以 ssh-ed25519 或 ssh-rsa 开头的整行），点击 Add SSH key。也可以使用 GitHub CLI：gh ssh-key add ~/.ssh/id_ed25519.pub。",
    "faq4Q": "在浏览器中生成 SSH 密钥安全吗？",
    "faq4A": "安全。本工具使用 Web Crypto API，提供与 OpenSSL 和 OpenSSH 相同的加密原语。密钥完全在浏览器内存中生成，不会发送到任何服务器。关闭或刷新页面后密钥即丢失，请务必在离开前下载或复制。"
  }
```

- [ ] **Step 2: Add `descriptions` to zh-TW**

Append to `public/locales/zh-TW/sshkey.json` (add comma after `"localGenerated"` line, then):

```json
  "descriptions": {
    "stepsTitle": "如何產生與部署 SSH 金鑰",
    "step1Title": "選擇金鑰類型",
    "step1Desc": "選擇 Ed25519（推薦——更安全、產生更快）或 RSA（相容性更廣，適配舊系統）。使用 RSA 時可設定金鑰長度。",
    "step2Title": "產生金鑰對",
    "step2Desc": "點擊「產生金鑰對」按鈕。金鑰透過瀏覽器內建的 Web Crypto API 完全在本機產生，私鑰永遠不會離開您的裝置。",
    "step3Title": "複製公鑰",
    "step3Desc": "複製公鑰內容，可直接貼到目標伺服器、Git 平台（GitHub、GitLab、Bitbucket）或雲端服務商的設定中。",
    "step4Title": "部署到伺服器",
    "step4Desc": "使用 ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host 指令，或手動將公鑰附加到目標機器的 ~/.ssh/authorized_keys 檔案中。",
    "faqTitle": "常見問題",
    "faq1Q": "Ed25519 和 RSA 應該選哪個？",
    "faq1A": "大多數情境推薦 Ed25519。它提供 128 位元安全強度（相當於 RSA 3072），金鑰更短，簽章速度更快。只有在需要相容不支援 Ed25519 的舊系統或服務時才需要 RSA 4096。GitHub、GitLab 和主流雲端服務商均已支援 Ed25519。",
    "faq2Q": "SSH 金鑰需要設定密碼短語嗎？",
    "faq2A": "不是必須的，但強烈建議設定。密碼短語會加密儲存在磁碟上的私鑰。如果裝置遺失、被盜或被入侵，沒有密碼短語就無法使用私鑰。建議使用 12 位以上的強密碼短語。",
    "faq3Q": "如何將 SSH 公鑰新增到 GitHub？",
    "faq3A": "進入 Settings → SSH and GPG keys → New SSH key。填寫標題，貼上公鑰完整內容（以 ssh-ed25519 或 ssh-rsa 開頭的整行），點擊 Add SSH key。也可以使用 GitHub CLI：gh ssh-key add ~/.ssh/id_ed25519.pub。",
    "faq4Q": "在瀏覽器中產生 SSH 金鑰安全嗎？",
    "faq4A": "安全。本工具使用 Web Crypto API，提供與 OpenSSL 和 OpenSSH 相同的加密基礎元件。金鑰完全在瀏覽器記憶體中產生，不會傳送到任何伺服器。關閉或重新整理頁面後金鑰即遺失，請務必在離開前下載或複製。"
  }
```

- [ ] **Step 3: Add `descriptions` to ja**

Append to `public/locales/ja/sshkey.json` (add comma after `"localGenerated"` line, then):

```json
  "descriptions": {
    "stepsTitle": "SSH 鍵の生成とデプロイ手順",
    "step1Title": "鍵の種類を選択",
    "step1Desc": "Ed25519（推奨 — より安全で高速）または RSA（レガシーシステムとの互換性が高い）を選択し、RSA の場合は鍵長を設定します。",
    "step2Title": "鍵ペアを生成",
    "step2Desc": "「鍵ペアを生成」をクリックします。鍵はブラウザ内の Web Crypto API を使って完全にローカルで生成され、秘密鍵がデバイス外に送信されることはありません。",
    "step3Title": "公開鍵をコピー",
    "step3Desc": "公開鍵の内容をコピーします。対象サーバー、Git プラットフォーム（GitHub、GitLab、Bitbucket）、クラウドプロバイダーにそのまま貼り付けられます。",
    "step4Title": "サーバーにデプロイ",
    "step4Desc": "ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host を実行するか、対象マシンの ~/.ssh/authorized_keys に公開鍵を手動で追加します。",
    "faqTitle": "よくある質問",
    "faq1Q": "Ed25519 と RSA はどちらを使うべきですか？",
    "faq1A": "ほとんどの用途では Ed25519 を推奨します。128 ビットのセキュリティ強度（RSA 3072 と同等）を持ち、鍵が短く、署名も高速です。RSA 4096 は Ed25519 をサポートしていない古いシステムやサービスとの互換性が必要な場合のみ使用します。GitHub、GitLab、主要なクラウドプロバイダーはすべて Ed25519 をサポートしています。",
    "faq2Q": "SSH 鍵にパスフレーズは必要ですか？",
    "faq2A": "必須ではありませんが、強く推奨します。パスフレーズはディスク上の秘密鍵を暗号化します。デバイスの紛失、盗難、侵害時に、パスフレーズなしでは秘密鍵を使用できません。12 文字以上の強力なパスフレーズを使用してください。",
    "faq3Q": "SSH 公開鍵を GitHub に追加するには？",
    "faq3A": "Settings → SSH and GPG keys → New SSH key に移動します。説明用のタイトルを入力し、公開鍵の内容（ssh-ed25519 または ssh-rsa で始まる行全体）を貼り付けて、Add SSH key をクリックします。GitHub CLI を使う場合は gh ssh-key add ~/.ssh/id_ed25519.pub も可能です。",
    "faq4Q": "ブラウザで SSH 鍵を生成するのは安全ですか？",
    "faq4A": "安全です。このツールは Web Crypto API を使用しており、OpenSSL や OpenSSH と同じ暗号プリミティブを提供します。鍵の生成はブラウザのメモリ内で完全に行われ、いかなるサーバーにもデータは送信されません。ページを閉じるか更新すると鍵は失われるため、離れる前にダウンロードまたはコピーしてください。"
  }
```

- [ ] **Step 4: Add `descriptions` to ko**

Append to `public/locales/ko/sshkey.json` (add comma after `"localGenerated"` line, then):

```json
  "descriptions": {
    "stepsTitle": "SSH 키 생성 및 배포 방법",
    "step1Title": "키 유형 선택",
    "step1Desc": "Ed25519(권장 — 더 안전하고 빠름) 또는 RSA(레거시 시스템 호환성)를 선택하고, RSA 사용 시 키 크기를 설정합니다.",
    "step2Title": "키 페어 생성",
    "step2Desc": "「키 페어 생성」을 클릭합니다. 키는 브라우저 내장 Web Crypto API를 통해 완전히 로컬에서 생성되며, 개인 키는 기기를 벗어나지 않습니다.",
    "step3Title": "공개 키 복사",
    "step3Desc": "공개 키 내용을 복사합니다. 대상 서버, Git 플랫폼(GitHub, GitLab, Bitbucket) 또는 클라우드 제공업체에 바로 붙여넣을 수 있습니다.",
    "step4Title": "서버에 배포",
    "step4Desc": "ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host 명령을 실행하거나, 대상 머신의 ~/.ssh/authorized_keys에 공개 키를 수동으로 추가합니다.",
    "faqTitle": "자주 묻는 질문",
    "faq1Q": "Ed25519과 RSA 중 어떤 것을 사용해야 하나요?",
    "faq1A": "대부분의 경우 Ed25519을 권장합니다. 128비트 보안 수준(RSA 3072와 동등)을 제공하고, 키가 더 짧으며, 서명 속도도 빠릅니다. RSA 4096은 Ed25519을 지원하지 않는 구형 시스템이나 서비스와의 호환성이 필요한 경우에만 사용합니다. GitHub, GitLab 및 주요 클라우드 제공업체는 모두 Ed25519을 지원합니다.",
    "faq2Q": "SSH 키에 암호문을 설정해야 하나요?",
    "faq2A": "필수는 아니지만 강력히 권장합니다. 암호문은 디스크에 저장된 개인 키를 암호화합니다. 기기를 분실하거나 도난당하거나 침해당한 경우, 암호문 없이는 개인 키를 사용할 수 없습니다. 12자 이상의 강력한 암호문을 사용하세요.",
    "faq3Q": "SSH 공개 키를 GitHub에 추가하려면?",
    "faq3A": "Settings → SSH and GPG keys → New SSH key로 이동합니다. 설명용 제목을 입력하고, 공개 키 내용(ssh-ed25519 또는 ssh-rsa로 시작하는 전체 행)을 붙여넣은 후 Add SSH key를 클릭합니다. GitHub CLI를 사용하면 gh ssh-key add ~/.ssh/id_ed25519.pub 명령도 가능합니다.",
    "faq4Q": "브라우저에서 SSH 키를 생성하는 것은 안전한가요?",
    "faq4A": "안전합니다. 이 도구는 Web Crypto API를 사용하며, OpenSSL 및 OpenSSH와 동일한 암호화 프리미티브를 제공합니다. 키 생성은 브라우저 메모리 내에서 완전히 이루어지며, 어떤 서버에도 데이터가 전송되지 않습니다. 페이지를 닫거나 새로고침하면 키가 삭제되므로, 떠나기 전에 반드시 다운로드하거나 복사하세요."
  }
```

- [ ] **Step 5: Validate all 4 JSON files**

Run:

```bash
node -e "['zh-CN','zh-TW','ja','ko'].forEach(l => { try { JSON.parse(require('fs').readFileSync('public/locales/'+l+'/sshkey.json','utf8')); console.log(l+': valid') } catch(e) { console.log(l+': INVALID - '+e.message) } })"
```

Expected: all 4 lines show `valid`

- [ ] **Step 6: Commit**

```bash
git add public/locales/zh-CN/sshkey.json public/locales/zh-TW/sshkey.json public/locales/ja/sshkey.json public/locales/ko/sshkey.json
git commit -m "feat(sshkey): add description i18n keys for CJK locales"
```

---

### Task 3: Add Latin-script locale translations (es, pt-BR, fr, de, ru)

**Files:**

- Modify: `public/locales/es/sshkey.json`
- Modify: `public/locales/pt-BR/sshkey.json`
- Modify: `public/locales/fr/sshkey.json`
- Modify: `public/locales/de/sshkey.json`
- Modify: `public/locales/ru/sshkey.json`

- [ ] **Step 1: Add `descriptions` to es**

Append to `public/locales/es/sshkey.json` (add comma after `"localGenerated"` line, then):

```json
  "descriptions": {
    "stepsTitle": "Cómo generar y desplegar claves SSH",
    "step1Title": "Elige el tipo de clave",
    "step1Desc": "Selecciona Ed25519 (recomendado — más segura y rápida) o RSA (mayor compatibilidad con sistemas antiguos). Si usas RSA, configura el tamaño de clave.",
    "step2Title": "Genera el par de claves",
    "step2Desc": "Haz clic en Generar par de claves. Las claves se crean completamente en tu navegador mediante Web Crypto API — tu clave privada nunca sale de tu dispositivo.",
    "step3Title": "Copia tu clave pública",
    "step3Desc": "Copia el contenido de la clave pública. Puedes pegarlo directamente en servidores destino, plataformas Git (GitHub, GitLab, Bitbucket) o proveedores cloud.",
    "step4Title": "Despliégalo en tu servidor",
    "step4Desc": "Usa ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host o añade manualmente la clave pública al archivo ~/.ssh/authorized_keys en el servidor destino.",
    "faqTitle": "Preguntas frecuentes",
    "faq1Q": "Ed25519 vs RSA: ¿Qué tipo de clave SSH debería usar?",
    "faq1A": "Ed25519 es la opción recomendada para la mayoría de casos. Ofrece seguridad de 128 bits (equivalente a RSA 3072), produce claves más cortas y genera firmas mucho más rápido. RSA 4096 solo es necesario para compatibilidad con sistemas antiguos que no soportan Ed25519. GitHub, GitLab y todos los proveedores cloud principales soportan Ed25519.",
    "faq2Q": "¿Necesito una frase de contraseña para mi clave SSH?",
    "faq2A": "No es obligatoria, pero muy recomendada. Una frase de contraseña cifra tu clave privada en disco. Si tu dispositivo se pierde, es robado o comprometido, la clave privada no puede usarse sin la frase de contraseña. Usa una frase de contraseña de 12+ caracteres.",
    "faq3Q": "¿Cómo añado mi clave SSH a GitHub?",
    "faq3A": "Ve a Settings → SSH and GPG keys → New SSH key. Ponle un título descriptivo, pega el contenido completo de tu clave pública (la línea que empieza con ssh-ed25519 o ssh-rsa) y haz clic en Add SSH key. También puedes usar la CLI de GitHub: gh ssh-key add ~/.ssh/id_ed25519.pub.",
    "faq4Q": "¿Es seguro generar claves SSH en el navegador?",
    "faq4A": "Sí. Esta herramienta usa la Web Crypto API, que proporciona las mismas primitivas criptográficas que OpenSSL y OpenSSH. La generación de claves ocurre completamente en la memoria del navegador — no se envían datos a ningún servidor. Las claves generadas se pierden al cerrar o recargar la página, así que descárgalas o cópialas antes de salir."
  }
```

- [ ] **Step 2: Add `descriptions` to pt-BR**

Append to `public/locales/pt-BR/sshkey.json` (add comma after `"localGenerated"` line, then):

```json
  "descriptions": {
    "stepsTitle": "Como gerar e implantar chaves SSH",
    "step1Title": "Escolha o tipo de chave",
    "step1Desc": "Selecione Ed25519 (recomendado — mais segura e rápida) ou RSA (maior compatibilidade com sistemas legados). Ao usar RSA, configure o tamanho da chave.",
    "step2Title": "Gere o par de chaves",
    "step2Desc": "Clique em Gerar par de chaves. As chaves são criadas inteiramente no seu navegador usando a Web Crypto API — sua chave privada nunca sai do seu dispositivo.",
    "step3Title": "Copie sua chave pública",
    "step3Desc": "Copie o conteúdo da chave pública. Ele está pronto para ser colado em servidores destino, plataformas Git (GitHub, GitLab, Bitbucket) ou provedores de nuvem.",
    "step4Title": "Implante no servidor",
    "step4Desc": "Use ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host ou adicione manualmente a chave pública ao arquivo ~/.ssh/authorized_keys na máquina destino.",
    "faqTitle": "Perguntas frequentes",
    "faq1Q": "Ed25519 vs RSA: Qual tipo de chave SSH devo usar?",
    "faq1A": "Ed25519 é recomendado para a maioria dos casos. Oferece segurança de 128 bits (equivalente ao RSA 3072), produz chaves mais curtas e gera assinaturas muito mais rápido. RSA 4096 só é necessário para compatibilidade com sistemas antigos que não suportam Ed25519. GitHub, GitLab e todos os principais provedores de nuvem suportam Ed25519.",
    "faq2Q": "Preciso de uma frase-senha para minha chave SSH?",
    "faq2A": "Não é obrigatório, mas altamente recomendado. Uma frase-senha criptografa sua chave privada no disco. Se o seu dispositivo for perdido, roubado ou comprometido, a chave privada não poderá ser usada sem a frase-senha. Use uma frase-senha forte com 12+ caracteres.",
    "faq3Q": "Como adiciono minha chave SSH ao GitHub?",
    "faq3A": "Vá em Settings → SSH and GPG keys → New SSH key. Dê um título descritivo, cole o conteúdo completo da sua chave pública (a linha inteira começando com ssh-ed25519 ou ssh-rsa) e clique em Add SSH key. Alternativamente, use a CLI do GitHub: gh ssh-key add ~/.ssh/id_ed25519.pub.",
    "faq4Q": "É seguro gerar chaves SSH no navegador?",
    "faq4A": "Sim. Esta ferramenta usa a Web Crypto API, que fornece as mesmas primitivas criptográficas usadas pelo OpenSSL e OpenSSH. A geração de chaves ocorre inteiramente na memória do navegador — nenhum dado é enviado a qualquer servidor. As chaves geradas são perdidas ao fechar ou atualizar a página, portanto baixe ou copie antes de sair."
  }
```

- [ ] **Step 3: Add `descriptions` to fr**

Append to `public/locales/fr/sshkey.json` (add comma after `"localGenerated"` line, then):

```json
  "descriptions": {
    "stepsTitle": "Comment générer et déployer des clés SSH",
    "step1Title": "Choisissez le type de clé",
    "step1Desc": "Sélectionnez Ed25519 (recommandé — plus sûr et plus rapide) ou RSA (meilleure compatibilité avec les systèmes anciens). Si vous utilisez RSA, configurez la taille de clé.",
    "step2Title": "Générez la paire de clés",
    "step2Desc": "Cliquez sur Générer une paire de clés. Les clés sont créées entièrement dans votre navigateur via Web Crypto API — votre clé privée ne quitte jamais votre appareil.",
    "step3Title": "Copiez votre clé publique",
    "step3Desc": "Copiez le contenu de la clé publique. Il est prêt à être collé sur les serveurs cibles, plateformes Git (GitHub, GitLab, Bitbucket) ou fournisseurs cloud.",
    "step4Title": "Déployez sur le serveur",
    "step4Desc": "Utilisez ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host ou ajoutez manuellement la clé publique au fichier ~/.ssh/authorized_keys sur la machine cible.",
    "faqTitle": "Questions fréquentes",
    "faq1Q": "Ed25519 vs RSA : quel type de clé SSH choisir ?",
    "faq1A": "Ed25519 est recommandé dans la plupart des cas. Il offre une sécurité de 128 bits (équivalente à RSA 3072), produit des clés plus courtes et génère des signatures beaucoup plus rapidement. RSA 4096 n'est nécessaire que pour la compatibilité avec les anciens systèmes ne supportant pas Ed25519. GitHub, GitLab et tous les principaux fournisseurs cloud supportent Ed25519.",
    "faq2Q": "Faut-il une phrase de passe pour sa clé SSH ?",
    "faq2A": "Ce n'est pas obligatoire, mais fortement recommandé. Une phrase de passe chiffre votre clé privée sur disque. Si votre appareil est perdu, volé ou compromis, la clé privée ne peut pas être utilisée sans la phrase de passe. Utilisez une phrase de passe robuste de 12 caractères ou plus.",
    "faq3Q": "Comment ajouter ma clé SSH à GitHub ?",
    "faq3A": "Allez dans Settings → SSH and GPG keys → New SSH key. Donnez-lui un titre descriptif, collez le contenu complet de votre clé publique (la ligne entière commençant par ssh-ed25519 ou ssh-rsa) et cliquez sur Add SSH key. Vous pouvez aussi utiliser la CLI GitHub : gh ssh-key add ~/.ssh/id_ed25519.pub.",
    "faq4Q": "Est-il sûr de générer des clés SSH dans le navigateur ?",
    "faq4A": "Oui. Cet outil utilise la Web Crypto API, qui fournit les mêmes primitives cryptographiques qu'OpenSSL et OpenSSH. La génération de clés se fait entièrement dans la mémoire du navigateur — aucune donnée n'est envoyée à un serveur. Les clés générées sont perdues à la fermeture ou au rechargement de la page, donc téléchargez ou copiez-les avant de quitter."
  }
```

- [ ] **Step 4: Add `descriptions` to de**

Append to `public/locales/de/sshkey.json` (add comma after `"localGenerated"` line, then):

```json
  "descriptions": {
    "stepsTitle": "SSH-Schlüssel erstellen und bereitstellen",
    "step1Title": "Schlüsseltyp wählen",
    "step1Desc": "Wählen Sie Ed25519 (empfohlen — sicherer und schneller) oder RSA (bessere Kompatibilität mit älteren Systemen). Bei RSA können Sie die Schlüssellänge festlegen.",
    "step2Title": "Schlüsselpaar generieren",
    "step2Desc": "Klicken Sie auf Schlüsselpaar generieren. Die Schlüssel werden vollständig in Ihrem Browser über die Web Crypto API erstellt — Ihr privater Schlüssel verlässt niemals Ihr Gerät.",
    "step3Title": "Öffentlichen Schlüssel kopieren",
    "step3Desc": "Kopieren Sie den Inhalt des öffentlichen Schlüssels. Er kann direkt auf Zielserver, Git-Plattformen (GitHub, GitLab, Bitbucket) oder Cloud-Anbieter eingefügt werden.",
    "step4Title": "Auf dem Server bereitstellen",
    "step4Desc": "Verwenden Sie ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host oder fügen Sie den öffentlichen Schlüssel manuell zur Datei ~/.ssh/authorized_keys auf dem Zielserver hinzu.",
    "faqTitle": "Häufig gestellte Fragen",
    "faq1Q": "Ed25519 vs RSA: Welchen SSH-Schlüsseltyp sollte ich verwenden?",
    "faq1A": "Ed25519 wird für die meisten Anwendungsfälle empfohlen. Es bietet 128-Bit-Sicherheit (vergleichbar mit RSA 3072), erzeugt kürzere Schlüssel und erstellt Signaturen deutlich schneller. RSA 4096 wird nur für die Kompatibilität mit älteren Systemen benötigt, die Ed25519 nicht unterstützen. GitHub, GitLab und alle großen Cloud-Anbieter unterstützen Ed25519.",
    "faq2Q": "Brauche ich eine Passphrase für meinen SSH-Schlüssel?",
    "faq2A": "Nicht zwingend, aber dringend empfohlen. Eine Passphrase verschlüsselt Ihren privaten Schlüssel auf der Festplatte. Wenn Ihr Gerät verloren geht, gestohlen oder kompromittiert wird, kann der private Schlüssel ohne Passphrase nicht verwendet werden. Verwenden Sie eine starke Passphrase mit 12+ Zeichen.",
    "faq3Q": "Wie füge ich meinen SSH-Schlüssel zu GitHub hinzu?",
    "faq3A": "Gehen Sie zu Settings → SSH and GPG keys → New SSH key. Geben Sie einen beschreibenden Titel ein, fügen Sie den vollständigen Inhalt Ihres öffentlichen Schlüssels ein (die gesamte Zeile beginnend mit ssh-ed25519 oder ssh-rsa) und klicken Sie auf Add SSH key. Alternativ können Sie die GitHub CLI verwenden: gh ssh-key add ~/.ssh/id_ed25519.pub.",
    "faq4Q": "Ist es sicher, SSH-Schlüssel im Browser zu generieren?",
    "faq4A": "Ja. Dieses Tool verwendet die Web Crypto API, die dieselben kryptografischen Primitiven wie OpenSSL und OpenSSH bietet. Die Schlüsselgenerierung erfolgt vollständig im Arbeitsspeicher des Browsers — es werden keine Daten an einen Server gesendet. Generierte Schlüssel gehen beim Schließen oder Neuladen der Seite verloren, also laden Sie sie herunter oder kopieren Sie sie vor dem Verlassen."
  }
```

- [ ] **Step 5: Add `descriptions` to ru**

Append to `public/locales/ru/sshkey.json` (add comma after `"localGenerated"` line, then):

```json
  "descriptions": {
    "stepsTitle": "Как сгенерировать и развернуть SSH-ключи",
    "step1Title": "Выберите тип ключа",
    "step1Desc": "Выберите Ed25519 (рекомендуется — безопаснее и быстрее) или RSA (лучшая совместимость со старыми системами). При использовании RSA настройте размер ключа.",
    "step2Title": "Сгенерируйте пару ключей",
    "step2Desc": "Нажмите «Сгенерировать пару ключей». Ключи создаются полностью в браузере через Web Crypto API — ваш закрытый ключ никогда не покидает устройство.",
    "step3Title": "Скопируйте открытый ключ",
    "step3Desc": "Скопируйте содержимое открытого ключа. Оно готово для вставки на целевые серверы, Git-платформы (GitHub, GitLab, Bitbucket) или облачные сервисы.",
    "step4Title": "Разверните на сервере",
    "step4Desc": "Используйте ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host или вручную добавьте открытый ключ в файл ~/.ssh/authorized_keys на целевой машине.",
    "faqTitle": "Часто задаваемые вопросы",
    "faq1Q": "Ed25519 или RSA: какой тип SSH-ключа выбрать?",
    "faq1A": "Ed25519 рекомендуется для большинства случаев. Он обеспечивает 128-битный уровень безопасности (эквивалент RSA 3072), создаёт более короткие ключи и генерирует подписи значительно быстрее. RSA 4096 нужен только для совместимости со старыми системами, не поддерживающими Ed25519. GitHub, GitLab и все основные облачные провайдеры поддерживают Ed25519.",
    "faq2Q": "Нужна ли парольная фраза для SSH-ключа?",
    "faq2A": "Не обязательна, но настоятельно рекомендуется. Парольная фраза шифрует закрытый ключ на диске. Если устройство потеряно, украдено или скомпрометировано, закрытый ключ нельзя использовать без парольной фразы. Используйте надёжную парольную фразу из 12+ символов.",
    "faq3Q": "Как добавить SSH-ключ в GitHub?",
    "faq3A": "Перейдите в Settings → SSH and GPG keys → New SSH key. Введите описательное название, вставьте полное содержимое открытого ключа (всю строку, начинающуюся с ssh-ed25519 или ssh-rsa) и нажмите Add SSH key. Также можно использовать GitHub CLI: gh ssh-key add ~/.ssh/id_ed25519.pub.",
    "faq4Q": "Безопасно ли генерировать SSH-ключи в браузере?",
    "faq4A": "Да. Этот инструмент использует Web Crypto API, предоставляющий те же криптографические примитивы, что и OpenSSL и OpenSSH. Генерация ключей полностью происходит в памяти браузера — данные не отправляются ни на какой сервер. Сгенерированные ключи теряются при закрытии или обновлении страницы, поэтому загрузите или скопируйте их до ухода."
  }
```

- [ ] **Step 6: Validate all 5 JSON files**

Run:

```bash
node -e "['es','pt-BR','fr','de','ru'].forEach(l => { try { JSON.parse(require('fs').readFileSync('public/locales/'+l+'/sshkey.json','utf8')); console.log(l+': valid') } catch(e) { console.log(l+': INVALID - '+e.message) } })"
```

Expected: all 5 lines show `valid`

- [ ] **Step 7: Commit**

```bash
git add public/locales/es/sshkey.json public/locales/pt-BR/sshkey.json public/locales/fr/sshkey.json public/locales/de/sshkey.json public/locales/ru/sshkey.json
git commit -m "feat(sshkey): add description i18n keys for European locales"
```

---

### Task 4: Add Description component to sshkey-page.tsx

**Files:**

- Modify: `app/[locale]/sshkey/sshkey-page.tsx`

- [ ] **Step 1: Add imports**

In `app/[locale]/sshkey/sshkey-page.tsx`, add two imports. After line 4 (the `lucide-react` import), add `CircleHelp` to the existing import:

```tsx
import { Download, Eye, EyeOff, FolderOpen, RefreshCw, Upload, X, CircleHelp } from "lucide-react";
```

After line 10 (the `StyledTextarea` import), add the Accordion import:

```tsx
import { Accordion } from "../../../components/ui/accordion";
```

- [ ] **Step 2: Add Description component**

Insert the `Description` function component between the `InspectPanel` function (ends around line 375) and the `SshKeyPage` export (starts around line 377):

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

- [ ] **Step 3: Add Description to SshKeyPage render**

In the `SshKeyPage` component's return JSX, add `<Description />` after the closing `</NeonTabs>` tag and before the closing `</div>` of the container. The current structure around lines 392-394 is:

```tsx
          />
        </div>
      </div>
    </Layout>
```

Change to:

```tsx
          />
          <Description />
        </div>
      </div>
    </Layout>
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build completes with no errors. The sshkey page should compile successfully.

- [ ] **Step 5: Run linter**

Run: `npm run lint`
Expected: No new errors or warnings.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/sshkey/sshkey-page.tsx
git commit -m "feat(sshkey): add Description section with step guide and FAQ"
```

---

### Task 5: Visual verification

**Files:** None (verification only)

- [ ] **Step 1: Start dev server and visually verify**

Run: `npm run dev`

Navigate to `/sshkey` and verify:

1. Description section appears below the tabs
2. Step guide shows 4 numbered steps with cyan badges
3. FAQ section shows 4 expandable accordion items with CircleHelp icon
4. All text renders correctly (no missing key errors)
5. Switch locale (e.g., zh-CN) and verify translations appear
6. Dark/light mode both look correct

- [ ] **Step 2: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(sshkey): adjust description section styling"
```

(Only if fixes were needed during verification.)
