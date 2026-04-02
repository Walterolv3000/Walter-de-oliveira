# PDF Master AI - Versão Portátil

Este projeto está configurado para gerar executáveis autônomos (portáteis) que não requerem instalação.

## Como gerar o executável no seu computador:

1.  **Exporte o código**: Vá no menu de configurações (ícone de engrenagem) e selecione "Export to ZIP" ou "Export to GitHub".
2.  **Instale o Node.js**: Certifique-se de ter o Node.js instalado (versão 18 ou superior).
3.  **Instale as dependências**: No terminal, dentro da pasta do projeto, execute:
    ```bash
    npm install
    ```
4.  **Gere o executável**: Execute o seguinte comando:
    ```bash
    npm run build:exe
    ```
5.  **Localize o arquivo**: O executável será gerado na pasta `bin/`.
    -   Windows: `bin/react-example.exe`
    -   Linux: `bin/react-example`
    -   macOS: `bin/react-example-macos`

## Vantagens da Versão Portátil:
-   **Sem Instalação**: Basta copiar o arquivo para um pendrive ou qualquer pasta e executar.
-   **Uso Offline**: Funciona localmente (embora a análise de IA ainda requeira conexão com a internet para acessar a API do Gemini).
-   **Persistência Local**: Os dados são salvos em um arquivo `db.json` e os documentos na pasta `uploads/`, ambos criados na mesma pasta do executável.
