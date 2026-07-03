# Como Hospedar o PharmaStock na Hostinger (Passo a Passo)

Como migramos toda a camada de banco de dados para o **Firebase Firestore (servidor sem backend - serverless)**, o seu aplicativo se tornou um **aplicativo de página única (SPA)** totalmente estático e seguro. Isso significa que você **NÃO precisa de um servidor Node.js rodando** na Hostinger para manter o banco de dados funcionado!

Você pode hospedá-lo utilizando os planos mais simples de **Hospedagem de Sites Compartilhada da Hostinger** de forma extremamente fácil.

---

## Passo 1: Compilar o Projeto Localmente
Para gerar os arquivos prontos que serão enviados para a Hostinger, você deve gerar a compilação do seu aplicativo.

1. Baixe o código fonte do projeto do Google AI Studio (utilizando o menu de configurações que permite exportar em ZIP).
2. Abra a pasta do projeto no seu terminal local (onde você tem o Node.js instalado).
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Execute o comando de compilação:
   ```bash
   npm run build
   ```
5. Isso gerará uma pasta chamada `dist/` no diretório raiz do seu projeto. É esta pasta que contém os arquivos otimizados prontos para Hostinger!

---

## Passo 2: Hospedar na Hostinger (Via Painel hPanel)
Agora que sua pasta `dist` foi criada, você pode enviar os arquivos diretamente para o seu domínio na Hostinger.

### Método A: Usando o Gerenciador de Arquivos (Recomendado)
1. Acesse o seu painel da **Hostinger (hPanel)**.
2. Vá para **Sites** e selecione o domínio onde deseja hospedar seu sistema.
3. No menu lateral, procure por **Gerenciador de Arquivos** (File Manager) e abra a pasta **`public_html/`** correspondente ao seu domínio.
4. **IMPORTANTE:** Se houver um arquivo padrão chamado `default.php` ou `index.php` na pasta `public_html/`, delete-o ou mude o nome dele para não dar conflito.
5. Abra a pasta `dist/` que foi gerada no seu computador no Passo 1, selecione **todos os arquivos e pastas de dentro dela** (inclusive `index.html`, a pasta `assets/`, etc.) e arraste-os para dentro do diretório `public_html/` da Hostinger.
6. Pronto! Seus arquivos já estão no ar.

### Método B: Usando FTP (FileZilla)
Se preferir usar um cliente FTP tradicional como o FileZilla:
1. Pegue suas credenciais de FTP no hPanel da Hostinger (**Arquivos** > **Contas FTP**).
2. Conecte-se com o FileZilla usando essas informações.
3. Arraste todos os itens de dentro da pasta `dist/` local para a pasta `/public_html` remota.

---

## Passo 3: Configurar URL Amistosas (Fallback do React Router)
Caso o seu aplicativo utilize navegação por rotas do lado do cliente futuramente, e se alguém tentar atualizar a página em alguma rota interna e receber um Erro 404, adicione uma regra simples no arquivo `.htaccess` para forçar o redirecionamento ao `index.html`.

Crie um arquivo chamado **`.htaccess`** dentro de `public_html/` na Hostinger com o seguinte conteúdo:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Segurança Garantida no Firebase
Seu aplicativo comunica-se diretamente com o banco de dados Firestore. Para garantir que nenhuma pessoa não autorizada tente manipular seu banco de dados na Hostinger a partir de chamadas externas de API, configuramos **Firestore Security Rules** que mantêm seus dados seguros!
