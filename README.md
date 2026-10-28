Guia de Revisão: API RESTful Completa (CRUD) e Banco de Dados (banco.db)Este guia prático e teórico consolida o desenvolvimento completo de uma API RESTful Backend com CRUD total (Create, Read, Update, Delete) em Node.js, Express e SQLite (better-sqlite3), com foco na arquitetura do projeto de gestão de medições de temperatura.📌 1. Visão Geral da Arquitetura BackendProcessamento e Regras no Server-Side: Os cálculos de conversão de temperatura e a definição do Status ocorrem exclusivamente no servidor (backend) através do módulo classeTemp. O front-end envia apenas os dados brutos (valor_original e unidade_original), prevenindo adulterações e inconsistências.Armazenamento Local com SQLite: O projeto utiliza o better-sqlite3, permitindo consultas síncronas/assíncronas performáticas diretamente em um arquivo local (banco.db).Tratamento de Exceções e Resiliência: Todas as rotas utilizam blocos try/catch para garantir que falhas operacionais retornem mensagens e códigos HTTP adequados sem derrubar a aplicação.Prevenção de SQL Injection: Consultas no banco são executadas utilizando consultas parametrizadas (?), garantindo a segurança e sanitização dos dados informados.🗄️ 2. Estrutura do Banco de Dados (banco.db)Tabela medicoes:CampoTipoRestriçõesDescriçãoidINTEGERPRIMARY KEY, AUTOINCREMENTIdentificador único da mediçãodescricaoTEXTNOT NULLDescrição do local ou equipamentotipoTEXTNOT NULLTipo da mediçãovalor_originalREALNOT NULLValor original informadounidade_originalTEXTNOT NULLUnidade de medida original (ex: C)valor_convertidoREALNOT NULLValor convertido calculado no backendunidade_convertidaTEXTNOT NULLUnidade convertida (ex: F)statusTEXTNOT NULLClassificação calculada automaticamente🛠️ 3. Instalação e ConfiguraçãoBash# 1. Inicializar o projeto Node.js
npm init -y

# 2. Instalar dependências necessárias
npm install express better-sqlite3
Estrutura de Arquivos Recomendada:index.js — Arquivo principal contendo as rotas da API e o servidor Express.classe.js — Módulo responsável pela regra de negócio (cálculo de temperatura e status).db.js — Conexão com o banco de dados SQLite.public/index.html — Página inicial estática documentando as rotas da API.public/style.css — Estilização da página inicial.💻 4. Código Completo da API com CRUDMódulo de Regra de Negócio (classe.js)JavaScript// Função para calcular a conversão de temperatura e status
function classeTemp(valor_original, unidade_original) {
    const valor_convertido = (valor_original * 9 / 5) + 32;
    let unidade_convertida = "";

    if (unidade_original === "C") {
        unidade_convertida = "F";
    }

    let status = "";
    if (valor_original < 80) {
        status = "Temperatura Ideal";
    } else if (valor_original >= 80 && valor_original <= 105) {
        status = "Acima da temperatura ideal";
    } else if (valor_original > 105) {
        status = "Limite crítico";
    } else {
        status = "Erro ao calcular a classificação valor informado invalido.";
    }
    return { valor_convertido, unidade_convertida, status };
}

module.exports = classeTemp;
Conexão com o Banco (db.js)JavaScriptconst Database = require("better-sqlite3");
const db = new Database("banco.db", { verbose: console.log });

