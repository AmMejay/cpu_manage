# Guia de Revisão: API RESTful Completa (CRUD) e Banco de Dados (`Nutri_DB`)

Este guia prático e teórico consolida o desenvolvimento completo de uma **API RESTful Backend com CRUD total** (Create, Read, Update, Delete) em **Node.js**, **Express** e **MySQL**, com foco na arquitetura do projeto de gestão nutricional (`Nutri_DB`).

---

## 📌 1. Visão Geral da Arquitetura Backend

* **Processamento e Regras no Server-Side:** O cálculo do **IMC** e a definição do **Status Nutricional** ocorrem **exclusivamente no servidor (backend)**. O front-end envia apenas os dados brutos (`peso` e `altura`), prevenindo adulterações, falhas de segurança e corrupção de dados no banco.
* **Segurança de Credenciais:** As chaves de acesso ao banco são mantidas no arquivo de variáveis de ambiente (`.env`), que permanece ignorado pelo versionamento Git (`.gitignore`).
* **Tratamento de Exceções e Resiliência:** Todas as rotas utilizam blocos `try/catch` para garantir que falhas operacionais retornem mensagens e códigos HTTP adequados sem derrubar o servidor.
* **Prevenção de SQL Injection:** Consultas no banco são executadas utilizando consultas parametrizadas (`?`), garantindo a sanitização dos dados.

---

## 🗄️ 2. Estrutura do Banco de Dados (`Nutri_DB`)

Tabela **`pacientes`**:

| Campo | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Identificador único do paciente |
| `nome` | `VARCHAR(255)` | `NOT NULL` | Nome do paciente |
| `idade` | `INT` | `NOT NULL` | Idade em anos |
| `altura` | `DECIMAL(4,2)` | `NOT NULL` | Altura em metros (ex: `1.75`) |
| `peso` | `DECIMAL(4,2)` | `NOT NULL` | Peso em quilogramas (ex: `70.50`) |
| `imc` | `DECIMAL(4,2)` | `NOT NULL` | IMC calculado no backend |
| `status` | `VARCHAR(100)` | `NOT NULL` | Classificação nutricional calculada |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Data e hora automática do registro |

---

## 🛠️ 3. Instalação e Configuração

```bash
# 1. Inicializar o projeto Node.js
npm init -y

# 2. Instalar dependências de produção
npm install express mysql2 dotenv

# 3. Instalar dependência de desenvolvimento (Nodemon)
npm install -D nodemon
```

### Arquivo `package.json` (Scripts):
```json
"scripts": {
  "dev": "nodemon index.js"
}
```

### Arquivo `.gitignore`:
```text
node_modules/
.env
```

### Arquivo `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=Nutri_DB
```

### Conexão com Banco (`db.js`):
```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
```

---

## 💻 4. Código Completo da API com CRUD (`index.js`)

```javascript
const express = require('express');
const db = require('./db');
const app = express();
const port = 3000;

// Middleware para interpretar requisições em formato JSON
app.use(express.json());

/**
 * Função utilitária para calcular IMC e determinar o Status Nutricional no Server-Side
 */
function calcularIMC(peso, altura) {
  const numPeso = parseFloat(peso);
  const numAltura = parseFloat(altura);

  const imcCalculado = numPeso / (numAltura * numAltura);
  const imc = parseFloat(imcCalculado.toFixed(2));

  let status = "Peso normal";
  if (imc < 18.5) {
    status = "Abaixo do peso";
  } else if (imc >= 18.5 && imc <= 24.9) {
    status = "Peso normal";
  } else if (imc >= 25.0 && imc <= 29.9) {
    status = "Sobrepeso";
  } else {
    status = "Obesidade";
  }

  return { imc, status };
}

// -----------------------------------------------------------------------------
// 1. READ ALL (GET /paciente) - Listar todos os pacientes
// -----------------------------------------------------------------------------
app.get('/paciente', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM pacientes');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ mensagem: "Erro interno do servidor", detalhes: error.message });
  }
});

// -----------------------------------------------------------------------------
// 2. READ FILTERED (GET /paciente/obesidade) - Listar apenas pacientes com obesidade
// -----------------------------------------------------------------------------
app.get('/paciente/obesidade', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM pacientes WHERE status = "Obesidade"');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ mensagem: "Erro interno do servidor", detalhes: error.message });
  }
});

// -----------------------------------------------------------------------------
// 3. READ ONE (GET /paciente/:id) - Buscar paciente específico por ID
// -----------------------------------------------------------------------------
app.get('/paciente/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute('SELECT * FROM pacientes WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Paciente não encontrado" });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ mensagem: "Erro interno do servidor", detalhes: error.message });
  }
});

