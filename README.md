# Gestor de Despesas de Energia

Este é um projeto full-stack para gerenciamento de despesas de energia, agora com uma arquitetura profissional que separa o **Frontend** (React/Vite) e o **Backend** (Node.js/Express) em pastas independentes usando workspaces.

## Arquitetura

A aplicação é dividida em duas partes que rodam de forma independente:

-   `frontend/`: A interface do usuário construída com React e gerenciada pelo Vite. É responsável por exibir os dados e se comunica com o backend através de uma API.
-   `backend/`: Um servidor de API (código em `server.js`) que se conecta de forma segura ao banco de dados MongoDB e fornece os dados para o frontend.

**IMPORTANTE:** O Frontend NUNCA se conecta diretamente ao banco de dados. Essa separação é uma prática de segurança fundamental para proteger suas credenciais e seus dados.

---

## Limpando Arquivos da Estrutura Antiga

Se você está migrando da versão antiga deste projeto (onde o frontend e o backend não estavam em pastas separadas), você pode apagar com segurança os seguintes arquivos e pastas da **raiz do seu projeto** para evitar conflitos e manter tudo organizado.

**Arquivos para Apagar (da raiz):**

*   `index.html` (o novo está em `frontend/index.html`)
*   `vite.config.ts` (o novo está em `frontend/vite.config.ts`)
*   `tailwind.config.js` (o novo está em `frontend/tailwind.config.js`)
*   `postcss.config.js` (o novo está em `frontend/postcss.config.js`)
*   `tsconfig.json` e `tsconfig.node.json` (os novos estão em `frontend/`)
*   `package-lock.json` (cada workspace, `frontend` e `backend`, terá o seu próprio)
*   `index.tsx` (o arquivo de entrada agora é `frontend/src/index.tsx`)

**Pastas para Apagar (da raiz):**

*   `src/` (todo o código-fonte foi movido para `frontend/src/`)
*   `public/` (se existir, seu conteúdo deve ser movido para `frontend/public/`)
*   `node_modules/` (a instalação agora é feita para cada workspace)

**IMPORTANTE:** **NÃO apague** o arquivo `package.json` da raiz. Ele agora serve para gerenciar os workspaces do frontend e do backend e é essencial para os comandos `npm run dev` e `npm run install:all`.

---

## Como Executar o Projeto Localmente

Siga os passos abaixo para rodar a aplicação completa na sua máquina.

### Pré-requisitos