module.exports = db;
Servidor Principal (index.js)JavaScriptconst path = require("path");
const express = require("express");
const db = require("./db");
const classeTemp = require("./classe.js");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Rota para a página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------------------------------------------------------------
// 1. CREATE (POST /medicao) - Cadastrar nova medição com cálculo automático
// -----------------------------------------------------------------------------
app.post("/medicao", async (req, res) => {
  const { descricao, tipo, valor_original, unidade_original } = req.body;
  
  if (!descricao || !tipo || !valor_original || !unidade_original) {
    return res.status(400).json({
      mensagem: "Verifique se todos os campos estão preenchidos",
    });
  }

  const { valor_convertido, unidade_convertida, status } = classeTemp(
    Number(valor_original),
    String(unidade_original),
  );

  try {
    const result = db
      .prepare(
        "INSERT INTO medicoes (descricao, tipo, valor_original, unidade_original, valor_convertido, unidade_convertida, status) VALUES (?,?,?,?,?,?,?);"
      )
      .run([
        descricao,
        tipo,
        valor_original,
        unidade_original,
        valor_convertido,
        unidade_convertida,
        status,
      ]);

    res.status(201).json({
      message: "Medição cadastrada com sucesso",
      id: result.lastInsertRowid,
      descricao,
      tipo,
      valor_original,
      unidade_original,
      valor_convertido,
      unidade_convertida,
      status,
    });
  } catch (error) {
    console.error("Erro ao cadastrar medição:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

// -----------------------------------------------------------------------------
// 2. READ ALL (GET /medicao) - Listar todas as medições
// -----------------------------------------------------------------------------
app.get("/medicao", async (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM medicoes").all();
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao buscar medições:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

// -----------------------------------------------------------------------------
// 3. READ FILTERED (GET /medicao/temperatura_ideal) - Filtrar por status específico
// -----------------------------------------------------------------------------
app.get("/medicao/temperatura_ideal", async (req, res) => {
  try {
    const medicoes = db
      .prepare("SELECT * FROM medicoes WHERE status = 'Temperatura Ideal'")
      .all();
      
    if (medicoes.length === 0) {
      return res.status(404).json({
        mensagem: "Nenhuma medição de temperatura ideal encontrada",
      });
    }
    res.status(200).json(medicoes);
  } catch (error) {
    console.error("Erro ao buscar medições de temperatura ideal:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

// -----------------------------------------------------------------------------
// 4. READ ONE (GET /medicao/:id) - Buscar medição específica por ID
// -----------------------------------------------------------------------------
app.get("/medicao/:id", async (req, res) => {
  try {
    const medicao = db
      .prepare("SELECT * FROM medicoes WHERE id = ?")
      .get(req.params.id);
      
    if (medicao === undefined) {
      return res.status(404).json({
        mensagem: "Medição não encontrada",
      });
    }
    res.status(200).json(medicao);
  } catch (error) {
    console.error("Erro ao buscar medição:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

// -----------------------------------------------------------------------------
// 5. UPDATE (PUT /medicao/:id) - Atualizar medição e recalcular conversões
// -----------------------------------------------------------------------------
app.put("/medicao/:id", async (req, res) => {
  const { descricao, tipo, valor_original, unidade_original } = req.body;
  
  if (!descricao || !tipo || !valor_original || !unidade_original) {
    return res.status(400).json({
      mensagem: "Verifique se todos os campos estão preenchidos",
    });
  }

  const { valor_convertido, unidade_convertida, status } = classeTemp(
    Number(valor_original),
    String(unidade_original),
  );

  try {
    const newMedicao = db
      .prepare(
        "UPDATE medicoes SET descricao = ?, tipo = ?, valor_original = ?, unidade_original = ?, valor_convertido = ?, unidade_convertida = ?, status = ? WHERE id = ?;"
      )
      .run([
        descricao,
        tipo,
        valor_original,
        unidade_original,
        valor_convertido,
        unidade_convertida,
        status,
        req.params.id,
      ]);

    if (newMedicao.changes === 0) {
      return res.status(404).json({
        mensagem: "Medição não encontrada",
      });
    }

    res.status(200).json({
      mensagem: "Medição atualizada com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao atualizar medição:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

// -----------------------------------------------------------------------------
// 6. DELETE (DELETE /medicao/:id) - Remover medição do banco
// -----------------------------------------------------------------------------
app.delete("/medicao/:id", async (req, res) => {
  try {
    const medicao = db
      .prepare("DELETE FROM medicoes WHERE id = ?")
      .run(req.params.id);

    if (medicao.changes === 0) {
      return res.status(404).json({
        mensagem: "Medição não encontrada",
      });
    }
    res.status(200).json({ mensagem: "Medição apagada com sucesso" });
  } catch (error) {
    console.error("Erro ao apagar medição:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
🧪 5. Guia de Testes do CRUD no Insomnia / Postman1️⃣ POST /medicao (Criar Medição)Método: POSTURL: http://localhost:3000/medicaoHeader: Content-Type: application/jsonBody (JSON):JSON{
  "descricao": "Sensor Caldeira 01",
  "tipo": "Temperatura",
  "valor_original": 75,
  "unidade_original": "C"
}
Resposta Esperada (201 Created):JSON{
  "message": "Medição cadastrada com sucesso",
  "id": 1,
  "descricao": "Sensor Caldeira 01",
  "tipo": "Temperatura",
  "valor_original": 75,
  "unidade_original": "C",
  "valor_convertido": 167,
  "unidade_convertida": "F",
  "status": "Temperatura Ideal"
}
2️⃣ GET /medicao (Listar Todas)Método: GETURL: http://localhost:3000/medicaoResposta Esperada (200 OK): Array JSON contendo todas as medições cadastradas.3️⃣ GET /medicao/1 (Buscar por ID)Método: GETURL: http://localhost:3000/medicao/1Resposta Esperada (200 OK): Objeto JSON da medição consultada.Se não existir (404 Not Found): {"mensagem": "Medição não encontrada"}4️⃣ PUT /medicao/1 (Atualizar Medição)Método: PUTURL: http://localhost:3000/medicao/1Header: Content-Type: application/jsonBody (JSON):JSON{
  "descricao": "Sensor Caldeira 01 - Atualizado",
  "tipo": "Temperatura",
  "valor_original": 90,
  "unidade_original": "C"
}
Resposta Esperada (200 OK): {"mensagem": "Medição atualizada com sucesso."} com recálculo automático no backend.5️⃣ DELETE /medicao/1 (Remover Medição)Método: DELETEURL: http://localhost:3000/medicao/1Resposta Esperada (200 OK): {"mensagem": "Medição apagada com sucesso"}📊 6. Tabela Mapeada de Status HTTPCódigo StatusCategoriaQuando é Utilizado na API200 OKSucessoRetorno bem-sucedido de consultas (GET), atualizações (PUT) ou exclusões (DELETE).201 CreatedSucessoCriação confirmada de um novo registro no banco via POST.400 Bad RequestErro do ClienteRequisição com dados incompletos ou em formato inválido (ex: ausência de campos obrigatórios).404 Not FoundErro do ClienteRegistro solicitado não localizado no banco (ex: ID inexistente ou lista vazia).500 Internal ErrorErro do ServidorErros inesperados de banco de dados ou execução capturados pelo bloco catch.💡 Pontos-Chave para Revisão e ProvasPor que o cálculo e conversão são feitos no servidor (classeTemp)? Para garantir a integridade dos dados, mantendo a regra de negócio centralizada e protegida contra alterações indevidas no cliente.Qual a função do result.lastInsertRowid? Captura o ID gerado automaticamente pelo SQLite após um comando INSERT.Qual a função da propriedade changes? No better-sqlite3, indica a quantidade de linhas afetadas por operações de UPDATE ou DELETE. Se for 0, sinaliza que o registro correspondente não foi encontrado.🌐 7. Documentação Front-End (public/index.html)A aplicação também conta com uma interface visual estática acessível pela rota raiz (/), que apresenta de forma organizada todas as rotas e métodos HTTP disponíveis na API.HTML<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API de Medições</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <header>
      <h1>API de Medições</h1>
      <p>API REST para cadastro, consulta, atualização e exclusão de medições de temperatura.</p>
    </header>

    <section>
      <h2>Rotas disponíveis</h2>
      <div class="routes">
        <article class="route">
          <span class="method get">GET</span>
          <div class="details">
            <code>/</code>
            <p>Página inicial da API.</p>
          </div>
        </article>
        <article class="route">
          <span class="method post">POST</span>
          <div class="details">
            <code>/medicao</code>
            <p>Cadastra uma nova medição.</p>
          </div>
        </article>
        <article class="route">
          <span class="method get">GET</span>
          <div class="details">
            <code>/medicao</code>
            <p>Lista todas as medições.</p>
          </div>
        </article>
        <article class="route">
          <span class="method get">GET</span>
          <div class="details">
            <code>/medicao/temperatura_ideal</code>
            <p>Lista medições com temperatura ideal.</p>
          </div>
        </article>
        <article class="route">
          <span class="method get">GET</span>
          <div class="details">
            <code>/medicao/:id</code>
            <p>Busca uma medição pelo ID.</p>
          </div>
        </article>
        <article class="route">
          <span class="method put">PUT</span>
          <div class="details">
            <code>/medicao/:id</code>
            <p>Atualiza uma medição existente.</p>
          </div>
        </article>
        <article class="route">
          <span class="method delete">DELETE</span>
          <div class="details">
            <code>/medicao/:id</code>
            <p>Exclui uma medição existente.</p>
          </div>
        </article>
      </div>
    </section>

    <footer>
      API desenvolvida com Node.js, Express e better-sqlite3.
    </footer>
  </main>
</body>
</html>