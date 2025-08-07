# Gestor de Despesas de Energia

Este é um projeto full-stack para gerenciamento de despesas de energia, composto por um **Frontend** em React e um **Backend** em Node.js/Express com MongoDB.

## Arquitetura

A aplicação é dividida em duas partes independentes:

-   **Frontend:** A interface do usuário construída com React (o que está nesta pasta). Ela é responsável por exibir os dados e não tem acesso direto ao banco de dados.
-   **Backend:** Um servidor de API (código em `server.js`) que se conecta de forma segura ao banco de dados MongoDB e fornece os dados para o frontend.

**IMPORTANTE:** O Frontend NUNCA deve se conectar diretamente ao banco de dados. Isso é uma prática de segurança fundamental para proteger suas credenciais e seus dados.

---

## Como Executar o Projeto Localmente

Você precisará executar o Backend e o Frontend simultaneamente em terminais separados.

### Pré-requisitos

-   [Node.js](https://nodejs.org/) (versão 18 ou superior)
-   [npm](https://www.npmjs.com/) (geralmente instalado com o Node.js)
-   Uma conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) com um cluster gratuito.

---

### Passo 1: Configurar e Executar o Backend (Servidor)

1.  **Abra um terminal** na pasta raiz do projeto.

2.  **Instale as dependências do servidor:**
    ```bash
    npm install express mongodb cors dotenv bcryptjs nodemailer
    ```

3.  **Crie o arquivo de ambiente:**
    -   Crie um arquivo chamado `.env` na raiz do projeto.
    -   Copie o conteúdo de `.env.example` para o seu novo arquivo `.env`.

4.  **Configure a Conexão com o Banco de Dados:**
    -   Faça login na sua conta do MongoDB Atlas.
    -   Encontre a sua "connection string".
    -   No seu arquivo `.env`, substitua `<db_password>` pela senha do seu usuário do banco de dados e defina o nome do banco (ex: `energy-manager`) na string.
    -   **Exemplo:** `DATABASE_URL=mongodb+srv://wendel:SENHASECRETA@cluster0.plgnih6.mongodb.net/energy-manager?retryWrites=true&w=majority&appName=Cluster0`

5.  **Configure o Serviço de Email (para "Esqueci a Senha"):**
    -   No seu arquivo `.env`, preencha as variáveis `EMAIL_*`.
    -   **Para o Gmail:** Você precisará criar uma "Senha de App". Vá para a segurança da sua Conta Google, ative a verificação em duas etapas e, em seguida, gere uma Senha de App. Use essa senha de 16 caracteres no campo `EMAIL_PASS`.
    -   **Exemplo para Gmail:**
        ```
        EMAIL_SERVICE=gmail
        EMAIL_USER=seu-email@gmail.com
        EMAIL_PASS=suasenhadegmailaqui
        ```

6.  **Inicie o servidor backend:**
    ```bash
    node server.js
    ```
    Se tudo estiver correto, você verá a mensagem `Backend server running on port 4000` no seu terminal. **Mantenha este terminal aberto.**

---

### Passo 2: Executar o Frontend (Interface do Usuário)

1.  **Abra um SEGUNDO terminal**, mantendo o terminal do backend em execução.
2.  **Use uma extensão de servidor web simples**, como o [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) do VS Code.
3.  **Inicie o frontend:** Clique com o botão direito no arquivo `index.html` e selecione "Open with Live Server".

---

## Como Publicar em um Servidor (Deployment)

Para colocar sua aplicação na internet, você precisa hospedar o backend e o frontend separadamente.

### 1. Hospedando o Backend

1.  **Escolha um serviço de hospedagem:** Plataformas como [Render](https://render.com/) ou [Heroku](https://www.heroku.com/).
2.  **Faça o upload do seu código** (via Git).
3.  **Configure o comando de build:** `node server.js`.
4.  **Configure as Variáveis de Ambiente:** Na plataforma de hospedagem, adicione `DATABASE_URL`, `PORT`, `EMAIL_SERVICE`, `EMAIL_USER`, e `EMAIL_PASS`. **Não envie seu arquivo `.env` para o repositório Git!**
5.  Após o deploy, a plataforma fornecerá uma URL pública para o seu backend.

### 2. Hospedando o Frontend

1.  **Atualize a URL da API:** No arquivo `services/api.ts`, altere `API_BASE_URL` para a URL do seu backend publicado.
2.  **Escolha um serviço de hospedagem estática:** [Netlify](https://www.netlify.com/), [Vercel](https://vercel.com/), etc.
3.  **Faça o upload do seu código.**

Pronto! Sua aplicação está online.

---

## Solução de Problemas (Troubleshooting)

### Erro: "failed to fetch"

Este é um erro de rede comum que geralmente significa que o seu frontend (a interface no navegador) não conseguiu se comunicar com o seu backend (o servidor `server.js`).

Siga estes passos para diagnosticar:

1.  **O Backend está em execução?**
    -   Verifique o terminal onde você executou `node server.js`.
    -   Ele deve exibir `Backend server running on port 4000` e não pode ter nenhuma mensagem de erro vermelha. Se houver erros, corrija-os primeiro (geralmente relacionados à conexão com o banco de dados no arquivo `.env`).
    -   O terminal deve estar registrando as tentativas de acesso, como `[timestamp] POST /api/auth/login`. Se nada aparecer quando você tenta fazer login, a requisição não está chegando ao servidor.

2.  **O Servidor está acessível?**
    -   Com o backend em execução, abra seu navegador e acesse [http://localhost:4000](http://localhost:4000).
    -   Você deve ver a mensagem: `{"message":"Backend server is running!"}`. Se isso não funcionar (a página não carregar), algo está bloqueando a porta 4000 na sua máquina (talvez um firewall ou outro programa).

3.  **Verifique o Console do Navegador:**
    -   Na página de login do seu app, abra as "Ferramentas do Desenvolvedor" (geralmente pressionando F12) e clique na aba "Console".
    -   Tente fazer login novamente.
    -   Procure por uma mensagem de erro mais detalhada. Se for um problema de **CORS**, a mensagem será bem explícita, algo como `Access to fetch at 'http://localhost:4000/api/auth/login' from origin 'http://127.0.0.1:5500' has been blocked by CORS policy...`.

4.  **Verifique a URL da API:**
    -   Confirme que a variável `API_BASE_URL` no arquivo `services/api.ts` está definida como `'http://localhost:4000/api'`.

A atualização que fiz no `server.js` adiciona um logging mais detalhado e uma configuração de CORS mais robusta, o que deve resolver a maioria dos casos.