-   [Node.js](https://nodejs.org/) (versão 18 ou superior)
-   [npm](https://www.npmjs.com/) (versão 7 ou superior, para suporte a workspaces)
-   Uma conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) com um cluster gratuito.
-   Uma conta no [EmailJS](https://www.emailjs.com/) para envio de e-mails.
-   (Opcional) Uma conta no [Imgur](https://imgur.com/upload) para hospedar o logo da sua aplicação.

---

### Passo 1: Configurar os Ambientes

#### 1.1 - Backend

1.  **Abra um terminal** na pasta raiz do projeto.
2.  **Crie o arquivo de ambiente do backend:**
    -   Dentro da pasta `backend`, crie um arquivo chamado `.env`.
3.  **Configure as Variáveis de Ambiente:**
    -   Copie e cole o conteúdo abaixo no seu novo arquivo `backend/.env` e preencha com suas credenciais.
    ```
    # MongoDB Connection
    DATABASE_URL=mongodb+srv://<user>:<password>@<cluster-url>/<db-name>?retryWrites=true&w=majority

    # Security: CORS Origin (obrigatório para produção)
    # Para desenvolvimento local, use a URL do seu frontend (ex: http://localhost:5173).
    # Para produção, use a URL pública do seu frontend (ex: https://seu-app.netlify.app).
    CORS_ORIGIN=http://localhost:5173

    # EmailJS Credentials
    EMAILJS_SERVICE_ID=seu_service_id
    EMAILJS_PUBLIC_KEY=sua_public_key
    EMAILJS_PRIVATE_KEY=sua_private_key
    EMAILJS_FORGOT_PASSWORD_TEMPLATE_ID=seu_template_id_de_senha
    EMAILJS_REPORT_TEMPLATE_ID=seu_template_id_de_relatorio

    # Opcional: URL do Logo da Aplicação
    # Hospede seu logo (ex: no Imgur) e cole o link direto aqui.
    # Se não for fornecido, um logo SVG padrão será usado.
    APP_LOGO_URL=https://i.imgur.com/rM45A5u.png
    ```
4.  **Configure o Serviço de Email (EmailJS):**
    -   Acesse sua [conta no EmailJS](https://dashboard.emailjs.com/).
    -   **Email Services:** Adicione um serviço de e-mail (ex: Gmail). Anote o **Service ID**.
    -   <span style="color: #FBBF24; background-color: #372800; padding: 2px 6px; border-radius: 4px;">**PASSO CRÍTICO: Ativar Chamadas de API**</span>
        -   Depois de adicionar seu serviço de e-mail (Gmail, etc.), **clique para editá-lo**.
        -   **Ative a opção "API Calls"**. Por padrão, ela vem desativada e é **obrigatória** para que o backend possa enviar e-mails a partir do servidor. Se este passo for esquecido, você receberá um erro `403 Forbidden` no terminal do backend.
    -   **Email Templates:** Crie **dois** templates:
        -   **Template de "Esqueci a Senha"**:
            -   Crie um novo template. Anote o **Template ID**.
            -   Na aba **"Settings"**: no campo "To Email", digite exatamente `{{to_email}}`. Isso permite que o backend informe ao EmailJS para quem o e-mail deve ser enviado.
            -   **Assunto**: `Redefinição de Senha - Gestor de Energia`
            -   **Conteúdo**: Copie e cole **todo** o bloco de código HTML abaixo. Ele já está formatado com a identidade visual do app e com a variável `{{logo_url}}` para receber o logo dinamicamente.
                ```html
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Redefinição de Senha</title>
                </head>
                <body style="margin: 0; padding: 0; width: 100%; background-color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td align="center" style="padding: 20px 0;">
                                <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                                    <!-- Header com Logo -->
                                    <tr>
                                        <td align="center" style="background-color: #1f2937; padding: 20px 0; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                                            <img src="{{logo_url}}" alt="Logo Gestor de Energia" style="height: 48px; width: auto; border: 0;" />
                                        </td>
                                    </tr>
                                    <!-- Corpo do E-mail -->
                                    <tr>
                                        <td style="background-color: #2d3748; padding: 32px; color: #e2e8f0;">
                                            <h1 style="font-size: 24px; font-weight: bold; color: #ffffff; margin-top: 0; margin-bottom: 24px;">Redefinição de Senha</h1>
                                            <p style="font-size: 16px; line-height: 1.5; margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
                                            <p style="font-size: 16px; line-height: 1.5; margin: 0 0 24px;">Sua nova senha temporária de acesso ao Gestor de Energia é:</p>
                
                                            <!-- Box da Senha Temporária -->
                                            <div style="background-color: #1f2937; border: 1px dashed #4a5568; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                                                <p style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #a5b4fc; margin: 0; font-family: 'Courier New', Courier, monospace;">
                                                    {{temp_password}}
                                                </p>
                                            </div>
                
                                            <p style="font-size: 16px; line-height: 1.5; margin: 0 0 16px;">Recomendamos fortemente que você altere esta senha para uma de sua preferência imediatamente após fazer o login.</p>
                                            <p style="font-size: 16px; line-height: 1.5; margin: 0;">Atenciosamente,<br>Equipe Gestor de Energia</p>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td align="center" style="padding: 24px; font-size: 12px; color: #718096;">
                                            <p style="margin: 0;">Este e-mail foi enviado para {{to_email}}.</p>
                                            <p style="margin: 5px 0 0;">Se você não solicitou a redefinição de senha, por favor ignore esta mensagem.</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                ```
        -   **Template de "Relatório Mensal"**:
            -   Crie um novo template. Anote o **Template ID**.
            -   Na aba **"Settings"**: no campo "To Email", digite exatamente `{{to_email}}`.
            -   **Assunto**: `{{subject}}`
            -   **Conteúdo**: Use a variável `{{{html_body}}}` com **três chaves** para renderizar o HTML do relatório que vem do backend corretamente.
                ```html
                {{{html_body}}}
                ```

#### 1.2 - Frontend

1.  **Descubra o IP do seu computador** na sua rede (no Windows, use `ipconfig`; no Mac/Linux, `ifconfig` ou `ip addr`). Será algo como `192.168.1.10`. Este passo é apenas se você quiser acessar a aplicação de outro dispositivo na mesma rede (como um celular).
2.  **Crie o arquivo de ambiente do frontend:**
    -   Dentro da pasta `frontend`, crie um arquivo chamado `.env`.
3.  **Configure as Variáveis de Ambiente:**
    -   No seu novo arquivo `frontend/.env`, adicione as seguintes linhas, substituindo o IP de exemplo pelo IP real do seu computador, se necessário.
    ```
    # URL da sua API backend. Use o IP para testes em rede local.
    VITE_API_BASE_URL=http://192.168.1.10:4000/api
    
    # Opcional: URL do Logo da Aplicação. Use a mesma URL do backend.
    VITE_APP_LOGO_URL=https://i.imgur.com/rM45A5u.png
    ```
    -   **Observação:** Se você não criar este arquivo, a aplicação usará `http://localhost:4000/api` como padrão para a API, funcionando apenas no navegador do próprio computador.

---

### Passo 2: Instalar Dependências e Rodar

1.  **Instale TODAS as dependências (raiz, frontend e backend) de uma só vez:**
    -   No terminal, na pasta **raiz** do projeto, rode o comando:
    ```bash
    npm run install:all
    ```

2.  **Inicie os servidores de backend e frontend simultaneamente:**
    -   Ainda no terminal da raiz, rode o comando:
    ```bash
    npm run dev
    ```
3.  O terminal mostrará logs de ambos os servidores. Abra a URL do frontend (geralmente `http://localhost:5173`, mas verifique o output do terminal) no seu navegador para usar a aplicação. Se configurou o IP no Passo 1.2, você também pode acessar `http://SEU_IP_AQUI:5173` no seu celular.

---

## Como Publicar (Deployment) - Vercel & Netlify

Com a nova estrutura, você fará o deploy de duas aplicações separadas. O projeto já está pré-configurado para um deploy fácil na Vercel (backend) e Netlify (frontend).

### 1. Publicando o Backend na Vercel

A Vercel é ideal para hospedar nosso backend Node.js como uma função "serverless".

1.  **Crie uma conta** na [Vercel](https://vercel.com/) e conecte seu repositório do GitHub/GitLab/Bitbucket.
2.  **Importe o Projeto:**
    -   Na Vercel, clique em "Add New..." -> "Project".
    -   Selecione seu repositório. A Vercel deve detectar que é um monorepo.
    -   Ela deve reconhecer a pasta `backend/`. O arquivo `vercel.json` na raiz do projeto já informa à Vercel como construir e rotear as requisições para a API.
3.  **Configure as Variáveis de Ambiente:**
    -   Vá para as configurações do seu projeto na Vercel ("Settings" -> "Environment Variables").
    -   Adicione as mesmas variáveis que você tem no seu arquivo `backend/.env`:
        -   `DATABASE_URL`
        -   `CORS_ORIGIN` (A URL pública do seu frontend na Netlify, ex: `https://seu-app-frontend.netlify.app`)
        -   `EMAILJS_SERVICE_ID`
        -   `EMAILJS_PUBLIC_KEY`
        -   `EMAILJS_PRIVATE_KEY`
        -   `EMAILJS_FORGOT_PASSWORD_TEMPLATE_ID`
        -   `EMAILJS_REPORT_TEMPLATE_ID`
        -   `APP_LOGO_URL` (a URL pública do seu logo)
4.  **Faça o Deploy:** Clique em "Deploy". Após alguns instantes, a Vercel fornecerá uma URL pública para a sua API (ex: `https://seu-projeto.vercel.app`). Guarde esta URL.

### 2. Publicando o Frontend na Netlify

A Netlify é perfeita para hospedar nosso frontend React (arquivos estáticos).

1.  **Crie uma conta** na [Netlify](https://www.netlify.com/) e conecte seu repositório.
2.  **Importe o Projeto:**
    -   Na Netlify, clique em "Add new site" -> "Import an existing project".
    -   Selecione seu repositório.
3.  **Configure as Opções de Build:**
    -   O arquivo `netlify.toml` na raiz do projeto já configura isso automaticamente. A Netlify deve detectar e usar as seguintes configurações:
        -   **Base directory:** `frontend`
        -   **Build command:** `npm run build`
        -   **Publish directory:** `frontend/dist`
4.  **Configure as Variáveis de Ambiente:**
    -   Antes de fazer o deploy, vá para "Site configuration" -> "Build & deploy" -> "Environment".
    -   Adicione **duas** variáveis de ambiente:
        -   **Key:** `VITE_API_BASE_URL` | **Value:** A URL da sua API na Vercel (que você guardou no passo anterior), incluindo `/api`. Ex: `https://seu-projeto.vercel.app/api`
        -   **Key:** `VITE_APP_LOGO_URL` | **Value:** A URL pública do seu logo.
5.  **Faça o Deploy:** Clique em "Deploy site". A Netlify irá construir o frontend e publicá-lo em uma URL pública (ex: `https://seu-app-frontend.netlify.app`).

Pronto! Sua aplicação full-stack está no ar. A partir de agora, cada `push` para a sua branch principal (ex: `main`) irá automaticamente disparar novos deploys tanto na Vercel quanto na Netlify.