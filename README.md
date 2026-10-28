# Guia de Revisão: API RESTful Completa (CRUD) e Banco de Dados (`banco.db`)

Este guia prático e teórico consolida o desenvolvimento completo de uma **API RESTful Backend com CRUD total** (Create, Read, Update, Delete) em **Node.js**, **Express** e **SQLite** (`better-sqlite3`), com foco na arquitetura do projeto de gestão de medições de temperatura.

---

## 📌 1. Visão Geral da Arquitetura Backend

- **Processamento e Regras no Server-Side:** Os cálculos de conversão de temperatura e a definição do **Status** ocorrem **exclusivamente no servidor (backend)** através do módulo `classeTemp`. O front-end envia apenas os dados brutos (`valor_original` e `unidade_original`), prevenindo adulterações e inconsistências.
- **Armazenamento Local com SQLite:** O projeto utiliza o `better-sqlite3`, permitindo consultas síncronas/assíncronas performáticas diretamente em um arquivo local (`banco.db`).
- **Tratamento de Exceções e Resiliência:** Todas as rotas utilizam blocos `try/catch` para garantir que falhas operacionais retornem mensagens e códigos HTTP adequados sem derrubar a aplicação.
- **Prevenção de SQL Injection:** Consultas no banco são executadas utilizando consultas parametrizadas (`?`), garantindo a segurança e sanitização dos dados informados.

---

## 🗄️ 2. Estrutura do Banco de Dados (`banco.db`)

Tabela **`medicoes`**:

| Campo | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Identificador único da medição |
| `descricao` | `TEXT` | `NOT NULL` | Descrição do local ou equipamento |
| `tipo` | `TEXT` | `NOT NULL` | Tipo da medição |
| `valor_original` | `REAL` | `NOT NULL` | Valor original informado |
| `unidade_original` | `TEXT` | `NOT NULL` | Unidade de medida original (ex: `C`) |
| `valor_convertido` | `REAL` | `NOT NULL` | Valor convertido calculado no backend |
| `unidade_convertida` | `TEXT` | `NOT NULL` | Unidade convertida (ex: `F`) |
| `status` | `TEXT` | `NOT NULL` | Classificação calculada automaticamente |

---

## 🛠️ 3. Instalação e Configuração

```bash
# 1. Inicializar o projeto Node.js
npm init -y

# 2. Instalar dependências necessárias
npm install express better-sqlite3