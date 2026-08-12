# ⚽ Pelada Fácil — MVP

App simples para o dono de uma pelada organizar presença, mensalistas, diaristas e pagamentos, e compartilhar um link público no WhatsApp.

**Stack:** React (Vite) + Tailwind · Supabase (banco + login) · Vercel (hospedagem) · GitHub (código).
Sem Docker, sem servidor próprio, sem backend separado — tudo gerenciado.

---

## 1. Crie o projeto no Supabase (5 min)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta grátis.
2. Clique em **New project**. Escolha um nome (ex: `pelada-facil`) e uma senha de banco (guarde-a).
3. Aguarde o projeto ficar pronto (~2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o conteúdo, cole no editor e clique em **Run**.
   - Isso cria as 3 tabelas (`profiles`, `peladas`, `participantes`) e as regras de segurança (RLS).
6. Vá em **Project Settings → API**. Você vai precisar de dois valores:
   - **Project URL**
   - **anon public key**

> 💡 Opcional: em **Authentication → Providers → Email**, você pode desligar "Confirm email" se quiser que o dono da pelada consiga entrar direto após se cadastrar, sem precisar clicar em um link de confirmação por e-mail. Para um produto real, o ideal é manter ligado.

---

## 2. Configure o projeto na sua máquina

1. Instale o [Node.js](https://nodejs.org) (versão 18 ou mais recente), se ainda não tiver.
2. Abra a pasta do projeto no terminal e rode:

   ```bash
   npm install
   ```

3. Copie o arquivo de exemplo de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

4. Abra o arquivo `.env` e cole os valores que você pegou no passo 1:

   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```

5. Rode o projeto localmente para testar:

   ```bash
   npm run dev
   ```

   Acesse `http://localhost:5173` no navegador. Crie uma conta, crie uma pelada e teste o link público em outra aba (ou no celular).

---

## 3. Coloque o código no GitHub

1. Crie um repositório novo em [github.com/new](https://github.com/new) (pode ser privado).
2. No terminal, dentro da pasta do projeto:

   ```bash
   git init
   git add .
   git commit -m "Primeira versão do Pelada Fácil"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

   (O arquivo `.env` **não** vai subir — ele já está no `.gitignore` para proteger suas chaves.)

---

## 4. Publique na Vercel (deploy)

1. Acesse [vercel.com](https://vercel.com) e entre com sua conta do GitHub.
2. Clique em **Add New → Project** e escolha o repositório que você acabou de criar.
3. Na tela de configuração, abra **Environment Variables** e adicione as mesmas duas variáveis do `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**. Em cerca de 1 minuto seu site estará no ar em um endereço tipo `pelada-facil.vercel.app`.
5. (Opcional) Em **Settings → Domains**, você pode ligar um domínio próprio, como `peladafacil.com`.

A partir daqui, toda vez que você der `git push`, a Vercel atualiza o site sozinha — não precisa fazer mais nada manualmente.

---

## Como o app funciona

- **Dono da pelada**: cria conta em `/cadastro`, entra em `/entrar`, e gerencia tudo em `/painel`.
- **Jogador**: recebe um link tipo `seusite.vercel.app/pelada-do-sabado-a1b2` pelo WhatsApp, confirma presença sem precisar de conta.
- Todo o controle de pagamento é **manual** — o dono marca "Pago"/"Pendente" clicando na lista. Não há integração com Pix ou gateway de pagamento neste MVP (de propósito, para manter simples).

## Estrutura do banco (resumo)

- `profiles` — nome/e-mail do dono, ligado ao login do Supabase.
- `peladas` — uma linha por pelada criada (nome, local, data, valores, link/slug).
- `participantes` — uma linha por jogador que confirmou/recusou presença em uma pelada.

## Custo aproximado para operar

- **Supabase**: plano gratuito cobre bem o início (bancos pequenos, poucos usuários). Quando crescer, o plano pago começa em torno de US$ 25/mês.
- **Vercel**: plano gratuito é suficiente para esse tipo de site.
- **Domínio próprio** (opcional): ~R$ 40–60/ano.

Ou seja: dá para começar a vender por R$ 10/mês por pelada com custo operacional próximo de zero.

## Próximos passos (fora do MVP, só se fizer sentido depois)

Estas ideias **não** foram implementadas de propósito, para manter o produto simples. Considere-as só se os primeiros donos de pelada pedirem:

- Cobrança automática (assinatura recorrente via Pix/cartão).
- Edição dos dados da pelada depois de criada (hoje só criação).
- Notificações automáticas (WhatsApp/e-mail) lembrando da pelada.
- Histórico de várias rodadas por pelada (hoje é uma pelada = um evento).

Antes de adicionar qualquer uma delas, vale perguntar: "isso é realmente necessário agora?"