// -----------------------------------------------------------------------------
// 4. CREATE (POST /paciente) - Cadastrar novo paciente com cálculo automático de IMC
// -----------------------------------------------------------------------------
app.post('/paciente', async (req, res) => {
  const { nome, idade, altura, peso } = req.body;

  // Validação dos dados recebidos
  if (!nome || !idade || !altura || !peso) {
    return res.status(400).json({ mensagem: "Verifique se todos os campos estão preenchidos" });
  }

  // Processamento das regras de negócio no servidor
  const { imc, status } = calcularIMC(peso, altura);

  try {
    const query = `
      INSERT INTO pacientes (nome, idade, altura, peso, imc, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [nome, idade, altura, peso, imc, status]);

    res.status(201).json({
      id: result.insertId,
      nome,
      idade: Number(idade),
      altura: Number(altura),
      peso: Number(peso),
      imc,
      status
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro interno do servidor", detalhes: error.message });
  }
});

// -----------------------------------------------------------------------------
// 5. UPDATE (PUT /paciente/:id) - Atualizar dados do paciente e recalcular IMC
// -----------------------------------------------------------------------------
app.put('/paciente/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, idade, altura, peso } = req.body;

  // Validação dos campos obrigatórios
  if (!nome || !idade || !altura || !peso) {
    return res.status(400).json({ mensagem: "Verifique se todos os campos estão preenchidos" });
  }

  // Recálculo obrigatório do IMC e status com base nos novos valores
  const { imc, status } = calcularIMC(peso, altura);

  try {
    const query = `
      UPDATE pacientes 
      SET nome = ?, idade = ?, altura = ?, peso = ?, imc = ?, status = ? 
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [nome, idade, altura, peso, imc, status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Paciente não encontrado para atualização" });
    }

    res.status(200).json({
      id: Number(id),
      nome,
      idade: Number(idade),
      altura: Number(altura),
      peso: Number(peso),
      imc,
      status
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro interno do servidor", detalhes: error.message });
  }
});

// -----------------------------------------------------------------------------
// 6. DELETE (DELETE /paciente/:id) - Remover paciente do banco
// -----------------------------------------------------------------------------
app.delete('/paciente/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM pacientes WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Paciente não encontrado" });
    }
    res.status(200).json({ mensagem: "Paciente apagado com sucesso" });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro interno do servidor", detalhes: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando com sucesso em http://localhost:${port}`);
});
```

---

## 🧪 5. Guia de Testes do CRUD no Insomnia / Postman

### 1️⃣ **POST /paciente (Criar Paciente)**
* **Método:** `POST`
* **URL:** `http://localhost:3000/paciente`
* **Header:** `Content-Type: application/json`
* **Body (JSON):**
  ```json
  {
    "nome": "Jason Carvalho",
    "idade": 28,
    "altura": 1.75,
    "peso": 82.5
  }
  ```
* **Resposta Esperada (201 Created):**
  ```json
  {
    "id": 1,
    "nome": "Jason Carvalho",
    "idade": 28,
    "altura": 1.75,
    "peso": 82.5,
    "imc": 26.94,
    "status": "Sobrepeso"
  }
  ```

---

### 2️⃣ **GET /paciente (Listar Todos)**
* **Método:** `GET`
* **URL:** `http://localhost:3000/paciente`
* **Resposta Esperada (200 OK):** Array JSON contendo todos os registros de pacientes.

---

### 3️⃣ **GET /paciente/1 (Buscar por ID)**
* **Método:** `GET`
* **URL:** `http://localhost:3000/paciente/1`
* **Resposta Esperada (200 OK):** Objeto JSON do paciente consultado.
* **Se não existir (404 Not Found):** `{"mensagem": "Paciente não encontrado"}`

---

### 4️⃣ **PUT /paciente/1 (Atualizar Paciente)**
* **Método:** `PUT`
* **URL:** `http://localhost:3000/paciente/1`
* **Header:** `Content-Type: application/json`
* **Body (JSON):**
  ```json
  {
    "nome": "Jason Carvalho",
    "idade": 28,
    "altura": 1.75,
    "peso": 72.0
  }
  ```
* **Resposta Esperada (200 OK):** Registro alterado com recálculo automático no backend (`imc: 23.51`, `status: "Peso normal"`).

---

### 5️⃣ **DELETE /paciente/1 (Remover Paciente)**
* **Método:** `DELETE`
* **URL:** `http://localhost:3000/paciente/1`
* **Resposta Esperada (200 OK):**
  ```json
  {
    "mensagem": "Paciente apagado com sucesso"
  }
  ```

---

## 📊 6. Tabela Mapeada de Status HTTP

| Código Status | Categoria | Quando é Utilizado na API |
| :--- | :--- | :--- |
| **200 OK** | Sucesso | Retorno bem-sucedido de consultas (`GET`), atualizações (`PUT`) ou exclusões (`DELETE`). |
| **201 Created** | Sucesso | Criação confirmada de um novo registro no banco via `POST`. |
| **400 Bad Request** | Erro do Cliente | Requisição com dados incompletos ou em formato inválido (ex: ausência do campo `nome`). |
| **404 Not Found** | Erro do Cliente | Registro solicitado não localizado no banco (ex: ID inexistente). |
| **500 Internal Error** | Erro do Servidor | Erros inesperados de banco de dados ou execução capturados pelo bloco `catch`. |

---

## 💡 Pontos-Chave para Revisão e Provas
1. **Por que `imc` e `status` não são enviados pelo cliente?** Para garantir a integridade dos dados e impedir alterações maliciosas no resultado dos cálculos.
2. **Qual a função do `result.insertId`?** Captura o ID gerado automaticamente pelo campo `AUTO_INCREMENT` do MySQL após um `INSERT`.
3. **Qual a função do `result.affectedRows`?** Indica a quantidade de linhas afetadas pela operação (`UPDATE` ou `DELETE`). Se for `0`, significa que o `id` não foi encontrado.
